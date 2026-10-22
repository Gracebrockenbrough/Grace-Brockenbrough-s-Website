/**
 * Order journey: Purchased → Shipped → Delivered → (Return started → Label → Dropped off →
 * Received → Refund issued → Refund confirmed) or (Keeping it). Only stages that apply
 * are shown. Each milestone says how it's known: from the store's email, from you, or estimated.
 */
import type { DateOnly, Evidence } from "../domain/types";
import type { OrderView } from "../store/selectors";
import type { OrbitData } from "../store/state";

export type MilestoneState = "done" | "estimated" | "upcoming";

export interface Milestone {
  key: string;
  label: string;
  date: DateOnly | null;
  state: MilestoneState;
  /** How Penny knows, in plain words. */
  source: string;
  href?: string;
}

const evidenceTitle = (d: OrbitData, id: string | undefined | null) => {
  const e: Evidence | undefined = id ? d.evidence.find((x) => x.id === id) : undefined;
  return e ? `From “${e.title}”` : null;
};

const histAt = (h: { at: string; status: string }[], status: string) => h.find((x) => x.status === status)?.at.slice(0, 10) ?? null;

export function orderJourney(d: OrbitData, v: OrderView): Milestone[] {
  const o = v.order;
  const out: Milestone[] = [];
  const src = (field: keyof typeof o.fieldSources, fallback: string) => {
    const f = o.fieldSources[field];
    if (f?.method === "user") return "Added by you";
    return evidenceTitle(d, f?.evidenceId) ?? fallback;
  };

  out.push({ key: "purchased", label: o.channel === "in_store" ? "Bought in store" : "Purchased", date: o.purchasedAt, state: "done", source: src("purchasedAt", "From your order record") });

  if (o.channel !== "in_store") {
    if (o.shippedAt || o.deliveredAt) out.push({ key: "shipped", label: "Shipped", date: o.shippedAt, state: "done", source: o.shippedAt ? src("shippedAt", "From a shipping email") : "Date not in your emails" });
    else out.push({ key: "shipped", label: "Shipped", date: null, state: "upcoming", source: "Waiting for a shipping email" });

    if (o.deliveredAt) out.push({ key: "delivered", label: "Delivered", date: o.deliveredAt, state: "done", source: src("deliveredAt", "From a delivery email") });
    else if (o.expectedDeliveryAt) out.push({ key: "delivered", label: "Arriving", date: o.expectedDeliveryAt, state: "estimated", source: "The store's estimate" });
    else out.push({ key: "delivered", label: "Delivered", date: null, state: "upcoming", source: "Not confirmed yet" });
  }

  const r = v.activeReturn ?? v.latestReturn;
  const keptAll = o.items.length > 0 && o.items.every((i) => o.keptItemIds.includes(i.id));

  if (!r) {
    if (keptAll) out.push({ key: "kept", label: "Keeping it", date: null, state: "done", source: "You decided to keep it" });
    else if (v.deadline && (v.deadline.kind === "confirmed" || v.deadline.kind === "estimated"))
      out.push({
        key: "window",
        label: v.deadline.daysLeft < 0 ? "Return window closed" : "Return window closes",
        date: v.deadline.date,
        state: v.deadline.daysLeft < 0 ? "done" : v.deadline.kind === "confirmed" ? "upcoming" : "estimated",
        source: v.deadline.kind === "confirmed" ? "Stated by the store" : "Estimated from the store's policy",
      });
    return out;
  }

  const s = r.status;
  const past = (states: string[]) => states.includes(s);
  out.push({
    key: "started",
    label: r.submission.at ? "Return started" : "Return prepared",
    date: (r.submission.at ?? r.createdAt).slice(0, 10),
    state: "done",
    source: r.submission.confirmedByRetailer ? evidenceTitle(d, r.submission.confirmationEvidenceId) ?? "Confirmed by the store" : r.submission.at ? "You told us you submitted it" : "Prepared in Penny. Not sent to the store",
  });
  if (s === "cancelled") return [...out, { key: "cancelled", label: "Return cancelled", date: null, state: "done", source: "You cancelled it" }];

  if (r.artifacts.length || past(["label_ready", "shipped", "received", "completed"]))
    out.push({ key: "label", label: "Label ready", date: histAt(r.history, "label_ready"), state: "done", source: r.artifacts[0] ? evidenceTitle(d, r.artifacts[0].evidenceId) ?? "Saved by you" : "From the store", href: `/returns/kit/?id=${r.id}` });

  if (past(["shipped", "received", "completed"])) out.push({ key: "dropped", label: "Dropped off", date: histAt(r.history, "shipped"), state: "done", source: r.returnTracking ? `Tracking ${r.returnTracking.number}` : "You marked it dropped off" });
  else out.push({ key: "dropped", label: "Drop off", date: r.shipBy, state: r.shipBy ? "upcoming" : "upcoming", source: r.shipBy ? "Ship-by date from the store" : "After you have the label", href: `/returns/kit/?id=${r.id}` });

  if (past(["received", "completed"])) out.push({ key: "received", label: "Store received it", date: histAt(r.history, "received"), state: "done", source: "From the store's email" });

  const f = v.refund;
  const credit = f?.destination === "store_credit";
  if (f?.confirmed) {
    out.push({ key: "issued", label: credit ? "Store credit issued" : "Refund issued", date: f.confirmed.at, state: "done", source: f.confirmed.by === "retailer_email" ? evidenceTitle(d, f.confirmed.evidenceId) ?? "From the store's email" : "You confirmed it", href: `/returns/refund/?id=${f.id}` });
  } else {
    out.push({ key: "issued", label: credit ? "Store credit" : "Refund issued", date: f?.expected?.by ?? null, state: f?.expected?.by ? "estimated" : "upcoming", source: f?.expected?.basis ?? "We'll see it in the store's email", href: f ? `/returns/refund/?id=${f.id}` : undefined });
  }
  if (!credit) {
    if (f?.arrivedAt) out.push({ key: "arrived", label: "Refund received", date: f.arrivedAt, state: "done", source: "You confirmed it arrived", href: `/returns/refund/?id=${f.id}` });
    else out.push({ key: "arrived", label: "Refund received", date: null, state: "upcoming", source: "Only you can confirm this. Penny never sees your bank", href: f ? `/returns/refund/?id=${f.id}` : undefined });
  }
  return out;
}
