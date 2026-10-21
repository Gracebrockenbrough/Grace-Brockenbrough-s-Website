/**
 * Saved for Later: things the customer wants to remember. Private by design.
 * Nothing here is used for advertising, sales matching or ranking.
 */
import type { DateOnly, Retailer, WishItem } from "../domain/types";
import type { OrbitData } from "../store/state";

export function activeWishes(d: OrbitData, today: DateOnly): WishItem[] {
  return d.wishlist.filter((w) => w.status === "active" && (w.until == null || w.until >= today));
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
