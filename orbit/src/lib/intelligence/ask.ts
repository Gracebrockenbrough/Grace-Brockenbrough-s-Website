/**
 * Ask Orbit: find purchases and credits from everyday descriptions.
 *
 * "I think I ordered a red dress from somewhere, when do I return it?" works
 * without an order number. This prototype matches on-device against item names,
 * colors, categories, stores and dates. Production adds an AI step that rewrites
 * the question into the same structured query; answers still come only from the
 * customer's own records, never from the model's imagination.
 */
import { daysBetween, formatDate } from "../domain/dates";
import { creditTypeLabel, money } from "../domain/format";
import type { DateOnly, ItemCategory } from "../domain/types";
import { orderView, retailerOf, type OrderView } from "../store/selectors";
import { categoryLabel, insights, rangeFor } from "./insights";
import { buildPriorities, dueDateText, kindMeta } from "./priorities";
import type { OrbitData } from "../store/state";

export type AskIntent = "deadline" | "return" | "label" | "refund" | "credit" | "find" | "agenda" | "spend";

export interface AskAction {
  label: string;
  href: string;
}

export interface AskResult {
  id: string;
  kind: "item" | "credit";
  retailerId: string;
  title: string;
  /** The record this result is about. */
  href: string;
  /** The plain-language answer. */
  answer: string;
  /** Extra context, e.g. why this is only a close match. */
  note: string | null;
  actions: AskAction[];
  score: number;
}

const STOP = new Set(
  "i im i'm a an the my me it its this that from at in on of for to and or but so some something somewhere think thought ordered order bought got get got want wanted need do does did when what where which how is was be can could would should please there thing stuff place store shop".split(
    " ",
  ),
);

const COLORS: Record<string, string[]> = {
  black: ["black", "noir"],
  white: ["white", "ivory", "ecru", "cream"],
  red: ["red", "burgundy", "wine"],
  pink: ["pink", "rose", "blush"],
  blue: ["blue", "indigo", "navy", "denim"],
  green: ["green", "olive", "sage"],
  grey: ["grey", "gray", "heather", "charcoal"],
  beige: ["beige", "oat", "camel", "tan", "sand", "khaki"],
  brown: ["brown", "chocolate"],
};

/** Words people use → words that appear in product names. */
const NOUNS: Record<string, string[]> = {
  dress: ["dress", "gown", "frock"],
  sweater: ["sweater", "jumper", "knit", "cardigan", "crewneck", "pullover"],
  jean: ["jean", "jeans", "denim"],
  pant: ["pant", "pants", "trousers", "slacks"],
  blazer: ["blazer", "jacket", "suit"],
  scarf: ["scarf"],
  shirt: ["shirt", "button", "blouse", "top", "tee"],
  belt: ["belt"],
  shoe: ["shoe", "shoes", "flat", "flats", "heel", "heels", "sneaker", "sneakers", "glove", "loafer", "loafers"],
  serum: ["serum", "skincare", "moisturizer", "cream"],
  blush: ["blush", "makeup", "cheek"],
};

const CATEGORY_WORDS: Record<ItemCategory, string[]> = {
  clothing: ["clothes", "clothing", "outfit"],
  beauty: ["beauty", "makeup", "skincare", "cosmetics"],
  accessories: ["accessory", "accessories"],
  shoes: ["shoes", "shoe", "footwear"],
  home: ["home"],
  other: [],
};

const tokenize = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9&'\s.-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^'+|'+$/g, ""))
    .filter((w) => w && !STOP.has(w));

const colorOf = (word: string) => Object.entries(COLORS).find(([, v]) => v.includes(word))?.[0] ?? null;
const nounOf = (word: string) => Object.entries(NOUNS).find(([, v]) => v.includes(word))?.[0] ?? null;

export function detectIntent(q: string): AskIntent {
  const s = q.toLowerCase();
  if (/\bhow much\b.*\b(spend|spent|spending)\b|\bspending\b/.test(s)) return "spend";
  if (/\b(what|which|any|show)\b.*\b(returns?|deadlines?|due)\b.*\b(this week|today|soon|upcoming|coming up)\b/.test(s)) return "agenda";
  if (/\b(when|deadline|last day|how long|due|too late|still return)\b/.test(s)) return "deadline";
  if (/\b(label|qr|drop ?off|code to)\b/.test(s)) return "label";
  if (/\b(refund|money back|paid back|reimburse)/.test(s)) return "refund";
  if (/\b(gift ?cards?|credits?|balances?|how much .* (have|left)|store money)\b/.test(s)) return "credit";
  if (/\b(return|send (it )?back|take (it )?back)\b/.test(s)) return "return";
  return "find";
}

function itemAnswer(v: OrderView, itemId: string, today: DateOnly, intent: AskIntent): { answer: string; actions: AskAction[] } {
  const a = v.items.find((x) => x.item.id === itemId)!;
  const actions: AskAction[] = [];
  const r = a.activeReturn;
  let answer: string;

  if (intent === "label" && !r?.artifacts.length && a.stage === "to_decide") {
    answer = `There's no label yet. Start the return and ${v.retailer.name} will send one.`;
    actions.push({ label: "Start Return", href: `/returns/start/?order=${v.order.id}&item=${itemId}` });
  } else if (r?.status === "label_ready") {
    answer = r.shipBy ? `Your return label is ready. Drop it off by ${formatDate(r.shipBy, today)}.` : "Your return label is ready to drop off.";
    actions.push({ label: r.artifacts.some((x) => x.kind === "qr_code") ? "Show QR Code" : "View Label", href: `/returns/label/?id=${r.id}` });
  } else if (r && v.refund && (r.status === "received" || r.status === "shipped")) {
    const late = v.refund.expected?.by ? daysBetween(v.refund.expected.by, today) : 0;
    answer =
      late > 0
        ? `${v.retailer.name} has your return, but no refund email has arrived. It was expected ${formatDate(v.refund.expected!.by!, today)}.`
        : `Your return is on its way. We'll watch for ${v.retailer.name}'s refund email.`;
    actions.push({ label: "See refund", href: `/returns/refund/?id=${v.refund.id}` });
  } else if (r) {
    answer = r.status === "prepared" ? "You started a return but haven't sent it to the store yet." : "Your return is in progress.";
    actions.push({ label: "See return", href: `/returns/start/?return=${r.id}` });
  } else if (a.stage === "completed") {
    const f = v.refund;
    answer = f?.confirmed
      ? f.confirmed.by === "retailer_email"
        ? `${v.retailer.name} issued ${f.destination === "store_credit" ? "store credit" : "your refund"} of ${money(f.confirmed.amount)} on ${formatDate(f.confirmed.at, today)}, according to their email.${f.destination === "store_credit" ? "" : f.arrivedAt ? " You confirmed it arrived." : " Orbit can't see your bank, so check your statement to confirm it arrived."}`
        : `You confirmed the refund of ${money(f.confirmed.amount)} arrived.`
      : "You've already returned this.";
    if (f) actions.push({ label: "View Refund", href: `/returns/refund/?id=${f.id}` });
  } else if (a.stage === "kept") {
    answer = "You marked this as kept.";
  } else if (a.stage === "on_the_way") {
    answer = `Not delivered yet${v.order.shippedAt ? `. Shipped ${formatDate(v.order.shippedAt, today)}${v.order.tracking ? ` via ${v.order.tracking.carrier}` : ""}` : ""}. The return window starts when it arrives.`;
  } else {
    const d = a.deadline;
    if (d.kind === "confirmed" || d.kind === "estimated") {
      const left = d.daysLeft;
      answer =
        left < 0
          ? `The return window closed on ${formatDate(d.date, today)}.`
          : `Return it by ${formatDate(d.date, today)}${d.kind === "estimated" ? " (estimated)" : ""}. ${left === 0 ? "That's today." : left === 1 ? "That's tomorrow." : `That's ${left} days from now.`}`;
    } else {
      answer = "We don't know the return deadline yet. Adding the delivery date will fix that.";
    }
    if (intent === "find" && v.order.deliveredAt) answer = `Delivered ${formatDate(v.order.deliveredAt, today)}. ${answer}`;
    if (a.stage === "to_decide") actions.push({ label: "Start return", href: `/returns/start/?order=${v.order.id}&item=${itemId}` });
  }
  if (actions.length === 0) actions.push({ label: "View Order", href: `/returns/purchase/?id=${v.order.id}` });
  return { answer, actions };
}

export function ask(query: string, data: OrbitData, today: DateOnly): { intent: AskIntent; results: AskResult[] } {
  const intent = detectIntent(query);
  const words = tokenize(query);
  const colors = words.map(colorOf).filter(Boolean) as string[];
  const nouns = words.map(nounOf).filter(Boolean) as string[];
  const recentDays = /yesterday|this week|last week|few days/.test(query.toLowerCase()) ? 14 : /last month|few weeks|recently/.test(query.toLowerCase()) ? 45 : null;
  const results: AskResult[] = [];

  if (intent === "agenda") {
    const week = buildPriorities(data, today).filter((p) => ["return_deadline", "drop_off", "finish_return", "refund_check"].includes(p.kind) && p.daysLeft != null && p.daysLeft <= 7);
    return {
      intent,
      results: week.map((p, i) => ({
        id: p.key,
        kind: "item",
        retailerId: p.retailerId,
        title: p.title,
        href: p.detailHref,
        answer: `${kindMeta[p.kind].label}. ${dueDateText(p, today) ?? ""}${p.amount != null ? ` · ${money(p.amount)}` : ""}.`,
        note: p.estimated && p.kind === "return_deadline" ? "Estimated date." : null,
        actions: [p.action],
        score: 100 - i,
      })),
    };
  }

  if (intent === "spend") {
    const year = !/\bmonth\b/.test(query.toLowerCase());
    const r = insights(data, rangeFor(year ? "year" : "month", today));
    const cat = Object.entries(CATEGORY_WORDS).find(([, ws]) => words.some((w) => ws.includes(w)))?.[0] ?? (nouns.length ? null : null);
    const amount = cat ? r.byCategory.find((c) => c.key === cat)?.amount ?? 0 : r.gross;
    const what = cat ? `on ${categoryLabel[cat as ItemCategory].toLowerCase()}` : "in total";
    return {
      intent,
      results: [
        {
          id: "spend",
          kind: "item",
          retailerId: "",
          title: `Spending ${year ? "this year" : "this month"}`,
          href: "/insights/",
          answer: `You've recorded ${money(amount)} ${what} ${year ? "this year" : "this month"}, before tax and shipping. Confirmed refunds aren't subtracted here.`,
          note: "Only includes orders Orbit knows about.",
          actions: [{ label: "Open Shopping Insights", href: "/insights/" }],
          score: 100,
        },
      ],
    };
  }

  for (const order of data.orders) {
    const retailer = retailerOf(data, order.retailerId);
    const retailerHit = words.some((w) => retailer.name.toLowerCase().replace(/[^a-z0-9&]/g, "").includes(w.replace(/[^a-z0-9&]/g, "")) && w.length >= 3);
    const view = orderView(data, order, today);

    for (const item of order.items) {
      const text = `${item.name} ${item.variant ?? ""}`.toLowerCase();
      const itemNouns = Object.keys(NOUNS).filter((n) => NOUNS[n].some((w) => new RegExp(`\\b${w}`).test(text)));
      const itemColors = Object.keys(COLORS).filter((c) => COLORS[c].some((w) => new RegExp(`\\b${w}\\b`).test(text)));

      let score = 0;
      let note: string | null = null;
      if (retailerHit) score += 3;
      for (const n of nouns) if (itemNouns.includes(n)) score += 3;
      for (const w of words) if (CATEGORY_WORDS[item.category].includes(w)) score += 2;
      for (const w of words) if (w.length >= 4 && !colorOf(w) && !nounOf(w) && text.includes(w)) score += 2;
      // Color only sharpens a match; on its own it isn't one.
      if (colors.length && score > 0) {
        if (colors.some((c) => itemColors.includes(c))) score += 2;
        else if (itemColors.length && score > 0) {
          score -= 1;
          note = `Closest match. It's listed as ${itemColors[0]}, not ${colors[0]}.`;
        }
      }
      if (recentDays && order.purchasedAt && daysBetween(order.purchasedAt, today) <= recentDays && score > 0) score += 1;
      if (intent === "refund" && view.refund && score > 0) score += 1;
      if (score < 2) continue;

      const { answer, actions } = itemAnswer(view, item.id, today, intent);
      const ordered = order.purchasedAt ? `ordered ${formatDate(order.purchasedAt, today)}` : "order date unknown";
      results.push({
        id: `${order.id}:${item.id}`,
        kind: "item",
        retailerId: order.retailerId,
        title: `${item.name}${item.variant ? ` · ${item.variant}` : ""}`,
        href: `/returns/purchase/?id=${order.id}`,
        answer: `${retailer.name}, ${ordered}${order.orderNumber ? `, order ${order.orderNumber}` : ""}. ${answer}`,
        note,
        actions,
        score,
      });
    }
  }

  // Credits: by store name, or any "gift card / credit" question.
  for (const w of data.wallet) {
    const r = retailerOf(data, w.retailerId);
    const retailerHit = words.some((x) => x.length >= 3 && r.name.toLowerCase().includes(x));
    const creditAsk = intent === "credit";
    if (!retailerHit && !creditAsk) continue;
    if (!creditAsk && results.some((x) => x.retailerId === w.retailerId) && intent !== "find") continue;
    results.push({
      id: w.id,
      kind: "credit",
      retailerId: w.retailerId,
      title: `${r.name} ${creditTypeLabel[w.type].toLowerCase()}`,
      href: `/wallet/card/?id=${w.id}`,
      answer: `You have ${money(w.balance)} to spend at ${r.name}${w.balanceStatus.kind === "verified" ? "" : " (balance not verified recently)"}.${w.expiration.kind === "date" ? ` Use it by ${formatDate(w.expiration.date, today)}.` : ""}`,
      note: null,
      actions: [
        { label: "Open card", href: `/wallet/card/?id=${w.id}` },
        ...(r.websiteUrl ? [{ label: `Shop ${r.name}`, href: r.websiteUrl }] : []),
      ],
      score: (retailerHit ? 3 : 0) + (creditAsk ? 2 : 0),
    });
  }

  return { intent, results: results.sort((a, b) => b.score - a.score).slice(0, 4) };
}

export const ASK_EXAMPLES = [
  "Where is my black dress?",
  "What returns do I have this week?",
  "Find the label for my jeans",
  "Did Sephora issue my refund?",
  "What gift cards do I have?",
  "How much did I spend on clothing this year?",
];
