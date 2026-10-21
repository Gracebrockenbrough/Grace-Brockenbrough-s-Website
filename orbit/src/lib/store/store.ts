"use client";

/**
 * Prototype persistence: a small external store saved to localStorage.
 * Stage 2 replaces this with Supabase-backed services behind the same actions.
 */
import { useSyncExternalStore } from "react";
import { daysBetween, toDateOnly } from "../domain/dates";
import type {
  WishItem,
  ConnectedAccount,
  ConnectionStatus,
  FavoriteStore,
  PublicProfile,
  ConnectorId,
  ImportSettings,
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
import { DEMO_PROFILE, PERSONAL, SCHOOL, buildDemoData } from "../demo/seed";
import { buildBusyMonth } from "../demo/busy";
import type { ItemKind } from "../intelligence/buckets";
import { blankOrder, conflicts, customRetailer, evidenceFromMessage, findDuplicate, mergeExtraction } from "../ingestion/dedupe";
import { gmailConnector, outlookConnector } from "../ingestion/connectors";
import { processMessage } from "../ingestion/pipeline";
import { money, orderTotal } from "../domain/format";
import { returnFacts } from "../intelligence/returns";
import { remindOnFor } from "../intelligence/refunds";
import { sampleMessages } from "../ingestion/samples";
import type { Extraction, MessageCategory, ProcessingJob, RawMessage } from "../ingestion/types";
import { policyForOrder } from "./selectors";
import { shiftSeedDates } from "./shift";
import { EMPTY_PREVIEW, emptied, type OrbitData, type PersistedState, type PreviewFlags } from "./state";

const KEY = "tote:v4";
const listeners = new Set<() => void>();
let state: PersistedState | null = null;

export const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
const now = () => new Date().toISOString();
export const today = (): DateOnly => toDateOnly(new Date());

function fresh(): PersistedState {
  return { version: 4, anchor: today(), data: buildDemoData(today()), preview: EMPTY_PREVIEW };
}

function load(): PersistedState {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed.version === 4) {
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
function linkReturnEvidence(d: OrbitData, orderId: string, x: Extraction, evidenceId: string, category: MessageCategory | null = null): OrbitData {
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
  // Only an issued refund counts. "We'll process your refund" is not a refund.
  if (x.kind === "refund_confirmation" && x.refundAmount && category !== "refund_initiated") {
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
  status: "added" | "merged" | "duplicate_message" | "unrecognized" | "skipped" | "needs_review";
  orderId: string | null;
  extraction: Extraction | null;
  /** The audit entry for this message. */
  job: ProcessingJob | null;
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
      history: [{ at: now(), status: "prepared", note: "Tote prepared your return. Nothing has been sent yet." }],
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
      const policy = policyForOrder(d, order);
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
  /**
   * The customer says the money reached their account. If the store already sent a
   * refund email, this only records arrival; otherwise it also marks the refund issued.
   */
  markRefundArrived(refundId: string, amount: number) {
    setData((d) => {
      const refund = d.refunds.find((f) => f.id === refundId);
      return {
        ...d,
        refunds: d.refunds.map((f) =>
          f.id === refundId
            ? {
                ...f,
                confirmed: f.confirmed ?? { amount, at: today(), by: "customer", evidenceId: null },
                arrivedAt: today(),
                milestones: [...f.milestones, { at: now(), label: "Arrived in your account (you confirmed)", evidenceId: null }],
              }
            : f,
        ),
        returns: d.returns.map((r) =>
          refund && r.id === refund.returnId && r.status !== "completed"
            ? { ...r, status: "completed", history: [...r.history, { at: now(), status: "completed", note: "You confirmed the refund arrived." }] }
            : r,
        ),
      };
    });
  },

  /**
   * Refund Asker answers. "Not yet" and "Remind me later" snooze the question (no repeat
   * reminders in between); "missing" flags it so Tote helps follow up with the store.
   */
  answerRefund(refundId: string, answer: "not_yet" | "later" | "missing") {
    const t = today();
    setData((d) => ({
      ...d,
      refunds: d.refunds.map((f) => {
        if (f.id !== refundId) return f;
        const prev = f.asker ?? { answer: null, remindOn: null, askedCount: 0, reportedMissingAt: null, resolvedAt: null, resolution: null };
        const label = answer === "missing" ? "You reported the refund missing" : answer === "not_yet" ? "Not arrived yet (you checked)" : "You'll check later";
        return {
          ...f,
          asker: { ...prev, answer, askedCount: prev.askedCount + 1, remindOn: answer === "missing" ? null : remindOnFor(answer, t), reportedMissingAt: answer === "missing" ? t : prev.reportedMissingAt },
          milestones: [...f.milestones, { at: now(), label, evidenceId: null }],
        };
      }),
    }));
  },

  /** A missing refund was sorted out (it arrived late, or the store fixed it). */
  resolveRefund(refundId: string, resolution: string, amount: number | null = null) {
    const t = today();
    setData((d) => ({
      ...d,
      refunds: d.refunds.map((f) =>
        f.id === refundId
          ? {
              ...f,
              arrivedAt: amount != null ? t : f.arrivedAt,
              confirmed: f.confirmed ?? (amount != null ? { amount, at: t, by: "customer", evidenceId: null } : null),
              asker: { ...(f.asker ?? { answer: null, remindOn: null, askedCount: 0, reportedMissingAt: null }), answer: f.asker?.answer ?? null, resolvedAt: t, resolution },
              milestones: [...f.milestones, { at: now(), label: `Resolved: ${resolution}`, evidenceId: null }],
            }
          : f,
      ),
    }));
  },

  // ── Orders & ingestion ───────────────────────────────────────────────
  /**
   * Runs one message through the ingestion pipeline and saves the result. Safe to call
   * repeatedly: the same message or content is recorded once and never reprocessed.
   */
  importMessage(msg: RawMessage): ImportResult {
    const d = get().data;
    const conn = msg.connectionId ? d.connections.find((c) => c.id === msg.connectionId) : undefined;
    const decision = processMessage(msg, { retailers: d.retailers, jobs: d.jobs, aiUsage: d.aiUsage, settings: conn?.importSettings, now: now() });
    const job: ProcessingJob = { ...decision.job, id: uid("job"), orderId: null };
    const x = decision.extraction;

    if (!decision.save || !x) {
      setData((s) => ({ ...s, jobs: [job, ...s.jobs].slice(0, 500) }));
      const status = job.status === "duplicate" ? "duplicate_message" : job.status === "needs_review" ? "needs_review" : job.status.startsWith("skipped") ? (job.status === "skipped_irrelevant" ? "unrecognized" : "skipped") : "unrecognized";
      return { status, orderId: null, extraction: x, job };
    }

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
    const dup = findDuplicate(d.orders, retailerId, x.orderNumber?.value ?? null, x.tracking?.value.number ?? null);
    // Conflicting high-confidence facts are never silently overwritten: ask the customer.
    const clash = dup ? conflicts(dup, x) : [];
    const base = dup ?? { ...blankOrder(uid("o"), retailerId, now()), sourceConnectionId: msg.connectionId ?? null, channel: msg.inStore ? ("in_store" as const) : ("online" as const) };
    const merged = mergeExtraction(base, x, evidence.id, () => uid("i"));
    const done: ProcessingJob = clash.length
      ? { ...job, status: "needs_review", tier: 3, orderId: merged.id, reason: `This email disagrees with the order on the ${clash.join(" and ")}. We kept the original.` }
      : { ...job, status: dup ? "merged" : "saved", orderId: merged.id };
    const saved = clash.length ? { ...dup!, evidenceIds: Array.from(new Set([...dup!.evidenceIds, evidence.id])) } : merged;

    setData((s) =>
      linkReturnEvidence(
        {
          ...s,
          retailers,
          evidence: [...s.evidence, evidence],
          orders: dup ? s.orders.map((o) => (o.id === dup.id ? saved : o)) : [saved, ...s.orders],
          jobs: [done, ...s.jobs].slice(0, 500),
        },
        saved.id,
        x,
        evidence.id,
        decision.category,
      ),
    );
    return { status: clash.length ? "needs_review" : dup ? "merged" : "added", orderId: saved.id, extraction: x, job: done };
  },

  /** The customer resolved a review item: saved it as a purchase, or dismissed it. */
  resolveReview(jobId: string, resolution: "corrected" | "dismissed", orderId: string | null = null) {
    setData((d) => ({
      ...d,
      jobs: d.jobs.map((j) => (j.id === jobId ? { ...j, status: resolution === "dismissed" ? "skipped_irrelevant" : "saved", reason: resolution === "dismissed" ? "Dismissed by you" : "Corrected by you", orderId: orderId ?? j.orderId } : j)),
    }));
  },

  addManualOrder(input: {
    retailerName: string;
    orderNumber: string | null;
    purchasedAt: DateOnly | null;
    deliveredAt: DateOnly | null;
    itemName: string;
    price: number | null;
    inStore?: boolean;
    /** A receipt photo or PDF kept with the purchase. Not read automatically yet. */
    attachment?: { name: string; type: string; dataUrl: string } | null;
  }): string {
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
      channel: input.inStore ? "in_store" : "online",
      // In-store purchases are "delivered" the day they're bought.
      ...(input.inStore && !input.deliveredAt && input.purchasedAt ? { deliveredAt: input.purchasedAt, shipmentStatus: "delivered" as const } : {}),
    };
    const file = input.attachment ?? null;
    setData((s) => ({
      ...s,
      orders: [order, ...s.orders],
      evidence: [
        ...s.evidence,
        file
          ? { id: evId, kind: "receipt_upload", channel: file.type === "application/pdf" ? "pdf_upload" : "screenshot", title: file.name, from: null, receivedAt: now(), excerpt: "Details entered by you", attachment: file, verification: "verified" }
          : { id: evId, kind: "manual_entry", channel: "manual", title: "Added by you", from: null, receivedAt: now(), excerpt: null },
      ],
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
  addWalletItem(item: Omit<WalletItem, "id" | "addedAt" | "demo" | "currency" | "history">): string {
    const id = uid("w");
    const history = item.balance != null ? [{ at: today(), amount: item.balance, label: "Added to Tote" }] : [];
    setData((d) => ({ ...d, wallet: [...d.wallet, { ...item, id, currency: "USD", history, addedAt: now(), demo: false }] }));
    return id;
  },

  updateBalance(id: string, balance: number) {
    setData((d) => ({
      ...d,
      wallet: d.wallet.map((w) =>
        w.id === id
          ? {
              ...w,
              balance,
              balanceStatus: { kind: "user_reported", at: now() },
              history: w.balance != null && w.balance !== balance ? [...w.history, { at: today(), amount: balance - w.balance, label: "Balance updated by you" }] : w.history,
            }
          : w,
      ),
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
      history: [{ at: today(), amount: g.amount, label: `Gift from ${g.senderName} (demo)` }],
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
  setConnection(id: string, status: ConnectionStatus, lastError: string | null = null) {
    setData((d) => ({
      ...d,
      connections: d.connections.map((c) => (c.id === id ? { ...c, status, lastError, lastSyncedAt: status === "connected" && !c.lastSyncedAt ? now() : c.lastSyncedAt } : c)),
    }));
  },

  /**
   * Adds another inbox to the same Tote profile. Real providers go through their own
   * OAuth consent; Tote never asks for an email password. Gmail and Outlook aren't
   * available yet, so only clearly labeled sample inboxes can be added in the prototype.
   */
  async addConnection(input: { provider: ConnectorId; label: string; address: string }): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
    if (input.provider !== "sample") {
      const c = input.provider === "gmail" ? gmailConnector : outlookConnector;
      const a = c.availability();
      if (!a.available) return { ok: false, reason: a.reason };
      const res = await c.authorize();
      if (!res.ok) return res;
    }
    const id = uid("conn");
    const conn: ConnectedAccount = {
      id,
      provider: input.provider,
      label: input.label.trim() || "Email",
      address: input.address.trim() || null,
      status: "connecting",
      lastSyncedAt: null,
      lastError: null,
      importSettings: { orders: true, shipping: true, returnsAndRefunds: true, giftCards: true, since: null },
      connectedAt: now(),
      demo: input.provider === "sample",
    };
    setData((d) => ({ ...d, connections: [...d.connections, conn] }));
    await new Promise((r) => setTimeout(r, 500));
    actions.setConnection(id, "connected");
    return { ok: true, id };
  },

  renameConnection(id: string, label: string) {
    setData((d) => ({ ...d, connections: d.connections.map((c) => (c.id === id ? { ...c, label: label.trim() || c.label } : c)) }));
  },

  setImportSettings(id: string, patch: Partial<ImportSettings>) {
    setData((d) => ({ ...d, connections: d.connections.map((c) => (c.id === id ? { ...c, importSettings: { ...c.importSettings, ...patch } } : c)) }));
  },

  /**
   * Disconnects an inbox (production: revokes the token with the provider). Purchases
   * already imported stay unless the customer also asks to delete them.
   */
  disconnectConnection(id: string, deleteImported = false) {
    setData((d) => {
      const connections = d.connections.map((c) => (c.id === id ? { ...c, status: "disconnected" as const, lastError: null } : c));
      if (!deleteImported) return { ...d, connections };
      const orderIds = new Set(d.orders.filter((o) => o.sourceConnectionId === id).map((o) => o.id));
      return {
        ...d,
        connections: connections.filter((c) => c.id !== id),
        orders: d.orders.filter((o) => !orderIds.has(o.id)),
        returns: d.returns.filter((r) => !orderIds.has(r.orderId)),
        refunds: d.refunds.filter((f) => !orderIds.has(f.orderId)),
        evidence: d.evidence.filter((e) => e.connectionId !== id),
        jobs: d.jobs.filter((j) => j.connectionId !== id),
      };
    });
  },

  async reconnect(id: string) {
    actions.setConnection(id, "connecting");
    await new Promise((r) => setTimeout(r, 600));
    actions.setConnection(id, "connected");
  },

  /**
   * Syncs one sample inbox. It goes through the same states a real mailbox would
   * (syncing, failed, connected), but only ever reads fictional emails. Each message
   * runs through the full pipeline, so re-syncing never duplicates anything.
   */
  async syncConnection(id: string): Promise<ImportResult[] | null> {
    const conn = get().data.connections.find((c) => c.id === id);
    if (!conn || conn.status === "disconnected" || conn.status === "reauth_required") return null;
    actions.setConnection(id, "syncing");
    await new Promise((r) => setTimeout(r, 900));
    if (get().preview.failNextSync) {
      set((s) => ({ ...s, preview: { ...s.preview, failNextSync: false } }));
      actions.setConnection(id, "sync_failed", "The mail server didn't respond. Nothing was changed.");
      return null;
    }
    const inbox = id === PERSONAL ? "personal" : id === SCHOOL ? "school" : null;
    const results = sampleMessages(today())
      .filter((m) => m.inbox === inbox)
      .map((m) => actions.importMessage({ ...m, channel: "sample_inbox", connectionId: id }));
    setData((d) => ({ ...d, connections: d.connections.map((c) => (c.id === id ? { ...c, status: "connected", lastError: null, lastSyncedAt: now() } : c)) }));
    return results;
  },

  // ── You and Circle ───────────────────────────────────────────────────
  /** Saves or unsaves a store. New favorites are private until the customer shares them. */
  toggleFavoriteStore(retailerId: string): boolean {
    let saved = false;
    setData((d) => {
      const list = d.favoriteStores ?? [];
      saved = !list.some((f) => f.retailerId === retailerId);
      return { ...d, favoriteStores: saved ? [{ retailerId, visibility: "private", addedAt: now() }, ...list] : list.filter((f) => f.retailerId !== retailerId) };
    });
    return saved;
  },

  setFavoriteVisibility(retailerId: string, visibility: FavoriteStore["visibility"]) {
    setData((d) => ({ ...d, favoriteStores: (d.favoriteStores ?? []).map((f) => (f.retailerId === retailerId ? { ...f, visibility } : f)) }));
  },

  setPublicProfile(patch: Partial<PublicProfile>) {
    setData((d) => ({ ...d, publicProfile: { displayName: DEMO_PROFILE.firstName, bio: null, ...d.publicProfile, ...patch } }));
  },

  // ── Saved for Later ─────────────────────────────────────────────────────────
  addWish(input: Omit<WishItem, "id" | "addedAt" | "status">): string {
    const id = uid("wl");
    setData((d) => ({ ...d, wishlist: [{ ...input, id, status: "active", addedAt: now() }, ...d.wishlist] }));
    return id;
  },

  setWishStatus(id: string, status: WishItem["status"]) {
    setData((d) => ({ ...d, wishlist: d.wishlist.map((w) => (w.id === id ? { ...w, status, until: status === "active" ? null : w.until } : w)) }));
  },

  removeWish(id: string) {
    setData((d) => ({ ...d, wishlist: d.wishlist.filter((w) => w.id !== id) }));
  },

  // ── Receipts, labels, return tracking ────────────────────────────────
  attachReceipt(orderId: string, file: { name: string; type: string; dataUrl: string }) {
    const evId = uid("ev");
    setData((d) => ({
      ...d,
      evidence: [...d.evidence, { id: evId, kind: "receipt_upload", channel: file.type === "application/pdf" ? "pdf_upload" : "screenshot", title: file.name, from: null, receivedAt: now(), excerpt: null, attachment: file, verification: null }],
      orders: d.orders.map((o) => (o.id === orderId ? { ...o, evidenceIds: [...o.evidenceIds, evId] } : o)),
    }));
  },

  /** The customer checked details read from a receipt against the receipt itself. */
  markEvidenceVerified(evidenceId: string) {
    setData((d) => ({ ...d, evidence: d.evidence.map((e) => (e.id === evidenceId ? { ...e, verification: "verified" } : e)) }));
  },

  /** Saves a label the customer has (from the store's site or email). */
  saveReturnLabel(returnId: string, file: { name: string; type: string; dataUrl: string }) {
    const evId = uid("ev");
    setData((d) => {
      const r = d.returns.find((x) => x.id === returnId);
      return {
        ...d,
        evidence: [...d.evidence, { id: evId, kind: "return_label", channel: "screenshot", title: file.name, from: null, receivedAt: now(), excerpt: "Label saved by you.", attachment: file }],
        orders: d.orders.map((o) => (r && o.id === r.orderId ? { ...o, evidenceIds: [...o.evidenceIds, evId] } : o)),
        returns: d.returns.map((x) =>
          x.id === returnId
            ? {
                ...x,
                status: x.status === "prepared" || x.status === "reported_submitted" || x.status === "approval_pending" ? "label_ready" : x.status,
                artifacts: [...x.artifacts, { id: uid("a"), kind: "label_pdf", carrier: null, code: file.name, evidenceId: evId, expiresAt: null, file }],
                history: [...x.history, { at: now(), status: "label_ready", note: "You saved the return label." }],
              }
            : x,
        ),
      };
    });
  },

  /** The customer shipped it and has the tracking number (typed or scanned). */
  setReturnTracking(returnId: string, number: string) {
    const n = number.trim().toUpperCase().replace(/\s+/g, "");
    const carrier = /^1Z/.test(n) ? "UPS" : /^9[2-5]\d{18,}/.test(n) ? "USPS" : /^\d{12}$|^\d{15}$/.test(n) ? "FedEx" : null;
    patchReturn(returnId, "shipped", "You added the return tracking number.", { returnTracking: { carrier, number: n } });
    setData((d) => ({
      ...d,
      refunds: d.refunds.map((f) => (f.returnId === returnId ? { ...f, milestones: [...f.milestones, { at: now(), label: "Shipped back by you", evidenceId: null }] } : f)),
    }));
  },

  setGoalsEnabled(enabled: boolean) {
    setData((d) => ({ ...d, goals: { monthly: d.goals?.monthly ?? {}, enabled } }));
  },

  /** Sets or clears (null) a monthly goal for one bucket. */
  setGoal(kind: ItemKind, amount: number | null) {
    setData((d) => {
      const monthly = { ...(d.goals?.monthly ?? {}) };
      if (amount == null || amount <= 0) delete monthly[kind];
      else monthly[kind] = amount;
      return { ...d, goals: { enabled: d.goals?.enabled ?? true, monthly } };
    });
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

  /** Adds ~20 fictional orders to preview a busy month. */
  loadBusyMonth() {
    const extra = buildBusyMonth(today());
    setData((d) => ({
      ...d,
      orders: [...d.orders.filter((o) => !o.id.startsWith("d-b-")), ...extra.orders],
      returns: [...d.returns.filter((r) => !r.id.startsWith("d-b-")), ...extra.returns],
      refunds: [...d.refunds.filter((f) => !f.id.startsWith("d-b-")), ...extra.refunds],
    }));
  },

  resetDemo() {
    set(() => fresh());
  },

  /** Deletes all imported purchases, returns, refunds and credits. */
  deleteAllData() {
    setData((d) => ({ ...emptied(d), connections: d.connections.map((c) => ({ ...c, status: "disconnected" })) }));
  },
};

