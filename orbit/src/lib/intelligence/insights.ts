/**
 * Shopping Insights: awareness, not budgeting.
 *
 * Counting rules that keep the numbers honest:
 * - Purchases are item prices on orders dated in the range (before tax and shipping).
 * - Refunds count only when issued (store email or customer confirmation), on the issue date.
 * - Gift card and credit spending is shown separately and never subtracted, because those
 *   purchases are already counted once as purchases.
 */
import type { DateOnly, ItemCategory } from "../domain/types";
import { retailerOf } from "../store/selectors";
import type { OrbitData } from "../store/state";

export type RangeKind = "month" | "year" | "custom";

export interface InsightRange {
  from: DateOnly;
  to: DateOnly;
}

export function rangeFor(kind: Exclude<RangeKind, "custom">, today: DateOnly): InsightRange {
  return kind === "month" ? { from: `${today.slice(0, 7)}-01`, to: today } : { from: `${today.slice(0, 4)}-01-01`, to: today };
}

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
  refundsToPayment: number;
  refundsAsCredit: number;
  net: number;
  creditSpent: number;
  byCategory: { key: string; label: string; amount: number }[];
  byRetailer: { key: string; label: string; amount: number }[];
  coverage: { label: string; count: number }[];
}

const inRange = (d: DateOnly | null, r: InsightRange) => d != null && d >= r.from && d <= r.to;
const round = (n: number) => Math.round(n * 100) / 100;

const channelLabel: Record<string, string> = {
  sample_inbox: "Sample inbox (demo)",
  gmail: "Gmail",
  outlook: "Outlook",
  forwarded: "Forwarded emails",
  email_upload: "Emails you added",
  screenshot: "Receipts you uploaded",
  manual: "Added by you",
};

export function insights(d: OrbitData, range: InsightRange): Insights {
  const orders = d.orders.filter((o) => inRange(o.purchasedAt, range));
  const cat = new Map<string, number>();
  const ret = new Map<string, number>();
  let gross = 0;
  let unpriced = 0;

  for (const o of orders) {
    for (const i of o.items) {
      if (i.unitPrice == null) {
        unpriced++;
        continue;
      }
      const v = i.unitPrice * i.quantity;
      gross += v;
      cat.set(i.category, (cat.get(i.category) ?? 0) + v);
      ret.set(o.retailerId, (ret.get(o.retailerId) ?? 0) + v);
    }
  }

  let toPayment = 0;
  let asCredit = 0;
  for (const f of d.refunds) {
    if (!f.confirmed || !inRange(f.confirmed.at, range)) continue;
    if (f.destination === "store_credit") asCredit += f.confirmed.amount;
    else toPayment += f.confirmed.amount;
  }

  const creditSpent = d.wallet.flatMap((w) => w.history).filter((h) => h.amount < 0 && inRange(h.at, range)).reduce((s, h) => s - h.amount, 0);

  const sources = new Map<string, number>();
  for (const o of orders) {
    const channels = new Set(d.evidence.filter((e) => o.evidenceIds.includes(e.id)).map((e) => e.channel));
    const key = channels.size ? [...channels][0] : "manual";
    sources.set(key, (sources.get(key) ?? 0) + 1);
  }

  const sorted = (m: Map<string, number>, label: (k: string) => string) =>
    [...m.entries()].map(([key, amount]) => ({ key, label: label(key), amount: round(amount) })).sort((a, b) => b.amount - a.amount);

  return {
    gross: round(gross),
    orderCount: orders.length,
    unpricedItems: unpriced,
    refundsToPayment: round(toPayment),
    refundsAsCredit: round(asCredit),
    net: round(gross - toPayment - asCredit),
    creditSpent: round(creditSpent),
    byCategory: sorted(cat, (k) => categoryLabel[k as ItemCategory] ?? k),
    byRetailer: sorted(ret, (k) => retailerOf(d, k).name),
    coverage: [...sources.entries()].map(([k, count]) => ({ label: channelLabel[k] ?? k, count })),
  };
}

