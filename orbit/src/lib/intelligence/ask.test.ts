import { describe, expect, it } from "vitest";
import { buildDemoData } from "../demo/seed";
import { ask, detectIntent } from "./ask";

const TODAY = "2026-10-20";
const data = buildDemoData(TODAY);

describe("Ask Tote", () => {
  it("finds the dress from a vague description, without an order number", () => {
    const { intent, results } = ask("I think I ordered a red dress from somewhere but I want to return it, when do I need to?", data, TODAY);
    expect(intent).toBe("deadline");
    expect(results[0]).toMatchObject({ id: "d-o-ref:d-i-ref-1", retailerId: "reformation" });
    expect(results[0].answer).toContain("RF-48213907");
    expect(results[0].answer).toContain("Return it by Oct 23");
    expect(results[0].note).toMatch(/listed as black/);
  });

  it("matches synonyms and store names", () => {
    expect(ask("the denim I need to drop off", data, TODAY).results[0].id).toBe("d-o-mad:d-i-mad-1");
    expect(ask("aritzia jumper", data, TODAY).results[0].id).toBe("d-o-ari:d-i-ari-1");
    expect(ask("my flats", data, TODAY).results[0].id).toBe("d-o-eve:d-i-eve-1");
  });

  it("answers refund questions from what Tote actually knows", () => {
    const r = ask("did I get my Sephora money back?", data, TODAY).results[0];
    expect(r.retailerId).toBe("sephora");
    expect(r.answer).toMatch(/no refund email/i);
  });

  it("lists credits for money questions", () => {
    const { intent, results } = ask("how much gift card money do I have?", data, TODAY);
    expect(intent).toBe("credit");
    expect(results.every((r) => r.kind === "credit")).toBe(true);
  });

  it("returns nothing rather than guessing", () => {
    expect(ask("blue umbrella", data, TODAY).results).toEqual([]);
  });

  it("detects intent", () => {
    expect(detectIntent("where's my QR code")).toBe("label");
    expect(detectIntent("send back the sweater")).toBe("return");
  });
});
