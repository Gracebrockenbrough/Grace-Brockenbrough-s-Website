import type { InteractionSignal } from "@/types";

/**
 * A few weeks of Grace's past behavior, so the demo starts with a little
 * personalization already in place. New behavior is recorded on top of this.
 */
export const mockSignals: InteractionSignal[] = [
  // She opens Calendar in Week view almost every time.
  { id: "s1", itemType: "calendar", action: "view", at: "2026-09-28T08:40", context: { view: "week" } },
  { id: "s2", itemType: "calendar", action: "view", at: "2026-09-30T21:05", context: { view: "week" } },
  { id: "s3", itemType: "calendar", action: "view", at: "2026-10-01T08:15", context: { view: "day" } },
  { id: "s4", itemType: "calendar", action: "view", at: "2026-10-04T20:30", context: { view: "week" } },
  { id: "s5", itemType: "calendar", action: "view", at: "2026-10-06T09:10", context: { view: "week" } },
  { id: "s6", itemType: "calendar", action: "view", at: "2026-10-08T22:00", context: { view: "week" } },
  // She keeps dismissing Finance Club announcements.
  { id: "s7", itemType: "message", action: "dismiss", at: "2026-09-29T19:02", context: { sender: "Finance Club GroupMe" } },
  { id: "s8", itemType: "message", action: "dismiss", at: "2026-10-02T18:40", context: { sender: "Finance Club GroupMe" } },
  { id: "s9", itemType: "message", action: "dismiss", at: "2026-10-06T19:15", context: { sender: "Finance Club GroupMe" } },
  // She answers professors quickly.
  { id: "s10", itemType: "loop", action: "complete", at: "2026-09-24T10:20", context: { senderType: "professor", requiresResponse: "true", hoursOpen: "3" } },
  { id: "s11", itemType: "loop", action: "complete", at: "2026-10-01T16:05", context: { senderType: "professor", requiresResponse: "true", hoursOpen: "5" } },
  // She usually finishes big assignments about two days early.
  { id: "s12", itemType: "loop", action: "complete", at: "2026-09-23T20:00", context: { effort: "large", daysEarly: "2" } },
  { id: "s13", itemType: "loop", action: "complete", at: "2026-10-02T21:00", context: { effort: "large", daysEarly: "2" } },
];
