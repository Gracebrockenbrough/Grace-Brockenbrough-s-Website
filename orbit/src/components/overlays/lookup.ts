import type { CalendarItem, RankedLoop } from "@/types";
import type { OrbitDerived } from "@/services/orbitEngine";
import type { OrbitState } from "@/store/state";
import { buildCalendarItems } from "@/services/calendar";
import { loopFromAssignment } from "@/services/priority";

/** Resolve a calendar item id (event, class instance, exam, deadline) to its current shape. */
export function findCalendarItem(id: string, state: OrbitState, derived: OrbitDerived): CalendarItem | undefined {
  const quick = derived.upcomingItems.find((i) => i.id === id);
  if (quick) return quick;
  let date: string | undefined;
  if (id.startsWith("class:")) date = id.split(":")[2];
  else if (id.startsWith("exam:")) date = state.exams.find((x) => x.id === id.slice(5))?.date;
  else date = state.events.find((e) => e.id === id)?.date;
  if (!date) return undefined;
  return buildCalendarItems(derived.calendarSource, date, date).find((i) => i.id === id);
}

/** Loops outside ORBIT's active window (e.g. an assignment in December) still open in details. */
export function findLoop(id: string, state: OrbitState, derived: OrbitDerived): RankedLoop | undefined {
  const found = derived.loops.find((l) => l.id === id);
  if (found) return found;
  if (id.startsWith("asg:")) {
    const a = state.assignments.find((x) => x.id === id.slice(4));
    if (!a) return undefined;
    const loop = loopFromAssignment(a, state.courses.find((c) => c.id === a.courseId), "2026-09-02T09:00");
    return { ...loop, priorityScore: 0, priority: "low", status: a.completed ? "done" : "later", snoozed: false, derivedFrom: "assignment", why: "It's on your syllabus. ORBIT will bring it up as it gets closer." };
  }
  return undefined;
}
