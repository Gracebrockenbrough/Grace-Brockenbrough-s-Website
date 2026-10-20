import { describe, expect, it } from "vitest";
import { buildDemoData } from "../demo/seed";
import { buildFeed, codeTrust, parseProductLink, parseWishText } from "./discover";
import { goalMultiplier, previousRange, rangeFor } from "./insights";

const TODAY = "2026-10-20";
const data = buildDemoData(TODAY);

describe("Discover feed", () => {
  it("ranks wishlist matches and favorites first, and explains why", () => {
    const feed = buildFeed(data, TODAY);
    // Reformation: wishlist match, favorite brand, and $150 of credit there.
    expect(feed.slice(0, 2).map((f) => f.promo.id)).toEqual(["d-p-ref", "d-p-mad"]);
    expect(feed[1].reasons).toEqual(["On your wishlist: Leather Chelsea Boots", "A favorite brand"]);
    const ref = feed[0];
    expect(ref.reasons).toContain("You have credit here");
    expect(ref.credit).toBe(150);
    expect(ref.wishes.map((w) => w.text)).toEqual(["A blue dress for a wedding under $150"]);
  });

  it("never lets a sponsored sale outrank what the customer asked for", () => {
    const feed = buildFeed(data, TODAY);
    const cos = feed.findIndex((f) => f.promo.sponsored);
    expect(cos).toBeGreaterThan(feed.findIndex((f) => f.promo.id === "d-p-mad"));
    expect(buildFeed({ ...data, shopping: { ...data.shopping, showSponsored: false } }, TODAY).some((f) => f.promo.sponsored)).toBe(false);
  });

  it("respects hidden brands, hidden sales and the minimum discount", () => {
    const prefs = { ...data.shopping, hiddenRetailerIds: ["zara"], hiddenPromotionIds: ["d-p-eve"], minDiscount: 25 as const };
    const ids = buildFeed({ ...data, shopping: prefs }, TODAY).map((f) => f.promo.id);
    expect(ids).not.toContain("d-p-zara");
    expect(ids).not.toContain("d-p-eve");
    expect(ids).not.toContain("d-p-ref"); // 20% off, no code
    expect(ids).toContain("d-p-ari"); // 15% off, but has a code
  });

  it("filters to favorites, wishlist matches or codes", () => {
    expect(buildFeed(data, TODAY, "codes").every((f) => f.promo.code)).toBe(true);
    expect(buildFeed(data, TODAY, "wishlist").map((f) => f.promo.retailerId).sort()).toEqual(["everlane", "madewell", "reformation", "zara"]);
  });
});

describe("wishlist input", () => {
  it("reads preferences out of a description", () => {
    expect(parseWishText("a blue dress for a wedding under $150")).toEqual({ color: "Blue", maxPrice: 150, occasion: "Wedding", tags: ["dress"] });
  });
  it("recognizes the store from a product link", () => {
    expect(parseProductLink("https://www.madewell.com/leather-chelsea-boot-NM123.html", data.retailers)).toEqual({ retailerId: "madewell", name: "Leather chelsea boot" });
    expect(parseProductLink("not a link", data.retailers)).toEqual({ retailerId: null, name: null });
  });
});

describe("codes and periods", () => {
  it("only calls a code verified when enough shoppers confirm it", () => {
    const p = data.promotions.find((x) => x.id === "d-p-mad")!;
    expect(codeTrust(p)).toEqual({ label: "Worked for 41 shoppers", tone: "verified" });
    expect(codeTrust({ ...p, votes: { worked: 2, failed: 2 } }).tone).toBe("mixed");
    expect(codeTrust({ ...p, votes: { worked: 0, failed: 0 } }).tone).toBe("new");
  });
  it("supports quarters and previous-period comparisons", () => {
    expect(rangeFor("quarter", TODAY)).toEqual({ from: "2026-10-01", to: TODAY });
    expect(previousRange({ from: "2026-10-01", to: "2026-10-20" })).toEqual({ from: "2026-09-11", to: "2026-09-30" });
    expect(goalMultiplier.quarter).toBe(3);
  });
});
