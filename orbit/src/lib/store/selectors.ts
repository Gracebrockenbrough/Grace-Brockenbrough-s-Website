import { daysBetween } from "../domain/dates";
import type { DateOnly, Order, Refund, Retailer, ReturnPolicy, ReturnRequest, WalletItem } from "../domain/types";
import { assessItem, isActiveReturn, orderStage, soonestDeadline, type Deadline, type ItemAssessment, type OrderStage } from "../intelligence/returns";
import { needsVerification } from "../services/balances";
import type { OrbitData } from "./state";

export const retailerOf = (d: OrbitData, id: string): Retailer =>
  d.retailers.find((r) => r.id === id) ?? { id, name: "Unknown retailer", websiteUrl: "", returnsUrl: "", supportUrl: "", balanceCheckUrl: null, returnCapability: "guided", giftPartner: false, tone: "slate", category: "general" };

export const policyOf = (d: OrbitData, retailerId: string): ReturnPolicy | null => d.policies.find((p) => p.retailerId === retailerId) ?? null;

export interface NextAction {
  label: "Start Return" | "Continue Return" | "View QR Code" | "View Label" | "Track Refund" | "View Return" | "View Details";
  href: string;
  primary: boolean;
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
  status: string;
  action: NextAction;
}

const statusText: Record<OrderStage, string> = {
  on_the_way: "On the way",
  to_decide: "Delivered",
  returning: "Return in progress",
  completed: "Return complete",
  kept: "Kept",
  not_returnable: "Not returnable",
};

export function returnStatusText(r: ReturnRequest): string {
  switch (r.status) {
    case "prepared":
      return "Prepared. Not submitted yet";
    case "reported_submitted":
      return r.submission.confirmedByRetailer ? "Confirmed. Waiting for your label" : "Submitted by you. Awaiting retailer confirmation";
    case "approval_pending":
      return "Waiting for retailer approval";
    case "label_ready":
      return "Label ready. Drop off needed";
    case "shipped":
      return "On its way back";
    case "received":
      return "Received by retailer. Refund pending";
    case "completed":
      return "Return complete";
    case "cancelled":
      return "Cancelled";
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

  let action: NextAction;
  const detail = `/returns/purchase/?id=${order.id}`;
  if (activeReturn) {
    const s = activeReturn.status;
    if (s === "prepared") action = { label: "Continue Return", href: `/returns/start/?return=${activeReturn.id}`, primary: true };
    else if (s === "label_ready")
      action = {
        label: activeReturn.artifacts.some((a) => a.kind === "qr_code") ? "View QR Code" : "View Label",
        href: `/returns/label/?id=${activeReturn.id}`,
        primary: true,
      };
    else if ((s === "shipped" || s === "received") && refund) action = { label: "Track Refund", href: `/returns/refund/?id=${refund.id}`, primary: true };
    else action = { label: "View Return", href: `/returns/start/?return=${activeReturn.id}`, primary: true };
  } else if (stage === "to_decide") {
    action = { label: "Start Return", href: `/returns/start/?order=${order.id}`, primary: true };
  } else if (stage === "completed" && refund) {
    action = { label: "Track Refund", href: `/returns/refund/?id=${refund.id}`, primary: false };
  } else {
    action = { label: "View Details", href: detail, primary: false };
  }

  return {
    order,
    retailer,
    policy,
    items,
    stage,
    deadline: soonestDeadline(items),
    activeReturn,
    latestReturn,
    refund,
    status: activeReturn
      ? returnStatusText(activeReturn)
      : stage === "to_decide" && order.shipmentStatus !== "delivered"
        ? order.shipmentStatus === "unknown"
          ? "Delivery not confirmed"
          : "Shipped"
        : statusText[stage],
    action,
  };
}

export function orderViews(d: OrbitData, today: DateOnly): OrderView[] {
  const rank: Record<OrderStage, number> = { returning: 0, to_decide: 1, on_the_way: 2, completed: 3, kept: 4, not_returnable: 5 };
  return d.orders
    .map((o) => orderView(d, o, today))
    .sort((a, b) => {
      const s = rank[a.stage] - rank[b.stage];
      if (s) return s;
      const da = a.deadline && "daysLeft" in a.deadline ? a.deadline.daysLeft : 999;
      const db = b.deadline && "daysLeft" in b.deadline ? b.deadline.daysLeft : 999;
      if (da !== db) return da - db;
      return (b.order.purchasedAt ?? "").localeCompare(a.order.purchasedAt ?? "");
    });
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

// ─── Return tasks (Returns screen) ───────────────────────────────────────

export type TaskGroup = "move" | "waiting" | "transit" | "history";

export interface ReturnTask {
  view: OrderView;
  group: TaskGroup;
  emoji: string;
  /** "Decide by Oct 23", "Drop off by Oct 25", "Refund late". */
  label: string;
  dueDate: DateOnly | null;
  daysLeft: number | null;
  amount: number | null;
  estimated: boolean;
  /** "Juliette Dress" or "Hydrating Serum + 1 more". */
  title: string;
  /** One line on why it needs attention. */
  why: string;
  /** Where tapping the row goes. */
  href: string;
  actionLabel: string;
}

/** Turns an order into the single thing it needs, so long lists stay scannable. */
export function returnTask(d: OrbitData, v: OrderView, today: DateOnly): ReturnTask {
  const fmt = (x: DateOnly) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${x}T12:00:00Z`));
  const left = (x: DateOnly | null) => (x ? daysBetween(today, x) : null);
  const r = v.activeReturn;
  const items = r ? v.order.items.filter((i) => r.itemIds.includes(i.id)) : v.items.filter((a) => a.stage === "to_decide").map((a) => a.item);
  const sum = items.reduce<number | null>((s, i) => (s == null || i.unitPrice == null ? null : s + i.unitPrice * i.quantity), 0);
  const named = items.length ? items : v.order.items;
  const title = named[0] ? named[0].name + (named.length > 1 ? ` + ${named.length - 1} more` : "") : "Items not listed";
  const dl = v.deadline && "date" in v.deadline ? v.deadline.date : null;
  const estimated = v.deadline?.kind === "estimated";
  const base = { view: v, amount: items.length ? sum : null, title, estimated: false, why: v.status };

  if (r?.status === "prepared")
    return { ...base, estimated, why: "Prepared, but not sent to the store yet.", group: "move", emoji: "✍️", label: "Finish return", dueDate: dl, daysLeft: left(dl), href: v.action.href, actionLabel: "Finish return" };
  if (r?.status === "label_ready")
    return { ...base, why: "Your label is ready. Drop the package off.", group: "move", emoji: "🏷️", label: r.shipBy ? `Drop off by ${fmt(r.shipBy)}` : "Drop off", dueDate: r.shipBy, daysLeft: left(r.shipBy), href: v.action.href, actionLabel: "Show QR code" };
  if (r && (r.status === "shipped" || r.status === "received") && v.refund) {
    const by = v.refund.confirmed ? null : v.refund.expected?.by ?? null;
    const late = by != null && daysBetween(by, today) > 0;
    return late
      ? { ...base, estimated: true, why: "No refund email from the store yet.", group: "move", emoji: "💸", label: "Refund late", dueDate: by, daysLeft: left(by), href: v.action.href, actionLabel: "Follow up" }
      : { ...base, group: "waiting", emoji: "⏳", label: by ? `Refund expected ${fmt(by)}` : `${v.retailer.name} processing`, dueDate: by, daysLeft: left(by), href: v.action.href, actionLabel: "Track" };
  }
  if (r) return { ...base, group: "waiting", emoji: "⏳", label: r.submission.confirmedByRetailer ? "Waiting for label" : "Waiting for confirmation", dueDate: null, daysLeft: null, href: v.action.href, actionLabel: "View" };

  if (v.stage === "to_decide") {
    if (!dl) return { ...base, why: "We need the delivery date to set a deadline.", group: "move", emoji: "🔍", label: "Deadline unknown", dueDate: null, daysLeft: null, href: `/returns/purchase/?id=${v.order.id}`, actionLabel: "Add details" };
    return { ...base, estimated, why: "Last day to return it.", group: "move", emoji: "📦", label: `Decide by ${fmt(dl)}`, dueDate: dl, daysLeft: left(dl), href: v.action.href, actionLabel: "Start return" };
  }
  const total = v.order.items.reduce<number | null>((s, i) => (s == null || i.unitPrice == null ? null : s + i.unitPrice * i.quantity), 0);
  if (v.stage === "on_the_way") return { ...base, amount: total, group: "transit", emoji: "🚚", label: "On the way", dueDate: null, daysLeft: null, href: `/returns/purchase/?id=${v.order.id}`, actionLabel: "View" };
  const done = v.stage === "completed" ? "✅" : v.stage === "kept" ? "🛍️" : "🔒";
  return { ...base, amount: total, group: "history", emoji: done, label: v.status, dueDate: null, daysLeft: null, href: `/returns/purchase/?id=${v.order.id}`, actionLabel: "View" };
}

export function returnTasks(d: OrbitData, today: DateOnly): ReturnTask[] {
  return d.orders
    .map((o) => returnTask(d, orderView(d, o, today), today))
    .sort((a, b) => {
      const da = a.daysLeft ?? 999;
      const db = b.daysLeft ?? 999;
      return da - db || (b.amount ?? 0) - (a.amount ?? 0);
    });
}
