import { describe, expect, it } from "vitest";
import { buildDemoData } from "../demo/seed";
import { orderView } from "../store/selectors";
import { insights, isPartial, previousPeriod, rangeFor } from "./insights";
import { orderJourney } from "./journey";

const TODAY = "2026-10-20";
const data = buildDemoData(TODAY);
const view = (id: string) => orderView(data, data.orders.find((o) => o.id === id)!, TODAY);

describe("order journey", () => {
  it("shows only the stages that apply, with refunds never assumed received", () => {
    const steps = orderJourney(data, view("d-o-sep")).map((s) => [s.key, s.state]);
    expect(steps.map((s) => s[0])).toEqual(["purchased", "shipped", "delivered", "started", "label", "dropped", "received", "issued", "arrived"]);
    expect(steps.find((s) => s[0] === "arrived")?.[1]).toBe("upcoming");
  });
  it("doesn't invent return stages for an order with no return", () => {
    const keys = orderJourney(data, view("d-o-ref")).map((s) => s.key);
    expect(keys).not.toContain("started");
    expect(keys.at(-1)).toBe("window");
  });
  it("marks a kept order as kept", () => {
    const o = data.orders.find((x) => x.id === "d-o-ref")!;
    const kept = { ...data, orders: data.orders.map((x) => (x.id === o.id ? { ...x, keptItemIds: x.items.map((i) => i.id) } : x)) };
    expect(orderJourney(kept, orderView(kept, kept.orders.find((x) => x.id === o.id)!, TODAY)).at(-1)?.key).toBe("kept");
  });
});

describe("insights periods and money language", () => {
  it("compares an unfinished month with the same stretch of last month", () => {
    const r = rangeFor("month", TODAY);
    expect(previousPeriod("month", r)).toEqual({ from: "2026-09-01", to: "2026-09-20" });
    expect(previousPeriod("year", rangeFor("year", TODAY))).toEqual({ from: "2025-01-01", to: "2025-10-20" });
    expect(previousPeriod("month", { from: "2026-03-01", to: "2026-03-31" })).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(isPartial("month", r, TODAY)).toBe(true);
  });
  it("separates refunds received, refunds awaiting confirmation and store credit", () => {
    const y = insights(data, rangeFor("year", TODAY));
    expect(y.refundsReceived + y.refundsAwaitingConfirmation).toBeCloseTo(y.refundsToPayment, 2);
    expect(y.net).toBeCloseTo(y.gross - y.refundsToPayment - y.refundsAsCredit, 2);
  });
});

describe("Discover privacy", () => {
  it("lists never carry prices, order ids or dates, and others' lists are labeled demo", () => {
    const cols = data.collections ?? [];
    expect(JSON.stringify(cols)).not.toMatch(/unitPrice|"amount"|purchasedAt|orderId/);
    expect(cols.filter((c) => c.ownerId).every((c) => c.demo)).toBe(true);
  });
  it("you have your own lists", () => {
    expect(cols().length).toBeGreaterThan(0);
  });
});

const cols = () => (data.collections ?? []).filter((c) => !c.ownerId);
