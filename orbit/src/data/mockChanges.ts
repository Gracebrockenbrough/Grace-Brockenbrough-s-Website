import type { ExtractedFact } from "@/types";

/**
 * Facts ORBIT extracted from incoming messages. The engine compares each fact
 * with what it already knows and creates a DetectedChange when they differ.
 */
export const mockFacts: ExtractedFact[] = [
  {
    id: "f-fin-midterm",
    entityType: "exam",
    entityId: "e-fin-mid",
    field: "datetime",
    value: { date: "2026-10-13", startTime: "08:00", endTime: "09:30" },
    source: { kind: "email", label: "Professor Reyes email", ref: "m-reyes" },
    confidence: 0.94,
    quote: "Reminder: the exam has been moved to Tuesday, October 13 at 8:00 AM in Huntley 327.",
  },
  {
    id: "f-bus-case",
    entityType: "assignment",
    entityId: "a-bus-case",
    field: "datetime",
    value: { date: "2026-10-14", startTime: "23:59" },
    source: { kind: "groupme", label: "BUS 304 Team GroupMe", ref: "m-bus-groupme" },
    confidence: 0.45,
    quote: "wait did prof say the case write-up is due wednesday now?? not tuesday",
  },
];
