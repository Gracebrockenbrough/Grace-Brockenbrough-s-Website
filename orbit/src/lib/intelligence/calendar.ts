/**
 * Calendar events, derived from the same records as everything else.
 * Change an order or return and its events change with it.
 */
import { addDays, daysBetween } from "../domain/dates";
import type { DateOnly } from "../domain/types";
import { orderHref, orderView, type Indicator } from "../store/selectors";
import type { OrbitData } from "../store/state";

export type EventKind = "decide_by" | "start_by" | "drop_off_by" | "delivered" | "return_started" | "refund_expected" | "refund_issued" | "credit_expires";

export interface CalendarEvent {
  id: string;
  date: DateOnly;
  kind: EventKind;
  retailerId: string;
  /** What it's about: the item, or the credit. */
  title: string;
  /** What happens on this date. */
  label: string;
  amount: number | null;
  /** How the date is known. */
  certainty: "confirmed" | "estimated" | "recorded";
  /** True for dates by which the customer must act. */
  deadline: boolean;
  indicator: Indicator;
  href: string;
}

export function calendarEvents(d: OrbitData, today: DateOnly): CalendarEvent[] {
  const out: CalendarEvent[] = [];

  for (const order of d.orders) {
    const v = orderView(d, order, today);
    const href = orderHref(order.id);

    if (!order.deliveredAt && order.expectedDeliveryAt)
      out.push({ id: `exp:${order.id}`, date: order.expectedDeliveryAt, kind: "delivered", retailerId: order.retailerId, title: v.title, label: "Expected delivery", amount: null, certainty: "estimated", deadline: false, indicator: "arriving", href });
    if (order.deliveredAt)
      out.push({ id: `del:${order.id}`, date: order.deliveredAt, kind: "delivered", retailerId: order.retailerId, title: v.title, label: "Delivered", amount: null, certainty: "recorded", deadline: false, indicator: "delivered", href });

    for (const a of v.items) {
      if (a.stage !== "to_decide" || !("date" in a.deadline)) continue;
      out.push({
        id: `decide:${order.id}:${a.item.id}`,
        date: a.deadline.date,
        kind: "decide_by",
        retailerId: order.retailerId,
        title: a.item.name,
        label: "Return decision due",
        amount: a.item.unitPrice,
        certainty: a.deadline.kind === "confirmed" ? "confirmed" : "estimated",
        deadline: true,
        indicator: "decide",
        href,
      });
    }

    for (const r of d.returns.filter((x) => x.orderId === order.id && x.status !== "cancelled")) {
      const names = order.items.filter((i) => r.itemIds.includes(i.id)).map((i) => i.name);
      const title = names[0] ? names[0] + (names.length > 1 ? ` + ${names.length - 1} more` : "") : "Return";
      const value = order.items.filter((i) => r.itemIds.includes(i.id)).reduce((s, i) => s + (i.unitPrice ?? 0) * i.quantity, 0) || null;
      const started = (r.submission.at ?? r.createdAt).slice(0, 10);
      out.push({ id: `start:${r.id}`, date: started, kind: "return_started", retailerId: order.retailerId, title, label: r.submission.at ? "Return submitted" : "Return prepared", amount: null, certainty: "recorded", deadline: false, indicator: "started", href });
      if (r.status === "prepared") {
        const dl = v.items.filter((a) => r.itemIds.includes(a.item.id)).map((a) => a.deadline).find((x) => "date" in x);
        if (dl && "date" in dl)
          out.push({ id: `startby:${r.id}`, date: dl.date, kind: "start_by", retailerId: order.retailerId, title, label: "Start return by", amount: value, certainty: dl.kind === "confirmed" ? "confirmed" : "estimated", deadline: true, indicator: "initiate", href });
      }
      if (r.status === "label_ready" && r.shipBy)
        out.push({ id: `drop:${r.id}`, date: r.shipBy, kind: "drop_off_by", retailerId: order.retailerId, title, label: "Drop-off deadline", amount: value, certainty: "confirmed", deadline: true, indicator: "drop_off", href: `/returns/label/?id=${r.id}` });
    }
  }

  for (const f of d.refunds) {
    const order = d.orders.find((o) => o.id === f.orderId);
    if (!order) continue;
    const title = orderView(d, order, today).title;
    const href = `/returns/refund/?id=${f.id}`;
    if (f.confirmed)
      out.push({ id: `issued:${f.id}`, date: f.confirmed.at, kind: "refund_issued", retailerId: order.retailerId, title, label: f.destination === "store_credit" ? "Store credit issued" : "Refund issued", amount: f.confirmed.amount, certainty: "recorded", deadline: false, indicator: "done", href });
    else if (f.expected?.by) {
      const overdue = daysBetween(f.expected.by, today) > 0;
      out.push({ id: `refund:${f.id}`, date: f.expected.by, kind: "refund_expected", retailerId: order.retailerId, title, label: overdue ? "Refund needs checking" : "Refund expected", amount: f.expected.amount, certainty: "estimated", deadline: false, indicator: overdue ? "refund_check" : "refund", href });
    }
  }

  for (const w of d.wallet) {
    if (w.expiration.kind !== "date") continue;
    out.push({ id: `credit:${w.id}`, date: w.expiration.date, kind: "credit_expires", retailerId: w.retailerId, title: w.type === "promotional_credit" ? "Promo credit" : "Store credit", label: "Credit expires", amount: w.balance, certainty: "confirmed", deadline: true, indicator: "credit", href: `/wallet/card/?id=${w.id}` });
  }

  return out.sort((a, b) => a.date.localeCompare(b.date) || Number(b.deadline) - Number(a.deadline));
}

export const eventsOn = (events: CalendarEvent[], date: DateOnly) => events.filter((e) => e.date === date);

/** Monday-start week containing `date`. */
export function weekOf(date: DateOnly): DateOnly[] {
  const dow = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
  const start = addDays(date, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
