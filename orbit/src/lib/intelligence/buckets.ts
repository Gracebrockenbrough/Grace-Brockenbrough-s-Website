/**
 * Spending buckets: what people actually buy (dresses, jeans, sweaters…), not
 * just broad categories. Each purchase drops into one bucket. Goals are optional
 * and monthly; without them, buckets compare with each other.
 */
import type { OrderItem } from "../domain/types";

export type ItemKind =
  | "dresses"
  | "jeans"
  | "pants"
  | "skirts"
  | "tops"
  | "knitwear"
  | "outerwear"
  | "shoes"
  | "bags"
  | "accessories"
  | "beauty"
  | "home"
  | "other";

export const KIND_LABEL: Record<ItemKind, string> = {
  dresses: "Dresses",
  jeans: "Jeans",
  pants: "Pants & shorts",
  skirts: "Skirts",
  tops: "Tops & shirts",
  knitwear: "Sweaters",
  outerwear: "Jackets & coats",
  shoes: "Shoes",
  bags: "Bags",
  accessories: "Accessories",
  beauty: "Beauty",
  home: "Home",
  other: "Other",
};

/** Ordered: the first matching rule wins ("Denim Jacket" is a jacket, not jeans). */
const RULES: [ItemKind, RegExp][] = [
  ["outerwear", /\b(jacket|coat|overcoat|blazer|puffer|parka|trench|vest)\b/i],
  ["dresses", /\b(dress|gown|jumpsuit|romper)\b/i],
  ["skirts", /\bskirt\b/i],
  ["jeans", /\b(jeans?|denim)\b/i],
  ["pants", /\b(pants?|trousers?|chinos?|shorts|leggings|joggers)\b/i],
  ["knitwear", /\b(sweater|cardigan|crewneck|pullover|knit|jumper|hoodie)\b/i],
  ["tops", /\b(shirt|tee|t-shirt|tank|cami|top|blouse|bodysuit|polo|button-down)\b/i],
  ["bags", /\b(bag|tote|clutch|backpack|purse|crossbody)\b/i],
  ["accessories", /\b(scarf|belt|hat|beanie|cap|earrings?|necklace|bracelet|ring|sunglasses|watch|gloves)\b/i],
  ["home", /\b(candle|dryer|pillow|throw|mug|vase|towel)\b/i],
];

export function itemKind(item: Pick<OrderItem, "name" | "category">): ItemKind {
  // Category from the store beats name words for shoes and beauty ("The Day Glove" is a shoe).
  if (item.category === "shoes") return "shoes";
  if (item.category === "beauty") return "beauty";
  for (const [kind, re] of RULES) if (re.test(item.name)) return kind;
  if (item.category === "accessories") return "accessories";
  if (item.category === "home") return "home";
  return "other";
}

export interface Bucket {
  kind: ItemKind;
  label: string;
  amount: number;
  count: number;
  /** Monthly goal, when the customer set one. */
  goal: number | null;
  /** 0–1. Share of the goal, or of the biggest bucket when there's no goal. */
  fill: number;
}

export function buildBuckets(
  items: Pick<OrderItem, "name" | "category" | "unitPrice" | "quantity">[],
  goals: Partial<Record<ItemKind, number>> | null,
): Bucket[] {
  const map = new Map<ItemKind, { amount: number; count: number }>();
  for (const i of items) {
    if (i.unitPrice == null) continue;
    const k = itemKind(i);
    const cur = map.get(k) ?? { amount: 0, count: 0 };
    map.set(k, { amount: cur.amount + i.unitPrice * i.quantity, count: cur.count + i.quantity });
  }
  // Buckets with a goal show even when empty, so the goal stays visible.
  for (const k of Object.keys(goals ?? {}) as ItemKind[]) if (!map.has(k) && goals?.[k]) map.set(k, { amount: 0, count: 0 });

  const max = Math.max(...[...map.values()].map((v) => v.amount), 1);
  return [...map.entries()]
    .map(([kind, v]) => {
      const goal = goals?.[kind] ?? null;
      const amount = Math.round(v.amount * 100) / 100;
      return { kind, label: KIND_LABEL[kind], amount, count: v.count, goal, fill: Math.min(1, goal ? amount / goal : amount / max) };
    })
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));
}
