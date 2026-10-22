import { describe, expect, it } from "vitest";
import { buildDemoData } from "../demo/seed";
import { policyOf, recoveredThisYear } from "../store/selectors";
import { beforeYouBuy, headlineFacts, matchesStoreFilter } from "./storeFacts";

const TODAY = "2026-10-20";
const data = buildDemoData(TODAY);
const r = (id: string) => data.retailers.find((x) => x.id === id)!;

describe("Store Profile facts", () => {
  it("come only from the policy record, and say so when it's missing", () => {
    const facts = beforeYouBuy(policyOf(data, "aritzia"));
    expect(facts.find((f) => f.label === "Return window")?.value).toBe("30 days");
    expect(facts.find((f) => f.label === "Refund to original payment")?.value).toBe("Available");
    expect(beforeYouBuy(null)).toEqual([]);
    expect(headlineFacts(null)).toEqual(["Return policy not on file"]);
  });

  it("keeps unknown policy details unknown", () => {
    const everlane = beforeYouBuy(policyOf(data, "everlane"));
    expect(everlane.find((f) => f.label === "Mail return fee")).toMatchObject({ value: "Not confirmed", known: false });
  });

  it("filters only on facts Penny holds", () => {
    expect(matchesStoreFilter(r("sephora"), policyOf(data, "sephora"), "beauty")).toBe(true);
    expect(matchesStoreFilter(r("cos"), policyOf(data, "cos"), "free_returns")).toBe(true);
    expect(matchesStoreFilter(r("everlane"), policyOf(data, "everlane"), "free_returns")).toBe(false); // fee unknown, not assumed free
  });
});

describe("recovered money", () => {
  it("counts confirmed arrivals and issued store credit, never issued-but-unconfirmed card refunds", () => {
    const before = recoveredThisYear(data, TODAY);
    const issued = data.refunds.find((f) => f.confirmed?.by === "retailer_email" && f.destination !== "store_credit" && !f.arrivedAt)!;
    const after = recoveredThisYear({ ...data, refunds: data.refunds.map((f) => (f.id === issued.id ? { ...f, arrivedAt: TODAY } : f)) }, TODAY);
    expect(after - before).toBeCloseTo(issued.confirmed!.amount, 2);
  });

  it("starts with private favorites and no fabricated social data", () => {
    expect(data.favoriteStores?.every((f) => ["private", "friends", "public"].includes(f.visibility))).toBe(true);
    expect(Object.keys(data)).not.toContain("socialPosts");
  });
});
