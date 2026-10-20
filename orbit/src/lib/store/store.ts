"use client";

/**
 * Prototype persistence: a small external store saved to localStorage.
 * Stage 2 replaces this with Supabase-backed services behind the same actions.
 */
import { useSyncExternalStore } from "react";
import { daysBetween, toDateOnly } from "../domain/dates";
import type {
  ConnectorId,
  DateOnly,
  DropOffKind,
  GiftTransfer,
  NotificationPrefs,
  Order,
  Refund,
  RefundMethod,
  ReturnRequest,
  ReturnStatus,
  WalletItem,
} from "../domain/types";
import { DEMO_PROFILE, buildDemoData } from "../demo/seed";
import { blankOrder, customRetailer, evidenceFromMessage, findDuplicate, isDuplicateMessage, mergeExtraction } from "../ingestion/dedupe";
import { money, orderTotal } from "../domain/format";
import { returnFacts } from "../intelligence/returns";
import { parseMessage } from "../ingestion/parse";
import { sampleMessages } from "../ingestion/samples";
import type { Extraction, RawMessage } from "../ingestion/types";
import { shiftSeedDates } from "./shift";
import { EMPTY_PREVIEW, emptied, type OrbitData, type PersistedState, type PreviewFlags } from "./state";

const KEY = "orbit:v1";
const listeners = new Set<() => void>();
let state: PersistedState | null = null;

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();
export const today = (): DateOnly => toDateOnly(new Date());

function fresh(): PersistedState {
  return { version: 1, anchor: today(), data: buildDemoData(today()), preview: EMPTY_PREVIEW };
}

function load(): PersistedState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.version === 1) {
        const shift = daysBetween(parsed.anchor, today());
        return { ...parsed, anchor: today(), data: shiftSeedDates(parsed.data, shift), preview: parsed.preview ?? EMPTY_PREVIEW };
      }
    }
  } catch {
    // Storage unavailable or corrupt: fall back to fresh demo data.
  }
  return fresh();
}

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private mode or quota: the session still works in memory.
  }
}

function get(): PersistedState {
  if (!state) state = load();
  return state;
}

function set(fn: (s: PersistedState) => PersistedState) {
  state = fn(get());
  save();
  listeners.forEach((l) => l());
}

/** Current state outside React (services, tests). */
export const getState = (): PersistedState => get();

const setData = (fn: (d: OrbitData) => OrbitData) => set((s) => ({ ...s, data: fn(s.data) }));

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const serverSnapshot = () => null;

/** Returns null until the client has loaded persisted state (render a loading state). */
export function useOrbitState(): PersistedState | null {
  return useSyncExternalStore(subscribe, get, serverSnapshot);
}

/** The data views should render: honors the "empty account" preview switch. */
export function useOrbit(): { data: OrbitData; preview: PreviewFlags; today: DateOnly; profile: typeof DEMO_PROFILE } | null {
  const s = useOrbitState();
  if (!s) return null;
  return { data: s.preview.emptyAccount ? emptied(s.data) : s.data, preview: s.preview, today: s.anchor, profile: DEMO_PROFILE };
}

function patchReturn(id: string, status: ReturnStatus | null, note: string, patch: Partial<ReturnRequest> = {}) {
  setData((d) => ({
    ...d,
    returns: d.returns.map((r) =>
      r.id === id
        ? { ...r, ...patch, ...(status ? { status } : {}), history: [...r.history, { at: now(), status: status ?? r.status, note }] }
        : r,
    ),
  }));
}

/**
 * Return Workflow + Refund Service: retailer emails are the evidence that moves a
 * return forward. Only retailer messages can mark a return confirmed or a refund received.
 */
function linkReturnEvidence(d: OrbitData, orderId: string, x: Extraction, evidenceId: string): OrbitData {
  const at = now();
  if (x.kind === "return_confirmation" || x.kind === "return_label") {
    return {
      ...d,
      returns: d.returns.map((r) => {
        if (r.orderId !== orderId || !(r.status === "prepared" || r.status === "reported_submitted" || r.status === "approval_pending")) return r;
        const label = x.kind === "return_label";
        return {
          ...r,
          status: label ? "label_ready" : r.status === "prepared" ? "reported_submitted" : r.status,
          submission: { by: r.submission.by ?? "customer_on_retailer_site", at: r.submission.at ?? at, confirmedByRetailer: true, confirmationEvidenceId: evidenceId },
          artifacts: label ? [...r.artifacts, { id: uid("a"), kind: "label_pdf", carrier: x.tracking?.value.carrier ?? null, code: x.orderNumber?.value ?? "", evidenceId, expiresAt: null }] : r.artifacts,
          history: [...r.history, { at, status: label ? "label_ready" : r.status, note: label ? "The retailer sent your return label." : "The retailer confirmed your return." }],
        };
      }),
    };
  }
  if (x.kind === "refund_confirmation" && x.refundAmount) {
    const refund = d.refunds.find((f) => f.orderId === orderId && !f.confirmed);
    if (!refund) return d;
    const amount = x.refundAmount.value;
    return {
      ...d,
      refunds: d.refunds.map((f) =>
        f.id === refund.id
          ? { ...f, confirmed: { amount, at: today(), by: "retailer_email", evidenceId }, milestones: [...f.milestones, { at, label: "Refund issued by the retailer", evidenceId }] }
          : f,
      ),
      returns: d.returns.map((r) =>
        r.id === refund.returnId ? { ...r, status: "completed", history: [...r.history, { at, status: "completed", note: "Refund confirmed by the retailer's email." }] } : r,
      ),
    };
  }
  return d;
}

export interface ImportResult {
  status: "added" | "merged" | "duplicate_message" | "unrecognized";
  orderId: string | null;
  extraction: Extraction | null;
}

export const actions = {
  // ── Returns ──────────────────────────────────────────────────────────
  getReturn(id: string): ReturnRequest | undefined {
    return get().data.returns.find((r) => r.id === id);
  },

  prepareReturn(input: { orderId: string; itemIds: string[]; reason: string | null; refundPreference: RefundMethod | null; dropOff: DropOffKind | null }): string {
    const d = get().data;
    const order = d.orders.find((o) => o.id === input.orderId)!;
    const retailer = d.retailers.find((r) => r.id === order.retailerId)!;
    const existing = d.returns.find((r) => r.orderId === input.orderId && r.status === "prepared");
    if (existing) {
      patchReturn(existing.id, "prepared", "Details updated.", input);
      return existing.id;
    }
    const id = uid("r");
    const req: ReturnRequest = {
      id,
      ...input,
      capability: retailer.returnCapability,
      status: "prepared",
      shipBy: null,
      createdAt: now(),
      submission: { by: null, at: null, confirmedByRetailer: false, confirmationEvidenceId: null },
      artifacts: [],
      rmaNumber: null,
      history: [{ at: now(), status: "prepared", note: "Orbit prepared your return. Nothing has been sent yet." }],
    };
    setData((x) => ({ ...x, returns: [...x.returns, req] }));
    return id;
  },

  /** The customer says they finished on the retailer's site. Still unconfirmed by the retailer. */
  reportSubmitted(returnId: string) {
    patchReturn(returnId, "reported_submitted", "You said you submitted this on the retailer's site.", {
      submission: { by: "customer_on_retailer_site", at: now(), confirmedByRetailer: false, confirmationEvidenceId: null },
    });
    // Refund Service: start tracking the expected refund (never a confirmed one).
    setData((d) => {
      const r = d.returns.find((x) => x.id === returnId);
      const order = r && d.orders.find((o) => o.id === r.orderId);
      if (!r || !order || d.refunds.some((f) => f.returnId === returnId)) return d;
      const retailer = d.retailers.find((x) => x.id === order.retailerId);
      const policy = d.policies.find((p) => p.retailerId === order.retailerId) ?? null;
      const fee = returnFacts(policy, { dropOff: r.dropOff, refund: r.refundPreference }).fee;
      const total = orderTotal(order, r.itemIds);
      const refund: Refund = {
        id: uid("f"),
        orderId: order.id,
        returnId,
        currency: "USD",
        destination: r.refundPreference === "store_credit" ? "store_credit" : r.refundPreference === "original_payment" ? "original_payment" : "unknown",
        destinationLabel: r.refundPreference === "store_credit" ? `${retailer?.name ?? "Store"} credit` : "Original payment method",
        expected: {
          amount: total != null && fee != null ? Math.max(0, total - fee) : null,
          by: null,
          basis: `Expected after ${retailer?.name ?? "the retailer"} receives your return${fee ? `, minus a ${money(fee)} fee` : ""}.`,
        },
        confirmed: null,
        milestones: [],
      };
      return { ...d, refunds: [...d.refunds, refund] };
    });
  },

  markShipped(returnId: string) {
    patchReturn(returnId, "shipped", "You dropped off the package.");
    setData((d) => ({
      ...d,
      refunds: d.refunds.map((f) => (f.returnId === returnId ? { ...f, milestones: [...f.milestones, { at: now(), label: "Dropped off by you", evidenceId: null }] } : f)),
    }));
  },

  cancelReturn(returnId: string) {
    patchReturn(returnId, "cancelled", "Return cancelled.");
  },

  keepItems(orderId: string, itemIds: string[]) {
    setData((d) => ({
      ...d,
      orders: d.orders.map((o) => (o.id === orderId ? { ...o, keptItemIds: Array.from(new Set([...o.keptItemIds, ...itemIds])) } : o)),
    }));
  },

  undoKeep(orderId: string) {
    setData((d) => ({ ...d, orders: d.orders.map((o) => (o.id === orderId ? { ...o, keptItemIds: [] } : o)) }));
  },

  // ── Refunds ──────────────────────────────────────────────────────────
  confirmRefundByCustomer(refundId: string, amount: number) {
    setData((d) => {
      const refund = d.refunds.find((f) => f.id === refundId);
      return {
        ...d,
        refunds: d.refunds.map((f) =>
          f.id === refundId
            ? { ...f, confirmed: { amount, at: today(), by: "customer", evidenceId: null }, milestones: [...f.milestones, { at: now(), label: "You confirmed the refund arrived", evidenceId: null }] }
            : f,
        ),
        returns: d.returns.map((r) =>
          refund && r.id === refund.returnId
            ? { ...r, status: "completed", history: [...r.history, { at: now(), status: "completed", note: "Refund confirmed by you." }] }
            : r,
        ),
      };
    });
  },

  // ── Orders & ingestion ───────────────────────────────────────────────
  importMessage(msg: RawMessage): ImportResult {
    const d = get().data;
    if (isDuplicateMessage(d.evidence, msg)) return { status: "duplicate_message", orderId: null, extraction: null };

    const x = parseMessage(msg, d.retailers);
    if (x.kind === "unknown" && !x.orderNumber && x.items.length === 0) return { status: "unrecognized", orderId: null, extraction: x };

    let retailers = d.retailers;
    let retailerId = x.retailer?.value.id ?? null;
    if (!retailerId) {
      const name = x.retailer?.value.name ?? "Unknown retailer";
      const match = retailers.find((r) => r.name.toLowerCase() === name.toLowerCase());
      if (match) retailerId = match.id;
      else {
        retailerId = uid("ret");
        retailers = [...retailers, customRetailer(retailerId, name)];
      }
    }

    const evidence = evidenceFromMessage(msg, x);
    const dup = findDuplicate(d.orders, retailerId, x.orderNumber?.value ?? null);
    const base = dup ?? blankOrder(uid("o"), retailerId, now());
    const merged = mergeExtraction(base, x, evidence.id, () => uid("i"));

    setData((s) => linkReturnEvidence(
      {
        ...s,
        retailers,
        evidence: [...s.evidence, evidence],
        orders: dup ? s.orders.map((o) => (o.id === dup.id ? merged : o)) : [merged, ...s.orders],
      },
      merged.id,
      x,
      evidence.id,
    ));
    return { status: dup ? "merged" : "added", orderId: merged.id, extraction: x };
  },

  addManualOrder(input: { retailerName: string; orderNumber: string | null; purchasedAt: DateOnly | null; deliveredAt: DateOnly | null; itemName: string; price: number | null }): string {
    const retailerId = actions.ensureRetailer(input.retailerName);
    const evId = uid("ev");
    const src = { evidenceId: evId, confidence: "high" as const, method: "user" as const };
    const order: Order = {
      ...blankOrder(uid("o"), retailerId, now()),
      orderNumber: input.orderNumber,
      purchasedAt: input.purchasedAt,
      deliveredAt: input.deliveredAt,
      shipmentStatus: input.deliveredAt ? "delivered" : "unknown",
      items: [{ id: uid("i"), name: input.itemName, variant: null, quantity: 1, unitPrice: input.price, category: "other", finalSale: null }],
      evidenceIds: [evId],
      fieldSources: { orderNumber: src, purchasedAt: src, deliveredAt: src, items: src },
    };
    setData((s) => ({
      ...s,
      orders: [order, ...s.orders],
      evidence: [...s.evidence, { id: evId, kind: "manual_entry", channel: "manual", title: "Added by you", from: null, receivedAt: now(), excerpt: null }],
    }));
    return order.id;
  },

  /** Customer-supplied correction, e.g. a missing delivery date. */
  setOrderDate(orderId: string, field: "purchasedAt" | "deliveredAt" | "shippedAt", value: DateOnly) {
    const evId = uid("ev");
    setData((d) => ({
      ...d,
      evidence: [...d.evidence, { id: evId, kind: "manual_entry", channel: "manual", title: "Updated by you", from: null, receivedAt: now(), excerpt: null }],
      orders: d.orders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              [field]: value,
              shipmentStatus: field === "deliveredAt" ? "delivered" : o.shipmentStatus,
              evidenceIds: [...o.evidenceIds, evId],
              fieldSources: { ...o.fieldSources, [field]: { evidenceId: evId, confidence: "high", method: "user" } },
            }
          : o,
      ),
    }));
  },

  /** Deletes an order and everything derived from it (returns, refunds, evidence). */
  deleteOrder(orderId: string) {
    setData((d) => {
      const order = d.orders.find((o) => o.id === orderId);
      const ev = new Set(order?.evidenceIds ?? []);
      return {
        ...d,
        orders: d.orders.filter((o) => o.id !== orderId),
        returns: d.returns.filter((r) => r.orderId !== orderId),
        refunds: d.refunds.filter((f) => f.orderId !== orderId),
        evidence: d.evidence.filter((e) => !ev.has(e.id)),
      };
    });
  },

  /** Finds a retailer by name, or adds it with no policy assumed. */
  ensureRetailer(name: string): string {
    const clean = name.trim();
    const found = get().data.retailers.find((r) => r.name.toLowerCase() === clean.toLowerCase());
    if (found) return found.id;
    const r = customRetailer(uid("ret"), clean);
    setData((d) => ({ ...d, retailers: [...d.retailers, r] }));
    return r.id;
  },

  // ── Wallet ───────────────────────────────────────────────────────────
  addWalletItem(item: Omit<WalletItem, "id" | "addedAt" | "demo" | "currency">): string {
    const id = uid("w");
    setData((d) => ({ ...d, wallet: [...d.wallet, { ...item, id, currency: "USD", addedAt: now(), demo: false }] }));
    return id;
  },

  updateBalance(id: string, balance: number) {
    setData((d) => ({
      ...d,
      wallet: d.wallet.map((w) => (w.id === id ? { ...w, balance, balanceStatus: { kind: "user_reported", at: now() } } : w)),
    }));
  },

  removeWalletItem(id: string) {
    setData((d) => ({ ...d, wallet: d.wallet.filter((w) => w.id !== id) }));
  },

  // ── Gifts ────────────────────────────────────────────────────────────
  saveGift(gift: GiftTransfer) {
    setData((d) => ({ ...d, gifts: [gift, ...d.gifts] }));
  },

  /** Recipient side of the demo: adds the fictional card to this wallet. */
  claimGift(giftId: string): string | null {
    const d = get().data;
    const g = d.gifts.find((x) => x.id === giftId);
    if (!g) return null;
    const existing = d.wallet.find((w) => w.id === `w-${g.id}`);
    if (existing) return existing.id;
    const code = Array.from({ length: 4 }, () => String(Math.floor(1000 + Math.random() * 9000))).join(" ");
    const item: WalletItem = {
      id: `w-${g.id}`,
      retailerId: g.retailerId,
      type: "gift_received",
      currency: "USD",
      balance: g.amount,
      balanceStatus: { kind: "verified", at: now(), source: "Demo gift (fictional)" },
      secret: { code, pin: null },
      redemption: "Demo gift card. It can't be used at checkout.",
      expiration: { kind: "none" },
      restrictions: ["Demo only. Not a real gift card."],
      transferable: false,
      from: g.senderName,
      sourceOrderId: null,
      addedAt: now(),
      demo: true,
    };
    setData((s) => ({
      ...s,
      wallet: [...s.wallet, item],
      gifts: s.gifts.map((x) => (x.id === giftId ? { ...x, status: "claimed", claimedAt: now() } : x)),
    }));
    return item.id;
  },

  // ── Connections, notifications, data ─────────────────────────────────
  setConnection(id: ConnectorId, status: "connected" | "disconnected") {
    setData((d) => ({
      ...d,
      connections: d.connections.map((c) => (c.id === id ? { ...c, status, lastSyncedAt: status === "connected" ? now() : c.lastSyncedAt } : c)),
    }));
  },

  /** Imports any sample-inbox messages not yet seen. Clearly a demo inbox, never a live account. */
  syncSampleInbox(): ImportResult[] {
    const results = sampleMessages(today()).map((m) => actions.importMessage({ ...m, channel: "sample_inbox" }));
    setData((d) => ({ ...d, connections: d.connections.map((c) => (c.id === "sample_inbox" ? { ...c, lastSyncedAt: now() } : c)) }));
    return results;
  },

  setPrefs(patch: Partial<NotificationPrefs>) {
    setData((d) => ({ ...d, prefs: { ...d.prefs, ...patch } }));
  },

  dismiss(key: string) {
    setData((d) => ({ ...d, dismissed: [...d.dismissed, key] }));
  },

  setPreview(patch: Partial<PreviewFlags>) {
    set((s) => ({ ...s, preview: { ...s.preview, ...patch } }));
  },

  resetDemo() {
    set(() => fresh());
  },

  /** Deletes all imported purchases, returns, refunds and credits. */
  deleteAllData() {
    setData((d) => ({ ...emptied(d), connections: d.connections.map((c) => (c.id === "sample_inbox" ? { ...c, status: "disconnected" } : c)) }));
  },
};

