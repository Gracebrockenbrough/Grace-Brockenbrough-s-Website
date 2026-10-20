/**
 * Notification Service (pure logic).
 *
 * Builds the to-do list: unfinished business where money is on the line.
 * Only deadlines, customer actions, late refunds, expiring credit and missing
 * information qualify. Promotions never do.
 *
 * Ordering: by due date (overdue first), then by the amount at stake.
 */
import { daysBetween, formatDate } from "../domain/dates";
import { countWord, orderTotal } from "../domain/format";
import type { DateOnly, NotificationPrefs } from "../domain/types";
import type { OrbitData } from "../store/state";
import type { Indicator } from "../store/selectors";
import { assessItem, type ItemAssessment } from "./returns";

export type PriorityKind = "return_deadline" | "drop_off" | "finish_return" | "refund_check" | "credit_expiring" | "missing_info";

export type Bucket = "overdue" | "soon" | "week" | "later" | "missing";

export interface Priority {
  /** Stable key, so a dismissed or already-sent reminder isn't repeated. */
  key: string;
  kind: PriorityKind;
  retailerId: string;
  title: string;
  /** One short line explaining the need. */
  status: string;
  /** The date this needs doing by. Past dates mean it's late. null = no date known. */
  dueDate: DateOnly | null;
  daysLeft: number | null;
  /** Purchase price at stake (not money owed). null = unknown. */
  amount: number | null;
  /** True when the date is the retailer's or ours to estimate; shown as "Estimated". */
  estimated: boolean;
  urgent: boolean;
  bucket: Bucket;
  action: { label: string; href: string };
  /** The record behind this to-do (order, refund or wallet card). */
  detailHref: string;
}

/** Plain-language type labels and the shared visual indicator for each kind of to-do. */
export const kindMeta: Record<PriorityKind, { indicator: Indicator; label: string; due: string }> = {
  return_deadline: { indicator: "decide", label: "Return decision", due: "Decide by" },
  drop_off: { indicator: "drop_off", label: "Ready for drop-off", due: "Drop off by" },
  finish_return: { indicator: "initiate", label: "Return needs initiating", due: "Start by" },
  refund_check: { indicator: "refund_check", label: "Refund needs checking", due: "Expected" },
  credit_expiring: { indicator: "credit", label: "Credit expiring", due: "Use by" },
  missing_info: { indicator: "unknown", label: "Deadline unknown", due: "" },
};

export const bucketMeta: Record<Bucket, { title: string; hint: string }> = {
  overdue: { title: "Overdue", hint: "Past the date. Act now." },
  soon: { title: "Next 3 days", hint: "Money you could lose soon." },
  week: { title: "This week", hint: "" },
  later: { title: "Later deadlines", hint: "" },
  missing: { title: "Deadline unknown", hint: "We need a detail before we can set a date." },
};

const BUCKET_ORDER: Bucket[] = ["overdue", "soon", "week", "later", "missing"];

/** How far ahead deadlines and expirations count as unfinished business. */
const DEADLINE_HORIZON = 30;
const CREDIT_HORIZON = 60;

export function bucketFor(daysLeft: number | null): Bucket {
  if (daysLeft == null) return "missing";
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 3) return "soon";
  if (daysLeft <= 7) return "week";
  return "later";
}

export function orderAssessments(data: OrbitData, orderId: string, today: DateOnly): ItemAssessment[] {
  const order = data.orders.find((o) => o.id === orderId);
  if (!order) return [];
  const policy = data.policies.find((p) => p.retailerId === order.retailerId) ?? null;
  return order.items.map((i) => assessItem(order, i, policy, data.returns, today));
}

type Draft = Omit<Priority, "bucket" | "urgent" | "daysLeft">;

export function buildPriorities(data: OrbitData, today: DateOnly, prefs: NotificationPrefs = data.prefs): Priority[] {
  const out: Draft[] = [];

  for (const order of data.orders) {
    const items = orderAssessments(data, order.id, today);
    const open = items.filter((i) => i.stage === "to_decide");

    if (prefs.returnDeadlines) {
      for (const a of open) {
        const dl = a.deadline;
        if ((dl.kind === "confirmed" || dl.kind === "estimated") && dl.daysLeft >= 0 && dl.daysLeft <= DEADLINE_HORIZON) {
          out.push({
            key: `deadline:${order.id}:${a.item.id}:${dl.date}`,
            kind: "return_deadline",
            retailerId: order.retailerId,
            title: a.item.name,
            status: dl.kind === "confirmed" ? "Last day to return it" : "Last day to return it (estimated)",
            dueDate: dl.date,
            amount: a.item.unitPrice == null ? null : a.item.unitPrice * a.item.quantity,
            estimated: dl.kind === "estimated",
            action: { label: "Prepare Return", href: `/returns/start/?order=${order.id}&item=${a.item.id}` },
            detailHref: `/returns/purchase/?id=${order.id}`,
          });
        }
      }

      // Unknown deadlines on recent orders: ask for the missing piece.
      const unknown = open.filter((a) => a.deadline.kind === "unknown");
      const recent = order.purchasedAt ? daysBetween(order.purchasedAt, today) <= 45 : true;
      if (unknown.length && recent) {
        out.push({
          key: `missing:${order.id}`,
          kind: "missing_info",
          retailerId: order.retailerId,
          title: unknown.length === 1 ? unknown[0].item.name : `${countWord(unknown.length)} items`,
          status: "Return deadline not confirmed",
          dueDate: null,
          amount: unknown.reduce((s, a) => s + (a.item.unitPrice ?? 0) * a.item.quantity, 0) || null,
          estimated: false,
          action: { label: "Add Details", href: `/returns/purchase/?id=${order.id}` },
          detailHref: `/returns/purchase/?id=${order.id}`,
        });
      }
    }
  }

  if (prefs.returnActions) {
    for (const r of data.returns) {
      const order = data.orders.find((o) => o.id === r.orderId);
      if (!order) continue;
      const names = order.items.filter((i) => r.itemIds.includes(i.id)).map((i) => i.name);
      const title = names.length === 1 ? names[0] : `${countWord(names.length)} items`;
      const amount = orderTotal(order, r.itemIds);
      if (r.status === "label_ready") {
        out.push({
          key: `label:${r.id}`,
          kind: "drop_off",
          retailerId: order.retailerId,
          title,
          status: r.shipBy ? "Label ready. Drop it off" : "Label ready. Drop it off when you can",
          dueDate: r.shipBy,
          amount,
          estimated: false,
          action: { label: r.artifacts.some((x) => x.kind === "qr_code") ? "Show QR Code" : "View Label", href: `/returns/label/?id=${r.id}` },
          detailHref: `/returns/purchase/?id=${order.id}`,
        });
      } else if (r.status === "prepared") {
        // The return window still applies until the retailer accepts the request.
        const deadline = orderAssessments(data, order.id, today)
          .filter((a) => r.itemIds.includes(a.item.id))
          .map((a) => a.deadline)
          .find((d) => d.kind === "confirmed" || d.kind === "estimated");
        out.push({
          key: `prepared:${r.id}`,
          kind: "finish_return",
          retailerId: order.retailerId,
          title,
          status: "Prepared, not sent to the store yet",
          dueDate: deadline && "date" in deadline ? deadline.date : null,
          amount,
          estimated: deadline?.kind === "estimated",
          action: { label: "Continue Return", href: `/returns/start/?return=${r.id}` },
          detailHref: `/returns/purchase/?id=${order.id}`,
        });
      }
    }
  }

  if (prefs.refunds) {
    for (const f of data.refunds) {
      if (f.confirmed || !f.expected?.by || daysBetween(f.expected.by, today) <= 0) continue;
      out.push({
        key: `refund:${f.id}:${f.expected.by}`,
        kind: "refund_check",
        retailerId: data.orders.find((o) => o.id === f.orderId)?.retailerId ?? "",
        title: (() => {
          const o = data.orders.find((x) => x.id === f.orderId);
          const r = data.returns.find((x) => x.id === f.returnId);
          const names = o?.items.filter((i) => !r || r.itemIds.includes(i.id)).map((i) => i.name) ?? [];
          return names.length ? names[0] + (names.length > 1 ? ` + ${names.length - 1} more` : "") : "Refund";
        })(),
        status: "No refund email yet. Check your statement first",
        dueDate: f.expected.by,
        amount: f.expected.amount,
        estimated: true,
        action: { label: "Check Refund", href: `/returns/refund/?id=${f.id}` },
        detailHref: `/returns/refund/?id=${f.id}`,
      });
    }
  }

  if (prefs.creditExpiry) {
    for (const w of data.wallet) {
      if (w.expiration.kind !== "date" || !w.balance) continue;
      const left = daysBetween(today, w.expiration.date);
      if (left < 0 || left > CREDIT_HORIZON) continue;
      out.push({
        key: `credit:${w.id}:${w.expiration.date}`,
        kind: "credit_expiring",
        retailerId: w.retailerId,
        title: w.type === "promotional_credit" ? "Promo credit" : "Store credit",
        status: "Expires if you don't use it",
        dueDate: w.expiration.date,
        amount: w.balance,
        estimated: false,
        action: { label: "View Credit", href: `/wallet/card/?id=${w.id}` },
        detailHref: `/wallet/card/?id=${w.id}`,
      });
    }
  }

  return out
    .filter((p) => !data.dismissed.includes(p.key))
    .map((p): Priority => {
      const daysLeft = p.dueDate ? daysBetween(today, p.dueDate) : null;
      return { ...p, daysLeft, bucket: bucketFor(daysLeft), urgent: daysLeft != null && daysLeft <= 3 };
    })
    .sort(
      (a, b) =>
        BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket) ||
        (a.daysLeft ?? 999) - (b.daysLeft ?? 999) ||
        (b.amount ?? 0) - (a.amount ?? 0),
    );
}

export function groupByBucket(list: Priority[]): { bucket: Bucket; items: Priority[] }[] {
  return BUCKET_ORDER.map((bucket) => ({ bucket, items: list.filter((p) => p.bucket === bucket) })).filter((g) => g.items.length);
}

/**
 * Potential return value: the purchase price of items you could still send back,
 * with a dated deadline in the next `days` days. It's what's at stake, not money owed.
 */
export function potentialReturnValue(list: Priority[], days = 14): { amount: number; count: number } {
  const relevant = list.filter((p) => (p.kind === "return_deadline" || p.kind === "drop_off" || p.kind === "finish_return") && p.daysLeft != null && p.daysLeft >= 0 && p.daysLeft <= days);
  return { amount: amountAtStake(relevant), count: new Set(relevant.map((p) => p.detailHref)).size };
}

/** Total money across to-dos. */
export function amountAtStake(list: Priority[]): number {
  return Math.round(list.reduce((s, p) => s + (p.amount ?? 0), 0) * 100) / 100;
}

/** "3 days", "Today", "4 days late", "Deadline unknown". Past refund dates read "4 days ago". */
export function dueText(p: { daysLeft: number | null; kind?: string }): string {
  const n = p.daysLeft;
  if (n == null) return "Deadline unknown";
  if (n < 0) {
    const d = n === -1 ? "1 day" : `${-n} days`;
    return p.kind === "refund_check" ? `${d} ago` : `${d} late`;
  }
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `${n} days`;
}

export function dueDateText(p: Pick<Priority, "dueDate" | "kind">, today: DateOnly): string | null {
  if (!p.dueDate) return null;
  return `${kindMeta[p.kind].due} ${formatDate(p.dueDate, today)}`.trim();
}

/** "Two returns need attention this week. One refund is pending." */
export function weeklySummary(data: OrbitData, today: DateOnly): string {
  const p = buildPriorities(data, today).filter((x) => x.daysLeft != null && x.daysLeft <= 7);
  const returns = p.filter((x) => x.kind === "return_deadline" || x.kind === "drop_off" || x.kind === "finish_return").length;
  const pendingRefunds = data.refunds.filter((f) => !f.confirmed && f.expected).length;
  const credits = p.filter((x) => x.kind === "credit_expiring").length;

  const parts: string[] = [];
  if (returns) parts.push(`${countWord(returns)} ${returns === 1 ? "return needs" : "returns need"} attention this week.`);
  if (pendingRefunds) parts.push(`${countWord(pendingRefunds)} ${pendingRefunds === 1 ? "refund is" : "refunds are"} pending.`);
  if (credits) parts.push(`${countWord(credits)} ${credits === 1 ? "credit expires" : "credits expire"} soon.`);
  return parts.length ? parts.join(" ") : "Nothing needs your attention this week.";
}

