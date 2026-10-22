import { describe, expect, it } from "vitest";
import { buildDemoData } from "../demo/seed";
import { buildPriorities } from "./priorities";
import { ACTION_KINDS, todayPlan } from "./today";

const TODAY = "2026-10-20";
const data = buildDemoData(TODAY);

describe("Today plan", () => {
  const plan = todayPlan(data, TODAY);
  it("separates what needs you from what Penny is watching", () => {
    const actions = buildPriorities(data, TODAY).filter((p) => ACTION_KINDS.includes(p.kind));
    expect(plan.now.length + plan.later.length).toBe(actions.length);
    expect(plan.now.every((p) => p.daysLeft == null || p.daysLeft <= 7)).toBe(true);
    expect(plan.watching.length).toBeGreaterThan(0);
    // Nothing is both watched and a to-do for the same order.
    const nowOrders = new Set(plan.now.map((p) => p.detailHref));
    expect(plan.watching.some((w) => nowOrders.has(w.href) && !w.label)).toBe(false);
  });
  it("lists only upcoming events, in date order", () => {
    expect(plan.agenda.length).toBeGreaterThan(0);
    expect(plan.agenda.every((e) => e.date >= TODAY)).toBe(true);
    expect(plan.agenda.map((e) => e.date)).toEqual([...plan.agenda.map((e) => e.date)].sort());
  });
});
