/**
 * Return Intelligence Service (pure logic).
 *
 * Determines eligibility, deadlines and next steps from the evidence we hold.
 * Rule zero: never fabricate a deadline. If any input is missing, the answer is "unknown"
 * along with the reason, so the UI can say "Return deadline not confirmed."
 */
import { addDays, daysBetween } from "../domain/dates";
import type {
  DateOnly,
  DropOffKind,
  Order,
  OrderItem,
  RefundMethod,
  ReturnPolicy,
  ReturnRequest,
  ReturnStatus,
  Tri,
} from "../domain/types";

export type Deadline =
  | { kind: "confirmed"; date: DateOnly; daysLeft: number; evidenceId: string }
  | { kind: "estimated"; date: DateOnly; daysLeft: number; basis: string; staleAfter: DateOnly | null }
  | { kind: "not_started"; reason: string }
  | { kind: "unknown"; reason: string; missing: "policy" | "window" | "start_date" };

export type Eligibility = "eligible" | "ineligible" | "window_closed" | "unknown";

export type ItemStage = "on_the_way" | "to_decide" | "returning" | "completed" | "kept" | "not_returnable";

export interface ItemAssessment {
  item: OrderItem;
  deadline: Deadline;
  eligibility: Eligibility;
  /** Policy exceptions that apply to this item, in plain language. */
  notes: string[];
  activeReturn: ReturnRequest | null;
  stage: ItemStage;
}

const ACTIVE: ReturnStatus[] = ["prepared", "reported_submitted", "approval_pending", "label_ready", "shipped", "received"];

export function isActiveReturn(r: ReturnRequest): boolean {
  return ACTIVE.includes(r.status);
}

/** Policies older than this are still shown, but flagged for re-checking. */
export const POLICY_STALE_DAYS = 120;

function windowStartDate(order: Order, policy: ReturnPolicy): { date: DateOnly | null; label: string } {
  // In-store purchases start counting on the day of purchase.
  if (order.channel === "in_store") return { date: order.purchasedAt, label: "purchase" };
  switch (policy.windowStartsAt) {
    case "delivery":
      return { date: order.deliveredAt, label: "delivery" };
    case "purchase":
      return { date: order.purchasedAt, label: "purchase" };
    case "shipment":
      return { date: order.shippedAt, label: "shipment" };
    default:
      return { date: null, label: "unknown" };
  }
}

function windowDaysFor(item: OrderItem, policy: ReturnPolicy, inStore = false): number | null {
  const shorter = policy.exceptions.find((e) => e.kind === "shorter_window" && e.category === item.category && e.windowDays);
  if (shorter?.windowDays) return shorter.windowDays;
  if (inStore) return policy.inStore?.windowDays ?? policy.windowDays;
  return policy.windowDays;
}

export function assessDeadline(order: Order, item: OrderItem, policy: ReturnPolicy | null, today: DateOnly): Deadline {
  // A deadline the retailer told the customer beats any calculation.
  if (order.statedReturnDeadline) {
    const { date, evidenceId } = order.statedReturnDeadline;
    return { kind: "confirmed", date, daysLeft: daysBetween(today, date), evidenceId };
  }
  if (!policy) return { kind: "unknown", reason: "We don't have this retailer's return policy yet.", missing: "policy" };

  const inStore = order.channel === "in_store";
  if (inStore && policy.inStore?.accepted === false) return { kind: "unknown", reason: "This store doesn't list in-store returns.", missing: "window" };
  const days = windowDaysFor(item, policy, inStore);
  if (days == null || (policy.windowStartsAt === "unknown" && !inStore)) {
    return { kind: "unknown", reason: "The retailer's return window isn't clear.", missing: "window" };
  }

  const start = windowStartDate(order, policy);
  if (!start.date) {
    if (policy.windowStartsAt === "delivery" && (order.shipmentStatus === "ordered" || order.shipmentStatus === "shipped")) {
      return { kind: "not_started", reason: "Your return window starts when this order is delivered." };
    }
    return {
      kind: "unknown",
      reason: `We need the ${start.label} date to work out the deadline.`,
      missing: "start_date",
    };
  }

  const date = addDays(start.date, days);
  const staleAfter = addDays(policy.lastCheckedAt, POLICY_STALE_DAYS);
  return {
    kind: "estimated",
    date,
    daysLeft: daysBetween(today, date),
    basis: `${days} days from ${start.label}${inStore ? " (in-store rules)" : ""}, per the policy last checked ${policy.lastCheckedAt}`,
    staleAfter: daysBetween(staleAfter, today) > 0 ? staleAfter : null,
  };
}

export function assessItem(
  order: Order,
  item: OrderItem,
  policy: ReturnPolicy | null,
  returns: ReturnRequest[],
  today: DateOnly,
): ItemAssessment {
  const deadline = assessDeadline(order, item, policy, today);
  const forItem = returns.filter((r) => r.orderId === order.id && r.itemIds.includes(item.id) && r.status !== "cancelled");
  const activeReturn = forItem.find(isActiveReturn) ?? null;
  const completed = forItem.find((r) => r.status === "completed");

  const notes: string[] = [];
  for (const e of policy?.exceptions ?? []) {
    if (e.category && e.category !== item.category) continue;
    if (e.kind === "final_sale" && item.finalSale === false) continue;
    notes.push(e.description);
  }

  let eligibility: Eligibility;
  if (item.finalSale === true) eligibility = "ineligible";
  else if ((deadline.kind === "confirmed" || deadline.kind === "estimated") && deadline.daysLeft < 0) eligibility = "window_closed";
  else if (deadline.kind === "unknown") eligibility = "unknown";
  else eligibility = "eligible";

  let stage: ItemStage;
  if (activeReturn) stage = "returning";
  else if (completed) stage = "completed";
  else if (order.keptItemIds.includes(item.id)) stage = "kept";
  else if (deadline.kind === "not_started") stage = "on_the_way";
  else if (eligibility === "ineligible" || eligibility === "window_closed") stage = "not_returnable";
  else stage = "to_decide";

  return { item, deadline, eligibility, notes, activeReturn, stage };
}

export type OrderStage = ItemStage;

/** The most actionable stage across an order's items. */
export function orderStage(items: ItemAssessment[]): OrderStage {
  const order: OrderStage[] = ["returning", "to_decide", "on_the_way", "completed", "kept", "not_returnable"];
  for (const s of order) if (items.some((i) => i.stage === s)) return s;
  return "kept";
}

/** Earliest open deadline among items still to decide. */
export function soonestDeadline(items: ItemAssessment[]): Deadline | null {
  const open = items.filter((i) => i.stage === "to_decide");
  const dated = open
    .map((i) => i.deadline)
    .filter((d): d is Extract<Deadline, { daysLeft: number }> => d.kind === "confirmed" || d.kind === "estimated")
    .sort((a, b) => a.daysLeft - b.daysLeft);
  if (dated[0]) return dated[0];
  return open.find((i) => i.deadline.kind === "unknown")?.deadline ?? null;
}

// ─── Return facts (what the customer needs to know) ─────────────────────

export interface ReturnFacts {
  boxRequired: Tri;
  printingRequired: Tri;
  qrCodeAvailable: Tri;
  dropOff: DropOffKind[];
  /** Fee for the chosen combination. null = unknown. */
  fee: number | null;
  refundTo: RefundMethod | null;
  refundOptions: RefundMethod[];
  approvalRequired: Tri;
  refundTimelineDays: number | null;
}

export function returnFacts(policy: ReturnPolicy | null, choice: { dropOff: DropOffKind | null; refund: RefundMethod | null }): ReturnFacts {
  if (!policy) {
    return {
      boxRequired: null,
      printingRequired: null,
      qrCodeAvailable: null,
      dropOff: [],
      fee: null,
      refundTo: choice.refund,
      refundOptions: [],
      approvalRequired: null,
      refundTimelineDays: null,
    };
  }
  const refundTo = choice.refund ?? policy.refundMethods[0] ?? null;
  const inStore = choice.dropOff === "store" || choice.dropOff === "happy_returns";
  let fee = inStore ? policy.fees.inStore : policy.fees.mail;
  if (refundTo === "store_credit" && policy.fees.waivedForStoreCredit === true) fee = 0;

  return {
    boxRequired: choice.dropOff === "happy_returns" ? false : policy.shipping.boxRequired,
    printingRequired: policy.shipping.qrCodeAvailable === true ? false : policy.shipping.printingRequired,
    qrCodeAvailable: policy.shipping.qrCodeAvailable,
    dropOff: policy.dropOff,
    fee,
    refundTo,
    refundOptions: policy.refundMethods,
    approvalRequired: policy.approvalRequired,
    refundTimelineDays: policy.refundTimelineDays,
  };
}

/** Expected refund date from the retailer's typical timeline. Returns null when we can't say. */
export function expectedRefundBy(receivedAt: DateOnly | null, policy: ReturnPolicy | null): DateOnly | null {
  if (!receivedAt || !policy?.refundTimelineDays) return null;
  return addDays(receivedAt, policy.refundTimelineDays);
}

// ─── The three return dates ─────────────────────────────────────────────

/** One step's deadline. "done" once the step is behind the customer. */
export type StepDeadline =
  | { kind: "confirmed"; date: DateOnly; daysLeft: number; basis: string }
  | { kind: "estimated"; date: DateOnly; daysLeft: number; basis: string }
  | { kind: "done"; basis: string }
  | { kind: "none"; basis: string }
  | { kind: "pending"; basis: string };

export interface ReturnDeadlines {
  /** 1. Start the return (the return window). */
  start: StepDeadline;
  /** 2. Get approval or create the label. */
  label: StepDeadline;
  /** 3. Ship or drop off. */
  ship: StepDeadline;
}

const dated = (kind: "confirmed" | "estimated", date: DateOnly, today: DateOnly, basis: string): StepDeadline => ({ kind, date, daysLeft: daysBetween(today, date), basis });

const SUBMITTED: ReturnStatus[] = ["reported_submitted", "approval_pending", "label_ready", "shipped", "received", "completed"];
const LABELED: ReturnStatus[] = ["label_ready", "shipped", "received", "completed"];
const SHIPPED: ReturnStatus[] = ["shipped", "received", "completed"];

/**
 * Keeps the three dates apart instead of collapsing them into one "due date". Each comes
 * from the retailer when they stated it (confirmed), from the policy (estimated), or is
 * honestly marked as not applying or not known.
 */
export function returnDeadlines(start: Deadline, request: ReturnRequest | null, policy: ReturnPolicy | null, today: DateOnly): ReturnDeadlines {
  const status = request?.status ?? null;

  const startStep: StepDeadline =
    status && SUBMITTED.includes(status)
      ? { kind: "done", basis: "You started the return." }
      : start.kind === "confirmed"
        ? dated("confirmed", start.date, today, "Stated by the retailer")
        : start.kind === "estimated"
          ? dated("estimated", start.date, today, start.basis)
          : start.kind === "not_started"
            ? { kind: "pending", basis: start.reason }
            : { kind: "none", basis: start.reason };

  let label: StepDeadline;
  if (status && LABELED.includes(status)) label = { kind: "done", basis: "Label or QR code issued." };
  else if (policy?.labelWithinDays == null) label = { kind: "none", basis: policy?.approvalRequired ? "Approval needed; the retailer doesn't state a time limit." : "No separate deadline. The label comes when you start the return." };
  else if (request?.submission.at && status && SUBMITTED.includes(status)) {
    label = dated("estimated", addDays(request.submission.at.slice(0, 10), policy.labelWithinDays), today, `${policy.labelWithinDays} days after you started, per the policy`);
  } else label = { kind: "pending", basis: `Within ${policy.labelWithinDays} days of starting the return.` };

  let ship: StepDeadline;
  if (status && SHIPPED.includes(status)) ship = { kind: "done", basis: "Dropped off." };
  else if (request?.shipBy) ship = dated("confirmed", request.shipBy, today, "Stated by the retailer");
  else if (policy?.shipWithinDays != null) {
    const labeledAt = request?.history.find((h) => h.status === "label_ready")?.at ?? (status && SUBMITTED.includes(status) ? request?.submission.at : null);
    ship = labeledAt
      ? dated("estimated", addDays(labeledAt.slice(0, 10), policy.shipWithinDays), today, `${policy.shipWithinDays} days after the return started, per the policy`)
      : { kind: "pending", basis: `Within ${policy.shipWithinDays} days of starting the return.` };
  } else ship = { kind: "none", basis: "No separate ship-by date known." };

  return { start: startStep, label, ship };
}
