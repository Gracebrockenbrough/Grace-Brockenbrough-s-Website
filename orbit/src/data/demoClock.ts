import type { DemoTime } from "@/types";
import { parseDateTime } from "@/lib/time";

/**
 * The prototype runs on a fixed demo clock so the story ("Grace wakes up on
 * Friday, October 9") is the same every time it is opened. Replace with
 * `new Date()` once real integrations exist.
 */
export const DEMO_NOW_STR = "2026-10-09T08:12";
export const DEMO_TODAY = "2026-10-09";

/** The demo can show Friday morning, midday, or evening to show how ORBIT adapts. */
export const DEMO_TIMES: Record<DemoTime, string> = {
  morning: "2026-10-09T08:12",
  midday: "2026-10-09T13:05",
  evening: "2026-10-09T19:45",
};

export function demoNow(time: DemoTime = "morning"): Date {
  return parseDateTime(DEMO_TIMES[time] ?? DEMO_NOW_STR);
}
