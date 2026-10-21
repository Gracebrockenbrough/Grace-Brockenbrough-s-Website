/**
 * Shopping Insights: awareness, not budgeting.
 *
 * Counting rules that keep the numbers honest:
 * - Purchases are item prices on orders dated in the range (before tax and shipping).
 * - Refunds count only when issued (store email or customer confirmation), on the issue date.
 * - Gift card and credit spending is shown separately and never subtracted, because those
 *   purchases are already counted once as purchases.
 */
import { addDays, daysBetween } from "../domain/dates";
import type { DateOnly, ItemCategory, OrderItem } from "../domain/types";
import { fromCents, mulMoney, toCents } from "../domain/money";
import { purchaseSource, retailerOf } from "../store/selectors";
import type { OrbitData } from "../store/state";

export type RangeKind = "month" | "quarter" | "year" | "custom";

export interface InsightRange {
  from: DateOnly;
  to: DateOnly;
}

export function rangeFor(kind: Exclude<RangeKind, "custom">, today: DateOnly): InsightRange {
  if (kind === "month") return { from: `${today.slice(0, 7)}-01`, to: today };
  if (kind === "quarter") {
    const q = Math.floor((Number(today.slice(5, 7)) - 1) / 3) * 3 + 1;
    return { from: `${today.slice(0, 4)}-${String(q).padStart(2, "0")}-01`, to: today };
  }
  return { from: `${today.slice(0, 4)}-01-01`, to: today };
}

/** Last day of the month containing `d`. */
function monthEnd(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/**
 * The comparable earlier period: the same stretch of the previous month, quarter or year
 * (Oct 1–21 compares with Sep 1–21), so an unfinished period isn't compared with a full one.
 */
export function previousPeriod(kind: RangeKind, r: InsightRange): InsightRange {
  if (kind === "custom") return previousRange(r);
  const back = kind === "month" ? 1 : kind === "quarter" ? 3 : 12;
  const shift = (d: DateOnly) => {
    const y = Number(d.slice(0, 4));
    const m = Number(d.slice(5, 7)) - back;
    const yy = y + Math.floor((m - 1) / 12);
    const mm = ((m - 1 + 1200) % 12) + 1;
    const day = Math.min(Number(d.slice(8)), monthEnd(yy, mm));
    return `${yy}-${String(mm).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  };
  return { from: shift(r.from), to: shift(r.to) };
}

/** Whether the period is still running (so totals are "so far"). */
export function isPartial(kind: RangeKind, r: InsightRange, today: DateOnly): boolean {
  if (kind === "custom") return r.to >= today;
  return r.to === today;
}

/** The same span immediately before, for "compared with last month". */
export function previousRange(r: InsightRange): InsightRange {
  const len = daysBetween(r.from, r.to);
  const to = addDays(r.from, -1);
  return { from: addDays(to, -len), to };
}

/** Monthly goals scaled to the period shown. null for custom ranges. */
export const goalMultiplier: Record<RangeKind, number | null> = { month: 1, quarter: 3, year: 12, custom: null };

export const categoryLabel: Record<ItemCategory, string> = {
  clothing: "Clothing",
  beauty: "Beauty",
  accessories: "Accessories",
  shoes: "Shoes",
  home: "Home",
  other: "Other",
};

export interface Insights {
  gross: number;
  orderCount: number;
  /** Items with no price in their email; not included in totals. */
  unpricedItems: number;
  /** Card/original-payment refunds the store issued in the period. */
  refundsToPayment: number;
  /** Of those, the ones you confirmed reached your account. */
  refundsReceived: number;
  /** Issued by the store but not yet confirmed by you. */
  refundsAwaitingConfirmation: number;
  /** Refunds given as store credit. Spendable only at that store; not cash. */
  refundsAsCredit: number;
  /** Net merchandise kept: purchases minus everything returned for a refund or credit. */
  net: number;
  /** Earliest purchase date Tote has for you, to explain coverage. */
  coverageFrom: DateOnly | null;
  creditSpent: number;
  byCategory: { key: string; label: string; amount: number }[];
  byRetailer: { key: string; label: string; amount: number }[];
  coverage: { label: string; count: number }[];
  /** Every priced item counted, so buckets and lists use exactly the same purchases. */
  purchases: { orderId: string; retailerId: string; date: DateOnly; item: OrderItem }[];
}

const inRange = (d: DateOnly | null, r: InsightRange) => d != null && d >= r.from && d <= r.to;
/** Accumulates in integer cents (see domain/money), returns dollars. */
const round = (cents: number) => fromCents(cents);

export function insights(d: OrbitData, range: InsightRange): Insights {
  const orders = d.orders.filter((o) => inRange(o.purchasedAt, range));
  const cat = new Map<string, number>();
  const ret = new Map<string, number>();
  let gross = 0;
  let unpriced = 0;
  const purchases: Insights["purchases"] = [];

  for (const o of orders) {
    for (const i of o.items) {
      if (i.unitPrice == null) {
        unpriced++;
        continue;
      }
      const v = toCents(mulMoney(i.unitPrice, i.quantity));
      gross += v;
      purchases.push({ orderId: o.id, retailerId: o.retailerId, date: o.purchasedAt!, item: i });
      cat.set(i.category, (cat.get(i.category) ?? 0) + v);
      ret.set(o.retailerId, (ret.get(o.retailerId) ?? 0) + v);
    }
  }

  let toPayment = 0;
  let received = 0;
  let asCredit = 0;
  for (const f of d.refunds) {
    if (!f.confirmed || !inRange(f.confirmed.at, range)) continue;
    const c = toCents(f.confirmed.amount);
    if (f.destination === "store_credit") asCredit += c;
    else {
      toPayment += c;
      if (f.arrivedAt || f.confirmed.by === "customer") received += c;
    }
  }

  const creditSpent = d.wallet.flatMap((w) => w.history).filter((h) => h.amount < 0 && inRange(h.at, range)).reduce((s, h) => s - toCents(h.amount), 0);

  const sources = new Map<string, number>();
  for (const o of orders) {
    const key = purchaseSource(d, o).label;
    sources.set(key, (sources.get(key) ?? 0) + 1);
  }

  const sorted = (m: Map<string, number>, label: (k: string) => string) =>
    [...m.entries()].map(([key, cents]) => ({ key, label: label(key), amount: round(cents) })).sort((a, b) => b.amount - a.amount);

  return {
    gross: round(gross),
    orderCount: orders.length,
    unpricedItems: unpriced,
    refundsToPayment: round(toPayment),
    refundsReceived: round(received),
    refundsAwaitingConfirmation: round(toPayment - received),
    refundsAsCredit: round(asCredit),
    net: round(gross - toPayment - asCredit),
    creditSpent: round(creditSpent),
    byCategory: sorted(cat, (k) => categoryLabel[k as ItemCategory] ?? k),
    byRetailer: sorted(ret, (k) => retailerOf(d, k).name),
    coverage: [...sources.entries()].map(([k, count]) => ({ label: k, count })),
    purchases,
    coverageFrom: d.orders.map((o) => o.purchasedAt).filter((x): x is DateOnly => Boolean(x)).sort()[0] ?? null,
  };
}

