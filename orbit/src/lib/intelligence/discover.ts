/**
 * Discover: a calm, personal sales feed built from promotional emails.
 *
 * Ranking is explainable: every card says why it's there (a favorite brand, a
 * wishlist match, credit you already have). Sponsored cards are always labeled
 * and never outrank something the customer asked for.
 */
import { daysBetween } from "../domain/dates";
import type { DateOnly, Promotion, Retailer, WishItem } from "../domain/types";
import { creditAt, retailerOf } from "../store/selectors";
import type { OrbitData } from "../store/state";

export type FeedFilter = "all" | "favorites" | "wishlist" | "codes" | "credit" | "ending";

export interface FeedItem {
  promo: Promotion;
  retailer: Retailer;
  favorite: boolean;
  /** Wishlist items this sale is relevant to. */
  wishes: WishItem[];
  /** Recorded gift card or store credit at this retailer. */
  credit: number;
  endsIn: number | null;
  /** Plain reasons, shown on the card. */
  reasons: string[];
  score: number;
}

export const isActive = (p: Promotion, today: DateOnly) => p.startsAt <= today && (p.endsAt == null || p.endsAt >= today);

const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

/** Does this sale apply to this wishlist item? Store must match when the item names one. */
export function matchesWish(p: Promotion, w: WishItem): boolean {
  if (w.status !== "active") return false;
  if (w.retailerId && w.retailerId !== p.retailerId) return false;
  const wt = new Set([...w.tags, ...words(w.text)]);
  return p.tags.some((t) => wt.has(t)) || (w.retailerId != null && p.tags.length === 0);
}

export function activeWishes(d: OrbitData, today: DateOnly): WishItem[] {
  return d.wishlist.filter((w) => w.status === "active" && (w.until == null || w.until >= today));
}

export type CodeTrust = { label: string; tone: "verified" | "mixed" | "new" };

export function codeTrust(p: Promotion): CodeTrust {
  const { worked, failed } = p.votes;
  const total = worked + failed;
  if (total === 0) return { label: "Not verified yet", tone: "new" };
  const rate = worked / total;
  if (worked >= 5 && rate >= 0.75) return { label: `Worked for ${worked} shoppers`, tone: "verified" };
  return { label: `${worked} worked · ${failed} didn't`, tone: "mixed" };
}

export function buildFeed(d: OrbitData, today: DateOnly, filter: FeedFilter = "all"): FeedItem[] {
  const prefs = d.shopping;
  const wishes = activeWishes(d, today);
  const items: FeedItem[] = [];

  for (const p of d.promotions) {
    if (!isActive(p, today)) continue;
    if (prefs.hiddenPromotionIds.includes(p.id) || prefs.hiddenRetailerIds.includes(p.retailerId)) continue;
    if (p.sponsored && !prefs.showSponsored) continue;
    if (prefs.minDiscount > 0 && p.discountPct != null && p.discountPct < prefs.minDiscount && !p.code) continue;

    const retailer = retailerOf(d, p.retailerId);
    const favorite = prefs.favoriteRetailerIds.includes(p.retailerId);
    const matched = wishes.filter((w) => matchesWish(p, w));
    const credit = creditAt(d, p.retailerId, today);
    const endsIn = p.endsAt ? daysBetween(today, p.endsAt) : null;
    const catMatch = p.categories.some((c) => prefs.categories.includes(c));

    const reasons: string[] = [];
    if (matched.length) reasons.push(`On your wishlist: ${matched[0].text}`);
    if (favorite) reasons.push("A favorite brand");
    if (credit > 0) reasons.push("You have credit here");

    let score = (matched.length ? 5 : 0) + (favorite ? 3 : 0) + (credit > 0 ? 2 : 0) + (catMatch ? 1 : 0) + (endsIn != null && endsIn <= 3 ? 1 : 0);
    if (p.sponsored) score = Math.min(score, 2); // never above what the customer asked for

    items.push({ promo: p, retailer, favorite, wishes: matched, credit, endsIn, reasons, score });
  }

  const filtered = items.filter((i) =>
    filter === "favorites"
      ? i.favorite
      : filter === "wishlist"
        ? i.wishes.length > 0
        : filter === "codes"
          ? Boolean(i.promo.code)
          : filter === "credit"
            ? i.credit > 0 && !i.promo.sponsored
            : filter === "ending"
              ? i.endsIn != null && i.endsIn <= 3
              : true,
  );
  return filtered.sort((a, b) => b.score - a.score || (a.endsIn ?? 99) - (b.endsIn ?? 99));
}

/** Sales relevant to one wishlist item. */
export function salesForWish(d: OrbitData, w: WishItem, today: DateOnly): Promotion[] {
  return d.promotions.filter((p) => isActive(p, today) && !d.shopping.hiddenPromotionIds.includes(p.id) && matchesWish(p, w));
}

/** Guess the store and a readable name from a product link. */
export function parseProductLink(url: string, retailers: Retailer[]): { retailerId: string | null; name: string | null } {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const retailer = retailers.find((r) => r.websiteUrl && new URL(r.websiteUrl).hostname.replace(/^www\./, "") === host) ?? null;
    const slug = u.pathname.split("/").filter(Boolean).pop() ?? "";
    const name = slug
      .replace(/\.(html?|php)$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b[a-z0-9]*\d[a-z0-9]*\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    return { retailerId: retailer?.id ?? null, name: name ? name[0].toUpperCase() + name.slice(1) : null };
  } catch {
    return { retailerId: null, name: null };
  }
}

/** Pull simple preferences out of a description: "a blue dress for a wedding under $150". */
export function parseWishText(text: string): { color: string | null; maxPrice: number | null; occasion: string | null; tags: string[] } {
  const t = text.toLowerCase();
  const color = t.match(/\b(black|white|blue|navy|red|pink|green|beige|brown|grey|gray|cream|yellow|purple|orange|gold|silver)\b/)?.[1] ?? null;
  const price = t.match(/(?:under|below|less than|max|up to)\s*\$?\s?(\d{2,5})/)?.[1];
  const occasion = t.match(/\bfor (?:a |an |the )?([a-z]+(?: party)?)\b/)?.[1] ?? null;
  const nouns = ["dress", "dresses", "jeans", "denim", "sweater", "boots", "boot", "sneakers", "sneaker", "shoes", "heels", "bag", "tote", "jacket", "coat", "blazer", "skirt", "pants", "shirt", "top", "serum", "perfume", "candle"];
  const tags = nouns.filter((n) => new RegExp(`\\b${n}\\b`).test(t));
  return {
    color: color ? color[0].toUpperCase() + color.slice(1) : null,
    maxPrice: price ? Number(price) : null,
    occasion: occasion && !["me", "my", "work"].includes(occasion) ? occasion[0].toUpperCase() + occasion.slice(1) : occasion === "work" ? "Work" : null,
    tags,
  };
}
