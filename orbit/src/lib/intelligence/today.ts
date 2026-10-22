/**
 * Today's plan, in one place so every count agrees: what needs the customer now,
 * what's coming up later, and what Penny is simply watching.
 */
import type { DateOnly } from "../domain/types";
import { orderViews } from "../store/selectors";
import type { OrbitData } from "../store/state";
import { calendarEvents, type CalendarEvent, type EventKind } from "./calendar";
import { buildPriorities, type Priority, type PriorityKind } from "./priorities";

/** Kinds that ask the customer to do something. Everything else is tracking. */
export const ACTION_KINDS: PriorityKind[] = ["return_deadline", "drop_off", "finish_return", "refund_check", "refund_arrival", "refund_missing", "credit_expiring", "missing_info"];

/** "This week" for the headline: overdue, due within 7 days, or undated but waiting on the customer. */
export const SOON_DAYS = 7;

export interface TodayPlan {
  /** Needs the customer within a week (or now, with no date). Sorted most urgent first. */
  now: Priority[];
  /** Needs the customer, but later than a week out. */
  later: Priority[];
  /** Orders Penny is tracking with nothing for the customer to do: arriving, in transit, awaiting the store. */
  watching: { orderId: string; label: string; title: string; retailerId: string; href: string }[];
  /** The next dated events from today on, chronologically. */
  agenda: CalendarEvent[];
}

const FUTURE_KINDS: EventKind[] = ["decide_by", "start_by", "drop_off_by", "delivered", "refund_expected", "credit_expires"];

export function todayPlan(d: OrbitData, today: DateOnly, agendaSize = 5): TodayPlan {
  const all = buildPriorities(d, today);
  const actions = all.filter((p) => ACTION_KINDS.includes(p.kind));
  const now = actions.filter((p) => p.daysLeft == null || p.daysLeft <= SOON_DAYS);
  const later = actions.filter((p) => p.daysLeft != null && p.daysLeft > SOON_DAYS);

  const watching = orderViews(d, today)
    .filter((v) => v.current.group === "awaiting" || v.current.group === "not_delivered")
    .map((v) => ({ orderId: v.order.id, label: v.current.label, title: v.title, retailerId: v.order.retailerId, href: `/returns/purchase/?id=${v.order.id}` }));

  // Upcoming only: past "delivered" records are history, not agenda. Expected deliveries count.
  const agenda = calendarEvents(d, today)
    .filter((e) => e.date >= today && FUTURE_KINDS.includes(e.kind) && !(e.kind === "delivered" && e.certainty === "recorded"))
    .slice(0, agendaSize);

  return { now, later, watching, agenda };
}

/** Event-type color keys (see --color-ev-* tokens). Type, not urgency; always shown with a label. */
export type EventTone = "return" | "dropoff" | "delivery" | "refund" | "credit";

export function eventTone(kind: EventKind): EventTone {
  if (kind === "drop_off_by") return "dropoff";
  if (kind === "delivered") return "delivery";
  if (kind === "refund_expected" || kind === "refund_issued") return "refund";
  if (kind === "credit_expires") return "credit";
  return "return";
}

export const eventToneLabel: Record<EventTone, string> = {
  return: "Return deadline",
  dropoff: "Drop-off",
  delivery: "Delivery",
  refund: "Refund",
  credit: "Credit expires",
};
