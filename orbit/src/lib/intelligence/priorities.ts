/**
 * Notification Service (pure logic).
 *
 * Produces a short, ranked list of things that genuinely need attention.
 * Only deadlines, customer actions, refund problems and credit expirations qualify.
 * Promotions never do.
 */
import { daysBetween, formatDate, relativeDays } from "../domain/dates";
import { countWord, money, orderTotal } from "../domain/format";
import type { DateOnly, NotificationPrefs } from "../domain/types";
import type { OrbitData } from "../store/state";
import { assessItem, type ItemAssessment } from "./returns";

export type PriorityKind = "return_deadline" | "return_action" | "refund_attention" | "credit_expiring" | "missing_info";

export interface Priority {
  /** Stable key, so a dismissed or already-sent reminder isn't repeated. */
  key: string;
  kind: PriorityKind;
  retailerId: string;
  title: string;
  status: string;
  urgent: boolean;
  /** Lower is more important. */
  score: number;
  action: { label: string; href: string };
}

/** How far ahead deadlines and expirations count as "needs attention". */
const DEADLINE_HORIZON = 7;
const CREDIT_HORIZON = 30;

export function orderAssessments(data: OrbitData, orderId: string, today: DateOnly): ItemAssessment[] {
  const order = data.orders.find((o) => o.id === orderId);
  if (!order) return [];
  const policy = data.policies.find((p) => p.retailerId === order.retailerId) ?? null;
  return order.items.map((i) => assessItem(order, i, policy, data.returns, today));
}

export function buildPriorities(data: OrbitData, today: DateOnly, prefs: NotificationPrefs = data.prefs): Priority[] {
  const out: Priority[] = [];

  for (const order of data.orders) {
    const items = orderAssessments(data, order.id, today);
    const open = items.filter((i) => i.stage === "to_decide");

    // Imminent return deadlines.
    if (prefs.returnDeadlines) {
      for (const a of open) {
        const dl = a.deadline;
        if ((dl.kind === "confirmed" || dl.kind === "estimated") && dl.daysLeft >= 0 && dl.daysLeft <= Math.max(DEADLINE_HORIZON, prefs.leadDays)) {
          const est = dl.kind === "estimated" ? " (estimated)" : "";
          out.push({
            key: `deadline:${order.id}:${a.item.id}:${dl.date}`,
            kind: "return_deadline",
            retailerId: order.retailerId,
            title: `${a.item.name} · ${money(a.item.unitPrice)}`,
            status: dl.daysLeft === 0 ? `Return deadline is today${est}` : `Return deadline ${relativeDays(dl.date, today)}${est}`,
            urgent: dl.daysLeft <= 3,
            score: dl.daysLeft,
            action: { label: "Prepare Return", href: `/returns/start/?order=${order.id}&item=${a.item.id}` },
          });
        }
      }
    }

    // Unknown deadlines on recent orders: ask for the missing piece, gently.
    if (prefs.returnDeadlines) {
      const unknown = open.find((a) => a.deadline.kind === "unknown");
      const recent = order.purchasedAt ? daysBetween(order.purchasedAt, today) <= 45 : true;
      if (unknown && recent) {
        out.push({
          key: `missing:${order.id}`,
          kind: "missing_info",
          retailerId: order.retailerId,
          title: `${unknown.item.name} · ${money(unknown.item.unitPrice)}`,
          status: "Return deadline not confirmed",
          urgent: false,
          score: 20,
          action: { label: "Review Details", href: `/returns/purchase/?id=${order.id}` },
        });
      }
    }
  }

  // Returns that need the customer to do something.
  if (prefs.returnActions) {
    for (const r of data.returns) {
      const order = data.orders.find((o) => o.id === r.orderId);
      if (!order) continue;
      const names = order.items.filter((i) => r.itemIds.includes(i.id)).map((i) => i.name);
      const title = names.length === 1 ? names[0] : `${countWord(names.length)} items`;
      if (r.status === "label_ready") {
        const left = r.shipBy ? daysBetween(today, r.shipBy) : null;
        out.push({
          key: `label:${r.id}`,
          kind: "return_action",
          retailerId: order.retailerId,
          title: `${title} · ${money(orderTotal(order, r.itemIds))}`,
          status: r.shipBy ? `Drop off by ${formatDate(r.shipBy, today)}` : "Label ready. Drop off when you can",
          urgent: left != null && left <= 2,
          score: left ?? 10,
          action: { label: "View QR Code", href: `/returns/label/?id=${r.id}` },
        });
      } else if (r.status === "prepared") {
        out.push({
          key: `prepared:${r.id}`,
          kind: "return_action",
          retailerId: order.retailerId,
          title: `${title} · ${money(orderTotal(order, r.itemIds))}`,
          status: "Return prepared, not submitted yet",
          urgent: false,
          score: 4,
          action: { label: "Continue Return", href: `/returns/start/?return=${r.id}` },
        });
      }
    }
  }

  // Refunds that are late.
  if (prefs.refunds) {
    for (const f of data.refunds) {
      if (f.confirmed || !f.expected?.by) continue;
      const late = daysBetween(f.expected.by, today);
      if (late <= 0) continue;
      out.push({
        key: `refund:${f.id}:${f.expected.by}`,
        kind: "refund_attention",
        retailerId: data.orders.find((o) => o.id === f.orderId)?.retailerId ?? "",
        title: `Refund · ${money(f.expected.amount)}`,
        status: `Expected ${late === 1 ? "yesterday" : `${late} days ago`}. Not received yet`,
        urgent: true,
        score: 3.5,
        action: { label: "Track Refund", href: `/returns/refund/?id=${f.id}` },
      });
    }
  }

  // Credits about to expire.
  if (prefs.creditExpiry) {
    for (const w of data.wallet) {
      if (w.expiration.kind !== "date" || !w.balance) continue;
      const left = daysBetween(today, w.expiration.date);
      if (left < 0 || left > CREDIT_HORIZON) continue;
      out.push({
        key: `credit:${w.id}:${w.expiration.date}`,
        kind: "credit_expiring",
        retailerId: w.retailerId,
        title: `Store credit · ${money(w.balance)}`,
        status: left === 0 ? "Expires today" : `Expires ${relativeDays(w.expiration.date, today)}`,
        urgent: left <= 7,
        score: left + 3,
        action: { label: "View Credit", href: `/wallet/card/?id=${w.id}` },
      });
    }
  }

  return out.filter((p) => !data.dismissed.includes(p.key)).sort((a, b) => a.score - b.score);
}

/** "Two returns need attention this week. One refund is pending." */
export function weeklySummary(data: OrbitData, today: DateOnly): string {
  const p = buildPriorities(data, today);
  const returns = p.filter((x) => x.kind === "return_deadline" || x.kind === "return_action").length;
  const pendingRefunds = data.refunds.filter((f) => !f.confirmed && f.expected).length;
  const credits = p.filter((x) => x.kind === "credit_expiring").length;

  const parts: string[] = [];
  if (returns) parts.push(`${countWord(returns)} ${returns === 1 ? "return needs" : "returns need"} attention this week.`);
  if (pendingRefunds) parts.push(`${countWord(pendingRefunds)} ${pendingRefunds === 1 ? "refund is" : "refunds are"} pending.`);
  if (credits) parts.push(`${countWord(credits)} ${credits === 1 ? "credit expires" : "credits expire"} soon.`);
  return parts.length ? parts.join(" ") : "Nothing needs your attention this week.";
}
