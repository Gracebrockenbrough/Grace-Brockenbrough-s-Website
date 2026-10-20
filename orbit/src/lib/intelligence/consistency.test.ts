import { describe, expect, it } from "vitest";
import { buildDemoData } from "../demo/seed";
import { orderView, refundOutlook, stageIndex } from "../store/selectors";
import { ask } from "./ask";
import { calendarEvents, eventsOn, weekOf } from "./calendar";
import { insights, rangeFor } from "./insights";
import { buildPriorities, potentialReturnValue } from "./priorities";

const TODAY = "2026-10-20";
const data = buildDemoData(TODAY);
const view = (id: string) => orderView(data, data.orders.find((o) => o.id === id)!, TODAY);

describe("return stages", () => {
  it("maps each demo order to one current stage and next action", () => {
    expect(view("d-o-ref").current).toMatchObject({ key: "decide", group: "action", action: { label: "Start Return" }, estimated: false });
    expect(view("d-o-mad").current).toMatchObject({ key: "drop_off", group: "action", action: { label: "Show QR Code" } });
    expect(view("d-o-sep").current).toMatchObject({ label: "Refund needs checking", group: "action", action: { label: "Check Refund" } });
    expect(view("d-o-eve").current).toMatchObject({ label: "Deadline unknown", group: "action" });
    expect(view("d-o-jc").current).toMatchObject({ label: "Not delivered yet", group: "not_delivered" });
    expect(view("d-o-cos").current).toMatchObject({ key: "refund_confirmed", group: "history" });
    expect(stageIndex(view("d-o-mad"))).toBe(3);
  });

  it("classifies refund amounts as potential, expected or confirmed", () => {
    expect(refundOutlook(view("d-o-ref"))).toMatchObject({ amount: 180, kind: "potential" });
    expect(refundOutlook(view("d-o-sep"))).toMatchObject({ amount: 95, kind: "expected" });
    expect(refundOutlook(view("d-o-cos"))).toMatchObject({ amount: 89, kind: "confirmed" });
  });

  it("Today's to-dos and Returns agree on the same deadline", () => {
    const p = buildPriorities(data, TODAY).find((x) => x.retailerId === "reformation")!;
    expect(p.dueDate).toBe(view("d-o-ref").current.dueDate);
    expect(p.detailHref).toBe("/returns/purchase/?id=d-o-ref");
  });

  it("potential return value covers decisions and drop-offs in the next two weeks", () => {
    expect(potentialReturnValue(buildPriorities(data, TODAY))).toEqual({ amount: 318, count: 2 });
  });
});

describe("calendar", () => {
  const events = calendarEvents(data, TODAY);
  it("separates decision, drop-off and refund dates, each linked to its record", () => {
    expect(eventsOn(events, "2026-10-23")).toEqual([expect.objectContaining({ kind: "decide_by", certainty: "confirmed", href: "/returns/purchase/?id=d-o-ref" })]);
    expect(eventsOn(events, "2026-10-25")).toEqual([expect.objectContaining({ kind: "drop_off_by", href: "/returns/label/?id=d-r-mad" })]);
    expect(eventsOn(events, "2026-10-16")).toContainEqual(expect.objectContaining({ kind: "refund_expected", label: "Refund needs checking", certainty: "estimated" }));
  });
  it("marks estimated deadlines as estimated", () => {
    expect(events.find((e) => e.id === "decide:d-o-ari:d-i-ari-1")).toMatchObject({ certainty: "estimated", date: "2026-11-15" });
  });
  it("reflects changes to the underlying return", () => {
    const changed = { ...data, returns: data.returns.map((r) => (r.id === "d-r-mad" ? { ...r, status: "shipped" as const } : r)) };
    expect(eventsOn(calendarEvents(changed, TODAY), "2026-10-25")).toEqual([]);
  });
  it("builds Monday-start weeks", () => {
    expect(weekOf("2026-10-20")).toEqual(["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-10-25"]);
  });
});

describe("insights", () => {
  it("nets confirmed refunds without double-counting gift card spending", () => {
    const r = insights(data, rangeFor("year", TODAY));
    const items = data.orders.flatMap((o) => o.items).reduce((s, i) => s + (i.unitPrice ?? 0) * i.quantity, 0);
    expect(r.gross).toBe(items);
    expect(r.refundsToPayment).toBe(89);
    expect(r.refundsAsCredit).toBe(100);
    expect(r.net).toBe(items - 189);
    expect(r.creditSpent).toBe(25);
    expect(r.byCategory[0].label).toBe("Clothing");
  });
  it("respects the date range", () => {
    expect(insights(data, { from: "2026-10-15", to: TODAY }).orderCount).toBe(1); // J.Crew, ordered Oct 17
  });
});

describe("Ask Orbit, broader questions", () => {
  it("lists this week's returns", () => {
    const { intent, results } = ask("What returns do I have this week?", data, TODAY);
    expect(intent).toBe("agenda");
    expect(results.map((r) => r.retailerId)).toEqual(["sephora", "reformation", "madewell"]);
  });
  it("finds a label", () => {
    const r = ask("Find the label for my jeans", data, TODAY).results[0];
    expect(r.actions[0]).toEqual({ label: "Show QR Code", href: "/returns/label/?id=d-r-mad" });
  });
  it("answers spending questions from recorded orders", () => {
    const r = ask("How much did I spend on clothing this year?", data, TODAY).results[0];
    expect(r.answer).toMatch(/\$\d.* on clothing this year/);
    expect(r.href).toBe("/insights/");
  });
  it("understands plural credit questions", () => {
    const { intent, results } = ask("What gift cards do I have?", data, TODAY);
    expect(intent).toBe("credit");
    expect(results.map((r) => r.retailerId).sort()).toEqual(["aritzia", "reformation", "sephora", "zara"]);
  });
  it("links every result to its record", () => {
    expect(ask("Where is my black dress?", data, TODAY).results[0].href).toBe("/returns/purchase/?id=d-o-ref");
  });
});
