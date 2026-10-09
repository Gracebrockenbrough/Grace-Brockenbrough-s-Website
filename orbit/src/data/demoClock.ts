import { parseDateTime } from "@/lib/time";

/**
 * The prototype runs on a fixed demo clock so the story ("Grace wakes up on
 * Friday, October 9") is the same every time it is opened. Replace with
 * `new Date()` once real integrations exist.
 */
export const DEMO_NOW_STR = "2026-10-09T08:12";
export const DEMO_TODAY = "2026-10-09";

export function demoNow(): Date {
  return parseDateTime(DEMO_NOW_STR);
}
