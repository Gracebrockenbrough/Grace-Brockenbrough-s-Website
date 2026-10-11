import type { CalendarItem, RankedLoop } from "@/types";
import { addDays, addMinutesToTime, datePart, diffDays, timePart, toTimeStr, weekday } from "@/lib/time";
import { findGaps } from "./calendar";

/**
 * The one helpful next step for a task. Orbit helps you do it; it never does
 * the outbound part (sending, booking) for you.
 */
export type NextStep = { kind: "draft"; label: string } | { kind: "find_time"; label: string } | { kind: "schedule"; label: string };

export function nextStepFor(loop: RankedLoop): NextStep | undefined {
  if (loop.status === "done" || loop.waitingOn) return undefined;
  if (loop.requiresResponse && loop.messageId) return { kind: "draft", label: loop.source.kind === "text" ? "Draft a text" : "Draft reply" };
  if (/\b(schedule|book|appointment)\b/i.test(loop.title) && !loop.deadline) return { kind: "schedule", label: "Help me schedule" };
  if ((loop.effortMinutes ?? 0) >= 30) return { kind: "find_time", label: "Find time" };
  return undefined;
}

export interface Slot {
  date: string;
  start: string;
  end: string;
}

/** Open windows before a task's deadline that fit the work, soonest first. */
export function findSlotsFor(loop: RankedLoop, items: CalendarItem[], now: Date, today: string, max = 3): Slot[] {
  const minutes = Math.min(Math.max(loop.effortMinutes ?? 60, 30), 120);
  const lastDay = loop.deadline ? datePart(loop.deadline) : addDays(today, 6);
  const span = Math.min(Math.max(diffDays(lastDay, today), 0), 7);
  const slots: Slot[] = [];
  for (let i = 0; i <= span && slots.length < max; i++) {
    const day = addDays(today, i);
    const weekend = weekday(day) === 0 || weekday(day) === 6;
    const dayEnd = loop.deadline && day === lastDay ? timePart(loop.deadline) ?? "21:00" : "21:00";
    const gaps = findGaps(items, day, {
      from: i === 0 ? toTimeStr(new Date(Math.ceil(now.getTime() / 900000) * 900000)) : undefined,
      dayStart: weekend ? "10:00" : "09:00",
      dayEnd: dayEnd > "21:00" ? "21:00" : dayEnd,
      minMinutes: minutes,
    });
    if (gaps[0]) slots.push({ date: day, start: gaps[0].start, end: addMinutesToTime(gaps[0].start, minutes) });
  }
  return slots;
}

/** Short daytime windows for a phone call (offices are open 9–5 on weekdays). */
export function callSlots(items: CalendarItem[], now: Date, today: string, max = 3): Slot[] {
  const slots: Slot[] = [];
  for (let i = 0; i < 7 && slots.length < max; i++) {
    const day = addDays(today, i);
    if (weekday(day) === 0 || weekday(day) === 6) continue;
    const gap = findGaps(items, day, { from: i === 0 ? toTimeStr(now) : undefined, dayStart: "09:00", dayEnd: "17:00", minMinutes: 15 })[0];
    if (gap) slots.push({ date: day, start: gap.start, end: addMinutesToTime(gap.start, 15) });
  }
  return slots;
}
