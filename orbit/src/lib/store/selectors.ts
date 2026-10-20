/**
 * Shared selectors: the single place where an order's status, next action,
 * deadline and amounts are decided. Today, Returns, order details, the calendar
 * and Ask Orbit all read from here, so they can never disagree.
 */
import { daysBetween, formatDate } from "../domain/dates";
import { money } from "../domain/format";
import type { DateOnly, Order, Refund, RefundMethod, Retailer, ReturnPolicy, ReturnRequest, WalletItem } from "../domain/types";
import { assessItem, isActiveReturn, orderStage, returnFacts, soonestDeadline, type Deadline, type ItemAssessment, type OrderStage } from "../intelligence/returns";
import { needsVerification } from "../services/balances";
import type { OrbitData } from "./state";

export const retailerOf = (d: OrbitData, id: string): Retailer =>
  d.retailers.find((r) => r.id === id) ?? {
    id,
    name: "Unknown retailer",
    websiteUrl: "",
    returnsUrl: "",
    supportUrl: "",
    balanceCheckUrl: null,
    returnCapability: "guided",
    giftPartner: false,
    tone: "slate",
    category: "general",
  };

export const policyOf = (d: OrbitData, retailerId: string): ReturnPolicy | null => d.policies.find((p) => p.retailerId === retailerId) ?? null;

export const orderHref = (orderId: string) => `/returns/purchase/?id=${orderId}`;

// ─── Return stages ───────────────────────────────────────────────────────

export type StageKey = "decide" | "initiate" | "awaiting_approval" | "drop_off" | "in_transit" | "received" | "refund_pending" | "refund_confirmed";

/** The eight customer-facing return stages, in order. Only the current one is shown in lists. */
export const STAGES: { key: StageKey; label: string }[] = [
  { key: "decide", label: "Decide whether to return" },
  { key: "initiate", label: "Return needs initiating" },
  { key: "awaiting_approval", label: "Awaiting retailer approval" },
  { key: "drop_off", label: "Ready to drop off" },
  { key: "in_transit", label: "Return in transit" },
  { key: "received", label: "Received by retailer" },
  { key: "refund_pending", label: "Refund pending" },
  { key: "refund_confirmed", label: "Refund confirmed" },
];

/** Which list an order belongs in on the Returns screen. */
export type TaskGroup = "action" | "awaiting" | "not_delivered" | "history";

/** Visual indicator used everywhere for the same kind of need. */
export type Indicator =
  | "decide"
  | "initiate"
  | "approval"
  | "drop_off"
  | "transit"
  | "refund"
  | "refund_check"
  | "done"
  | "unknown"
  | "not_delivered"
  | "credit"
  | "delivered"
  | "started";

export interface Stage {
  key: StageKey | null;
  /** "Decide whether to return", "Refund needs checking", "Not delivered yet"… */
  label: string;
  group: TaskGroup;
  indicator: Indicator;
  /** Date the next action is due by, and how that date is known. */
  dueDate: DateOnly | null;
  daysLeft: number | null;
  dueLabel: string | null;
  estimated: boolean;
  /** One plain sentence on why this needs attention (or doesn't). */
  why: string;
  action: { label: string; href: string };
}

export interface OrderView {
  order: Order;
  retailer: Retailer;
  policy: ReturnPolicy | null;
  items: ItemAssessment[];
  stage: OrderStage;
  deadline: Deadline | null;
  activeReturn: ReturnRequest | null;
  latestReturn: ReturnRequest | null;
  refund: Refund | null;
  /** The items the current task is about (the returning items, or those still to decide). */
  focusItems: Order["items"];
  title: string;
  /** Value of the focus items. Actual purchase price, so not a promise of refund. */
  amount: number | null;
  current: Stage;
}

function sumItems(items: Order["items"]): number | null {
  if (!items.length) return null;
  let s = 0;
  for (const i of items) {
    if (i.unitPrice == null) return null;
    s += i.unitPrice * i.quantity;
  }
  return Math.round(s * 100) / 100;
}

export function returnStatusText(r: ReturnRequest): string {
  switch (r.status) {
    case "prepared":
      return "Return needs initiating";
    case "reported_submitted":
      return r.submission.confirmedByRetailer ? "Retailer confirmed. Waiting for label" : "Awaiting retailer approval";
    case "approval_pending":
      return "Awaiting retailer approval";
    case "label_ready":
      return "Ready to drop off";
    case "shipped":
      return "Return in transit";
    case "received":
      return "Received by retailer";
    case "completed":
      return "Return complete";
    case "cancelled":
      return "Cancelled";
  }
}

function stageFor(v: Omit<OrderView, "current">, today: DateOnly): Stage {
  const { order, activeReturn: r, refund, retailer } = v;
  const left = (x: DateOnly | null) => (x ? daysBetween(today, x) : null);
  const by = (verb: string, x: DateOnly | null) => (x ? `${verb} ${formatDate(x, today)}` : null);
  const detail = orderHref(order.id);
  const dl = v.deadline && "date" in v.deadline ? v.deadline.date : null;
  const est = v.deadline?.kind === "estimated";
  const base = { dueDate: null, daysLeft: null, dueLabel: null, estimated: false };

  if (r) {
    switch (r.status) {
      case "prepared":
        return { key: "initiate", label: "Return needs initiating", group: "action", indicator: "initiate", dueDate: dl, daysLeft: left(dl), dueLabel: by("Start by", dl), estimated: est, why: `Prepared, but not sent to ${retailer.name} yet.`, action: { label: "Continue Return", href: `/returns/start/?return=${r.id}` } };
      case "reported_submitted":
      case "approval_pending":
        return { ...base, key: "awaiting_approval", label: r.submission.confirmedByRetailer ? "Retailer confirmed" : "Awaiting retailer approval", group: "awaiting", indicator: "approval", why: r.submission.confirmedByRetailer ? `${retailer.name} confirmed. A label should follow.` : `Waiting for ${retailer.name} to confirm your request.`, action: { label: "View Return", href: `/returns/start/?return=${r.id}` } };
      case "label_ready": {
        const qr = r.artifacts.some((a) => a.kind === "qr_code");
        const store = r.dropOff === "store";
        return { key: "drop_off", label: "Ready to drop off", group: "action", indicator: "drop_off", dueDate: r.shipBy, daysLeft: left(r.shipBy), dueLabel: by("Drop off by", r.shipBy), estimated: false, why: qr ? "Your QR code is ready. Take the package to a drop-off point." : store ? `Bring the item to a ${retailer.name} store.` : "Your label is ready. Drop the package off.", action: { label: store && !qr ? "Get Directions" : qr ? "Show QR Code" : "View Label", href: `/returns/label/?id=${r.id}` } };
      }
      case "shipped":
        return { ...base, key: "in_transit", label: "Return in transit", group: "awaiting", indicator: "transit", why: `On its way back to ${retailer.name}.`, action: refund ? { label: "Track Refund", href: `/returns/refund/?id=${refund.id}` } : { label: "View Return", href: `/returns/start/?return=${r.id}` } };
      case "received": {
        if (refund?.confirmed) break; // falls through to "refund confirmed" below
        const expected = refund?.expected?.by ?? null;
        const overdue = expected != null && daysBetween(expected, today) > 0;
        const track = refund ? `/returns/refund/?id=${refund.id}` : detail;
        return overdue
          ? { key: "refund_pending", label: "Refund needs checking", group: "action", indicator: "refund_check", dueDate: expected, daysLeft: left(expected), dueLabel: by("Expected", expected), estimated: true, why: `No refund email from ${retailer.name} yet. Check your statement before following up.`, action: { label: "Check Refund", href: track } }
          : { key: "refund_pending", label: "Refund pending", group: "awaiting", indicator: "refund", dueDate: expected, daysLeft: left(expected), dueLabel: by("Expected", expected), estimated: true, why: `${retailer.name} has your return. Waiting for their refund email.`, action: { label: "Track Refund", href: track } };
      }
    }
  }

  // Finished returns.
  const done = v.latestReturn;
  if (done && (done.status === "completed" || (done.status === "received" && refund?.confirmed))) {
    const credit = refund?.destination === "store_credit";
    return { ...base, key: "refund_confirmed", label: credit ? "Store credit issued" : "Refund confirmed", group: "history", indicator: "done", why: refund?.confirmed ? `${credit ? "Credit" : "Refund"} issued ${formatDate(refund.confirmed.at, today)}.` : "Return complete.", action: refund ? { label: "View Refund", href: `/returns/refund/?id=${refund.id}` } : { label: "View Details", href: detail } };
  }

  switch (v.stage) {
    case "to_decide":
      if (!dl)
        return { ...base, key: "decide", label: "Deadline unknown", group: "action", indicator: "unknown", why: v.deadline?.kind === "unknown" ? v.deadline.reason : "We don't know the return deadline.", action: { label: "Add Details", href: detail } };
      return { key: "decide", label: "Decide whether to return", group: "action", indicator: "decide", dueDate: dl, daysLeft: left(dl), dueLabel: by("Decide by", dl), estimated: est, why: v.deadline?.kind === "confirmed" ? `Last day to return, confirmed by ${retailer.name}.` : "Last day to return, estimated from the store's policy.", action: { label: "Start Return", href: `/returns/start/?order=${order.id}` } };
    case "on_the_way":
      return { ...base, label: "Not delivered yet", key: null, group: "not_delivered", indicator: "not_delivered", why: "The return window starts when it arrives.", action: { label: "View Details", href: detail } };
    case "kept":
      return { ...base, label: "Kept", key: null, group: "history", indicator: "done", why: "You're keeping this.", action: { label: "View Details", href: detail } };
    default:
      return { ...base, label: v.items.some((i) => i.eligibility === "ineligible") ? "Final sale" : "Return window closed", key: null, group: "history", indicator: "done", why: "This can no longer be returned.", action: { label: "View Details", href: detail } };
  }
}

export function orderView(d: OrbitData, order: Order, today: DateOnly): OrderView {
  const retailer = retailerOf(d, order.retailerId);
  const policy = policyOf(d, order.retailerId);
  const items = order.items.map((i) => assessItem(order, i, policy, d.returns, today));
  const stage = items.length ? orderStage(items) : "to_decide";
  const returns = d.returns.filter((r) => r.orderId === order.id && r.status !== "cancelled");
  const activeReturn = returns.find(isActiveReturn) ?? null;
  const latestReturn = activeReturn ?? returns[returns.length - 1] ?? null;
  const refund = latestReturn ? d.refunds.find((f) => f.returnId === latestReturn.id) ?? null : null;
  const focusItems = latestReturn ? order.items.filter((i) => latestReturn.itemIds.includes(i.id)) : items.filter((a) => a.stage === "to_decide").map((a) => a.item);
  const named = focusItems.length ? focusItems : order.items;
  const title = named[0] ? named[0].name + (named.length > 1 ? ` + ${named.length - 1} more` : "") : "Items not listed";

  const partial = { order, retailer, policy, items, stage, deadline: soonestDeadline(items), activeReturn, latestReturn, refund, focusItems, title, amount: sumItems(named) };
  return { ...partial, current: stageFor(partial, today) };
}

export function orderViews(d: OrbitData, today: DateOnly): OrderView[] {
  return d.orders
    .map((o) => orderView(d, o, today))
    .sort((a, b) => (a.current.daysLeft ?? 999) - (b.current.daysLeft ?? 999) || (b.amount ?? 0) - (a.amount ?? 0));
}

/** Index of the current stage in STAGES, or -1 when the order isn't in a return. */
export function stageIndex(v: OrderView): number {
  return v.current.key ? STAGES.findIndex((s) => s.key === v.current.key) : -1;
}

// ─── Money classification ────────────────────────────────────────────────

export type MoneyKind = "actual" | "expected" | "potential" | "last_known" | "confirmed";

export interface RefundOutlook {
  amount: number | null;
  method: RefundMethod | "unknown" | null;
  methodLabel: string;
  kind: MoneyKind;
  note: string;
}

/** What the customer could get back, and how sure we are. */
export function refundOutlook(v: OrderView): RefundOutlook {
  const f = v.refund;
  if (f?.confirmed)
    return {
      amount: f.confirmed.amount,
      method: f.destination,
      methodLabel: f.destinationLabel ?? "Original payment",
      kind: "confirmed",
      note: f.confirmed.by === "retailer_email" ? `Issued by ${v.retailer.name}` : "Confirmed by you",
    };
  if (f?.expected)
    return { amount: f.expected.amount, method: f.destination, methodLabel: f.destinationLabel ?? "Original payment", kind: "expected", note: f.expected.basis };
  const r = v.activeReturn;
  const pref = r?.refundPreference ?? v.policy?.refundMethods[0] ?? null;
  const fee = returnFacts(v.policy, { dropOff: r?.dropOff ?? v.policy?.dropOff[0] ?? null, refund: pref }).fee;
  const amount = v.amount == null ? null : fee == null ? v.amount : Math.max(0, v.amount - fee);
  return {
    amount,
    method: pref,
    methodLabel: pref === "store_credit" ? `${v.retailer.name} store credit` : pref === "original_payment" ? "Original payment method" : "Not known yet",
    kind: "potential",
    note: fee == null ? "Item price. Return fees aren't confirmed." : fee > 0 ? `Item price minus a ${money(fee)} return fee.` : "Item price. No return fee.",
  };
}

// ─── Wallet ──────────────────────────────────────────────────────────────

export function walletTotals(d: OrbitData, today: DateOnly) {
  const known = d.wallet.filter((w) => w.balance != null && !(w.expiration.kind === "date" && daysBetween(today, w.expiration.date) < 0));
  const total = known.reduce((s, w) => s + (w.balance ?? 0), 0);
  const unverified = d.wallet.filter((w) => needsVerification(w, (ts) => daysBetween(ts.slice(0, 10), today)));
  const retailers = new Set(known.map((w) => w.retailerId)).size;
  return { total: Math.round(total * 100) / 100, count: d.wallet.length, retailers, unverified };
}

export function isExpired(w: WalletItem, today: DateOnly) {
  return w.expiration.kind === "date" && daysBetween(today, w.expiration.date) < 0;
}

/** Recorded balance at a retailer, for contextual notes ("You have $150 in recorded Reformation credit"). */
export function creditAt(d: OrbitData, retailerId: string, today: DateOnly): number {
  return d.wallet.filter((w) => w.retailerId === retailerId && !isExpired(w, today)).reduce((s, w) => s + (w.balance ?? 0), 0);
}
