import { describe, expect, it } from "vitest";
import { buildDemoData } from "../demo/seed";
import type { Order, ReturnPolicy } from "../domain/types";
import { buildPriorities, orderAssessments, weeklySummary } from "./priorities";
import { assessDeadline, assessItem, returnFacts } from "./returns";

const TODAY = "2026-10-20";
const data = buildDemoData(TODAY);
const policy = (id: string) => data.policies.find((p) => p.retailerId === id)!;
const order = (id: string) => data.orders.find((o) => o.id === id)!;

describe("assessDeadline", () => {
  it("uses a retailer-stated deadline as confirmed", () => {
    const o = order("d-o-ref");
    const d = assessDeadline(o, o.items[0], policy("reformation"), TODAY);
    expect(d).toMatchObject({ kind: "confirmed", date: "2026-10-23", daysLeft: 3 });
  });

  it("estimates from policy + known delivery date", () => {
    const o = order("d-o-ari");
    const d = assessDeadline(o, o.items[0], policy("aritzia"), TODAY);
    expect(d).toMatchObject({ kind: "estimated", date: "2026-11-15", daysLeft: 26 });
  });

  it("never fabricates a deadline when the delivery date is missing", () => {
    const o = order("d-o-eve");
    const d = assessDeadline(o, o.items[0], policy("everlane"), TODAY);
    expect(d.kind).toBe("unknown");
  });

  it("reports a not-yet-started window for orders in transit", () => {
    const o = order("d-o-jc");
    expect(assessDeadline(o, o.items[0], policy("jcrew"), TODAY).kind).toBe("not_started");
  });

  it("returns unknown without a policy", () => {
    const o = order("d-o-ari");
    expect(assessDeadline(o, o.items[0], null, TODAY)).toMatchObject({ kind: "unknown", missing: "policy" });
  });

  it("applies category-specific shorter windows", () => {
    const p: ReturnPolicy = { ...policy("aritzia"), exceptions: [{ kind: "shorter_window", category: "clothing", windowDays: 14, description: "14 days" }] };
    const o = order("d-o-ari");
    expect(assessDeadline(o, o.items[0], p, TODAY)).toMatchObject({ kind: "estimated", date: "2026-10-30" });
  });

  it("flags stale policies", () => {
    const o = order("d-o-ari");
    const p = { ...policy("aritzia"), lastCheckedAt: "2026-01-01" };
    const d = assessDeadline(o, o.items[0], p, TODAY);
    expect(d.kind === "estimated" && d.staleAfter).toBeTruthy();
  });
});

describe("assessItem", () => {
  it("marks final-sale items ineligible", () => {
    const o: Order = { ...order("d-o-ari"), items: [{ ...order("d-o-ari").items[0], finalSale: true }] };
    expect(assessItem(o, o.items[0], policy("aritzia"), [], TODAY)).toMatchObject({ eligibility: "ineligible", stage: "not_returnable" });
  });

  it("marks items past the window as closed", () => {
    const o = order("d-o-ref");
    expect(assessItem(o, o.items[0], policy("reformation"), [], "2026-10-25").eligibility).toBe("window_closed");
  });

  it("puts items with an active return in 'returning'", () => {
    expect(orderAssessments(data, "d-o-mad", TODAY)[0].stage).toBe("returning");
    expect(orderAssessments(data, "d-o-cos", TODAY)[0].stage).toBe("completed");
  });
});

describe("returnFacts", () => {
  it("waives fees for store credit only when the policy says so", () => {
    expect(returnFacts(policy("aritzia"), { dropOff: "ups", refund: "original_payment" }).fee).toBe(7.5);
    expect(returnFacts(policy("aritzia"), { dropOff: "ups", refund: "store_credit" }).fee).toBe(0);
    expect(returnFacts(policy("everlane"), { dropOff: "ups", refund: "original_payment" }).fee).toBeNull();
  });
});

describe("priorities", () => {
  it("ranks the confirmed Reformation deadline first and skips promotions", () => {
    const p = buildPriorities(data, TODAY);
    expect(p[0]).toMatchObject({ retailerId: "reformation", kind: "return_deadline", action: { label: "Prepare Return" } });
    expect(p.map((x) => x.kind)).toEqual(expect.arrayContaining(["refund_attention", "return_action", "credit_expiring", "missing_info"]));
  });

  it("does not repeat dismissed reminders", () => {
    const first = buildPriorities(data, TODAY)[0];
    const after = buildPriorities({ ...data, dismissed: [first.key] }, TODAY);
    expect(after.find((x) => x.key === first.key)).toBeUndefined();
  });

  it("respects notification preferences", () => {
    const p = buildPriorities(data, TODAY, { ...data.prefs, refunds: false });
    expect(p.find((x) => x.kind === "refund_attention")).toBeUndefined();
  });

  it("writes a calm weekly summary", () => {
    expect(weeklySummary(data, TODAY)).toMatch(/returns need attention this week\. .*refund/);
  });
});
