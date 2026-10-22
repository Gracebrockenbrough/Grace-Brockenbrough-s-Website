/**
 * Fictional Discover content: friends who share lists with you and creators with public
 * lists. Every person and list here is labeled "Demo" in the UI.
 */
import { addDays } from "../domain/dates";
import type { CircleAuthor, Collection, CollectionItem, DateOnly } from "../domain/types";

export function buildCircleDemo(today: DateOnly): { authors: CircleAuthor[]; collections: Collection[] } {
  const ts = (days: number) => `${addDays(today, days)}T14:00:00.000Z`;
  const authors: CircleAuthor[] = [
    { id: "d-a-maya", name: "Maya", handle: "maya.k", palette: "rose", relation: "friend", demo: true },
    { id: "d-a-jordan", name: "Jordan", handle: "jordanwears", palette: "sky", relation: "friend", demo: true },
    { id: "d-a-denim", name: "The Denim Edit", handle: "denimedit", palette: "ink", relation: "creator", demo: true },
    { id: "d-a-slow", name: "Slow Closet", handle: "slowcloset", palette: "apricot", relation: "creator", demo: true },
  ];
  let n = 0;
  const item = (name: string, kind: string, retailerId: string | null): CollectionItem => ({ id: `d-ci-${++n}`, name, kind, image: null, url: null, retailerId, addedAt: ts(-n) });
  const list = (c: Omit<Collection, "createdAt" | "visibility"> & Partial<Collection>): Collection => ({ createdAt: ts(-10), visibility: "public", ...c });

  const collections: Collection[] = [
    // Yours
    list({ id: "d-c-bday", title: "Birthday wishlist", visibility: "public", palette: "rose", ownerId: null, items: [item("Gold hoops", "accessories", "madewell"), item("Leather tote", "bags", null), item("Silk scarf", "accessories", "cos"), item("Hydrating serum", "beauty", "sephora")] }),
    list({ id: "d-c-formal", title: "Formal outfit ideas", visibility: "private", palette: "orchid", ownerId: null, items: [item("Black slip dress", "dresses", "reformation"), item("Tailored blazer", "outerwear", "jcrew")] }),
    list({ id: "d-c-trip", title: "Lisbon trip", visibility: "private", palette: "sky", ownerId: null, items: [] }),
    // Shared with you by friends
    list({ id: "d-c-maya", title: "Fall staples", palette: "apricot", ownerId: "d-a-maya", sharedWithMe: true, demo: true, items: [item("Red midi dress", "dresses", "reformation"), item("Camel coat", "outerwear", "madewell"), item("Leather boots", "shoes", "madewell")] }),
    list({ id: "d-c-jordan", title: "Basics that last", palette: "sage", ownerId: "d-a-jordan", sharedWithMe: true, demo: true, items: [item("White tee", "tops", "everlane"), item("Straight jeans", "jeans", "everlane"), item("Wool sweater", "knitwear", "cos")] }),
    // Public lists from creators
    list({ id: "d-c-denim", title: "Denim that actually fits", palette: "sky", ownerId: "d-a-denim", demo: true, items: [item("Straight-leg jeans", "jeans", "madewell"), item("Wide-leg jeans", "jeans", "everlane"), item("Denim jacket", "outerwear", "madewell"), item("Striped top", "tops", "jcrew")] }),
    list({ id: "d-c-wedding", title: "Wedding guest under $200", palette: "rose", ownerId: "d-a-slow", demo: true, items: [item("Floral midi", "dresses", "reformation"), item("Satin clutch", "bags", "jcrew"), item("Block heels", "shoes", null), item("Silk slip skirt", "skirts", null)] }),
  ];
  return { authors, collections };
}
