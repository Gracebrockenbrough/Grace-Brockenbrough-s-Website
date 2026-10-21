/**
 * Fictional Circle content, used only to demonstrate the feed. Every post and person here
 * is labeled "Demo" in the UI. None of it comes from anyone's real purchases.
 */
import { addDays } from "../domain/dates";
import type { CircleAuthor, Collection, DateOnly, SocialPost } from "../domain/types";

export function buildCircleDemo(today: DateOnly): { authors: CircleAuthor[]; posts: SocialPost[]; collections: Collection[]; following: string[] } {
  const ts = (days: number, t = "14:00:00") => `${addDays(today, days)}T${t}.000Z`;
  const authors: CircleAuthor[] = [
    { id: "d-a-maya", name: "Maya", handle: "maya.k", palette: "rose", relation: "friend", demo: true },
    { id: "d-a-jordan", name: "Jordan", handle: "jordanwears", palette: "sky", relation: "friend", demo: true },
    { id: "d-a-priya", name: "Priya", handle: "priya.p", palette: "sage", relation: "friend", demo: true },
    { id: "d-a-denim", name: "The Denim Edit", handle: "denimedit", palette: "ink", relation: "creator", demo: true },
    { id: "d-a-slow", name: "Slow Closet", handle: "slowcloset", palette: "apricot", relation: "creator", demo: true },
  ];
  const post = (p: Partial<SocialPost> & Pick<SocialPost, "id" | "authorId" | "type" | "caption">): SocialPost => ({
    images: [],
    retailerIds: [],
    items: [],
    notes: { sizing: null, quality: null, returnEase: null },
    audience: "friends",
    createdAt: ts(-1),
    likes: 0,
    liked: false,
    saved: false,
    demo: true,
    ...p,
  });
  const art = (seed: string, kinds: string[], palette: string, alt: string) => ({ kind: "art" as const, seed, kinds, palette, alt });

  const posts: SocialPost[] = [
    post({
      id: "d-p-1",
      authorId: "d-a-maya",
      type: "haul",
      caption: "Fall haul. Kept the red midi, sending the blazer back (runs big).",
      images: [art("maya-1", ["dresses"], "rose", "A red midi dress"), art("maya-2", ["outerwear", "bags"], "apricot", "A camel blazer and a tote"), art("maya-3", ["shoes"], "sky", "Leather boots")],
      retailerIds: ["reformation", "madewell"],
      items: [
        { name: "Red midi dress", kind: "dresses", retailerId: "reformation" },
        { name: "Camel blazer", kind: "outerwear", retailerId: "madewell" },
        { name: "Leather boots", kind: "shoes", retailerId: "madewell" },
      ],
      notes: { sizing: "large", quality: "Lovely fabric", returnEase: "easy" },
      likes: 24,
      createdAt: ts(-1, "18:20:00"),
    }),
    post({
      id: "d-p-2",
      authorId: "d-a-denim",
      type: "styled",
      audience: "public",
      caption: "One straight-leg jean, three ways. Size down if you're between sizes.",
      images: [art("denim-1", ["jeans", "tops"], "ink", "Straight-leg jeans with a white tee"), art("denim-2", ["jeans", "knitwear"], "sky", "Jeans with a lilac sweater")],
      retailerIds: ["madewell"],
      items: [{ name: "Straight-leg jeans", kind: "jeans", retailerId: "madewell" }],
      notes: { sizing: "large", quality: null, returnEase: null },
      likes: 312,
      createdAt: ts(-2),
    }),
    post({
      id: "d-p-3",
      authorId: "d-a-jordan",
      type: "store_favorite",
      caption: "My go-to for basics that last. Returns were painless both times.",
      images: [],
      retailerIds: ["everlane"],
      notes: { sizing: "true", quality: "Holds up after washing", returnEase: "easy" },
      likes: 9,
      createdAt: ts(-2, "09:10:00"),
    }),
    post({
      id: "d-p-4",
      authorId: "d-a-priya",
      type: "review",
      caption: "Beautiful sweater, but the return needed a printed label and took two weeks to refund.",
      retailerIds: ["aritzia"],
      items: [{ name: "Cocoon sweater", kind: "knitwear", retailerId: "aritzia" }],
      notes: { sizing: "true", quality: "Soft, no pilling yet", returnEase: "hard" },
      likes: 15,
      createdAt: ts(-3),
    }),
    post({
      id: "d-p-5",
      authorId: "d-a-slow",
      type: "collection",
      audience: "public",
      caption: "Wedding-guest edit: under $200, all with cash refunds.",
      images: [art("slow-1", ["dresses", "bags", "shoes"], "apricot", "A dress, a clutch and heels")],
      retailerIds: ["reformation", "jcrew"],
      items: [
        { name: "Floral midi", kind: "dresses", retailerId: "reformation" },
        { name: "Satin clutch", kind: "bags", retailerId: "jcrew" },
        { name: "Block heels", kind: "shoes", retailerId: null },
        { name: "Silk slip skirt", kind: "skirts", retailerId: null },
      ],
      likes: 88,
      createdAt: ts(-4),
    }),
    post({
      id: "d-p-6",
      authorId: "d-a-maya",
      type: "styled",
      caption: "Saturday uniform.",
      images: [art("maya-4", ["knitwear", "jeans"], "orchid", "A sweater and jeans")],
      retailerIds: ["cos"],
      items: [{ name: "Wool sweater", kind: "knitwear", retailerId: "cos" }],
      likes: 31,
      createdAt: ts(-5),
    }),
  ];

  const collections: Collection[] = [
    {
      id: "d-c-bday",
      title: "Birthday wishlist",
      visibility: "friends",
      palette: "rose",
      createdAt: ts(-20),
      items: [
        { id: "d-ci-1", name: "Gold hoops", kind: "accessories", image: null, url: null, retailerId: "madewell", addedAt: ts(-20) },
        { id: "d-ci-2", name: "Leather tote", kind: "bags", image: null, url: null, retailerId: null, addedAt: ts(-18) },
        { id: "d-ci-3", name: "Silk scarf", kind: "accessories", image: null, url: null, retailerId: "cos", addedAt: ts(-10) },
        { id: "d-ci-4", name: "Hydrating serum", kind: "beauty", image: null, url: null, retailerId: "sephora", addedAt: ts(-6) },
      ],
    },
    {
      id: "d-c-formal",
      title: "Formal outfit ideas",
      visibility: "private",
      palette: "orchid",
      createdAt: ts(-12),
      items: [
        { id: "d-ci-5", name: "Black slip dress", kind: "dresses", image: null, url: null, retailerId: "reformation", addedAt: ts(-12) },
        { id: "d-ci-6", name: "Tailored blazer", kind: "outerwear", image: null, url: null, retailerId: "jcrew", addedAt: ts(-9) },
      ],
    },
    { id: "d-c-trip", title: "Lisbon trip", visibility: "private", palette: "sky", createdAt: ts(-2), items: [] },
  ];

  return { authors, posts, collections, following: ["d-a-denim"] };
}
