import type { DemoTime } from "@/types";
import { demoNow } from "@/data/demoClock";
import { toDateStr, toDateTimeStr } from "./time";

/**
 * One clock for the whole app. Real accounts run on the real time; the
 * sample-data demo runs on its fixed Friday so the story stays the same.
 * The provider configures it before computing anything.
 */
let live = false;
let demoTime: DemoTime = "morning";

export function configureClock(isLive: boolean, time: DemoTime = "morning") {
  live = isLive;
  demoTime = time;
}

export const isLiveClock = () => live;
export const now = (): Date => (live ? new Date() : demoNow(demoTime));
export const nowStr = () => toDateTimeStr(now());
export const todayStr = () => toDateStr(now());
