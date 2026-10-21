import { describe, expect, it } from "vitest";
import { buildDemoData } from "../demo/seed";
import { goalMultiplier, previousRange, rangeFor } from "./insights";
import { activeWishes, parseProductLink, parseWishText } from "./saved";

const TODAY = "2026-10-20";
const data = buildDemoData(TODAY);

describe("Saved for Later input", () => {
  it("reads details out of a description", () => {
    expect(parseWishText("a blue dress for a wedding under $150")).toEqual({ color: "Blue", maxPrice: 150, occasion: "Wedding", tags: ["dress"] });
  });
  it("recognizes the store from a product link", () => {
    expect(parseProductLink("https://www.madewell.com/leather-chelsea-boot-NM123.html", data.retailers)).toEqual({ retailerId: "madewell", name: "Leather chelsea boot" });
    expect(parseProductLink("not a link", data.retailers)).toEqual({ retailerId: null, name: null });
  });
  it("drops temporary items after their date", () => {
    expect(activeWishes(data, TODAY)).toHaveLength(3);
    expect(activeWishes(data, "2027-01-01").map((w) => w.id)).not.toContain("d-wl-2");
  });
});

describe("periods", () => {
  it("supports quarters and previous-period comparisons", () => {
    expect(rangeFor("quarter", TODAY)).toEqual({ from: "2026-10-01", to: TODAY });
    expect(previousRange({ from: "2026-10-01", to: "2026-10-20" })).toEqual({ from: "2026-09-11", to: "2026-09-30" });
    expect(goalMultiplier.quarter).toBe(3);
  });
});
