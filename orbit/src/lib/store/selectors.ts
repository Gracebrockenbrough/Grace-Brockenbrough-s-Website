import { daysBetween } from "../domain/dates";
import type { DateOnly, Order, Refund, Retailer, ReturnPolicy, ReturnRequest, WalletItem } from "../domain/types";
import { assessItem, isActiveReturn, orderStage, soonestDeadline, type Deadline, type ItemAssessment, type OrderStage } from "../intelligence/returns";
import { needsVerification } from "../services/balances";
import type { OrbitData } from "./state";

export const retailerOf = (d: OrbitData, id: string): Retailer =>
  d.retailers.find((r) => r.id === id) ?? { id, name: "Unknown retailer", websiteUrl: "", returnsUrl: "", supportUrl: "", balanceCheckUrl: null, returnCapability: "guided", giftPartner: false, tone: "slate" };

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
