import type {
  Assignment,
  CalendarEvent,
  CalendarItem,
  Conflict,
  Course,
  DetectedChange,
  Exam,
  FreeTimeSuggestion,
  RankedLoop,
} from "@/types";
import { noClassDates } from "@/data/mockCourses";
import {
  addDays,
  addMinutesToTime,
  datePart,
  daysInRange,
  diffDays,
  actionPhrase,
  formatDuration,
  formatShortDate,
  formatTime,
  fromMinutes,
  relativeDay,
  timePart,
  toDateStr,
  toMinutes,
  toTimeStr,
  weekday,
} from "@/lib/time";

const SEMESTER_START = "2026-08-31";
const SEMESTER_END = "2026-12-04";

export interface CalendarSource {
  courses: Course[];
  events: CalendarEvent[];
  exams: Exam[];
  assignments: Assignment[];
  loops: RankedLoop[];
  pendingChanges: DetectedChange[];
}

/** Every item on the calendar between two dates (inclusive), sorted by time. */
export function buildCalendarItems(src: CalendarSource, start: string, end: string): CalendarItem[] {
  const items: CalendarItem[] = [];
  const days = daysInRange(start, diffDays(end, start) + 1);
  const inRange = (d: string) => d >= start && d <= end;

  for (const e of src.events) {
    const last = e.endDate ?? e.date;
    if (last < start || e.date > end) continue;
    items.push({ ...e, kind: "event", refId: e.id });
  }

  for (const day of days) {
    if (day < SEMESTER_START || day > SEMESTER_END || noClassDates.includes(day)) continue;
    for (const course of src.courses) {
      if (!course.meetingDays.includes(weekday(day) as Course["meetingDays"][number])) continue;
      const examSameSlot = src.exams.some(
        (x) => x.courseId === course.id && x.date === day && x.startTime && overlaps(x.startTime, x.endTime ?? x.startTime, course.startTime, course.endTime),
      );
      if (examSameSlot) continue;
      items.push({
        id: `class:${course.id}:${day}`,
        refId: course.id,
        kind: "class",
        title: course.code,
        date: day,
        startTime: course.startTime,
        endTime: course.endTime,
        category: "class",
        source: { kind: "calendar", label: "Class schedule" },
        location: course.location,
        hardCommitment: true,
        confidence: 1,
        courseId: course.id,
      });
    }
  }

  for (const x of src.exams) {
    if (!x.date || !inRange(x.date)) continue;
    const pending = src.pendingChanges.find((c) => c.entityId === x.id);
    items.push({
      id: `exam:${x.id}`,
      refId: x.id,
      kind: "exam",
      title: x.title,
      date: x.date,
      startTime: x.startTime,
      endTime: x.endTime,
      category: "exam",
      source: x.source,
      location: x.location,
      hardCommitment: true,
      confidence: x.confidence,
      courseId: x.courseId,
      major: true,
      pendingChange: pending?.id,
    });
  }

  for (const a of src.assignments) {
    if (!a.due) continue;
    const d = datePart(a.due);
    if (!inRange(d)) continue;
    const course = src.courses.find((c) => c.id === a.courseId);
    const pending = src.pendingChanges.find((c) => c.entityId === a.id);
    items.push({
      id: `deadline:${a.id}`,
      refId: `asg:${a.id}`,
      kind: "deadline",
      title: course ? `${a.title} due` : a.title,
      date: d,
      startTime: timePart(a.due),
      category: "deadline",
      source: a.source,
      hardCommitment: true,
      confidence: a.confidence,
      courseId: a.courseId,
      major: a.effort === "large",
      pendingChange: pending?.id,
      ...(a.completed ? { title: `${a.title} — done` } : {}),
    });
  }

  for (const l of src.loops) {
    if (l.derivedFrom !== "loop" || !l.deadline || !l.hardDeadline || l.status === "done") continue;
    const d = datePart(l.deadline);
    if (!inRange(d)) continue;
    items.push({
      id: `deadline:${l.id}`,
      refId: l.id,
      kind: "deadline",
      title: l.title,
      date: d,
      startTime: timePart(l.deadline),
      category: "deadline",
      source: l.source,
      hardCommitment: true,
      confidence: l.confidence,
      major: l.consequence === "professional" || l.consequence === "financial",
    });
  }

  return items.sort((a, b) => (a.date + (a.startTime ?? "00:00")).localeCompare(b.date + (b.startTime ?? "00:00")));
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

const isTimed = (i: CalendarItem) => !!i.startTime && !!i.endTime && i.kind !== "deadline";

// ---------------------------------------------------------------------------
// Conflicts
// ---------------------------------------------------------------------------

export function conflictId(a: string, b: string): string {
  return `time:${[a, b].sort().join("|")}`;
}

/** Time conflicts: eventA.start < eventB.end && eventB.start < eventA.end. */
export function detectTimeConflicts(items: CalendarItem[]): Conflict[] {
  const timed = items.filter(isTimed);
  const conflicts: Conflict[] = [];
  for (let i = 0; i < timed.length; i++) {
    for (let j = i + 1; j < timed.length; j++) {
      const a = timed[i];
      const b = timed[j];
      if (a.date !== b.date) continue;
      if (!overlaps(a.startTime!, a.endTime!, b.startTime!, b.endTime!)) continue;
      const overlap = Math.min(toMinutes(a.endTime!), toMinutes(b.endTime!)) - Math.max(toMinutes(a.startTime!), toMinutes(b.startTime!));
      conflicts.push({
        id: conflictId(a.id, b.id),
        type: "time",
        title: "Schedule conflict",
        summary: `Your ${lower(a.title)} overlaps with your ${lower(b.title)}.`,
        date: a.date,
        itemIds: [a.id, b.id],
        items: [a, b],
        overlapMinutes: overlap,
        severity: a.hardCommitment && b.hardCommitment ? "high" : "medium",
      });
    }
  }
  return conflicts;
}

function lower(title: string): string {
  return /^[A-Z]{2,}/.test(title) ? title : title.charAt(0).toLowerCase() + title.slice(1);
}

const isBig = (i: CalendarItem, assignments: Assignment[]) => {
  if (i.kind === "exam") return true;
  if (i.kind !== "deadline" || !i.refId.startsWith("asg:")) return false;
  const a = assignments.find((x) => x.id === i.refId.slice(4));
  return !!a && !a.completed && a.effort !== "small";
};

/** Workload conflicts: three or more big items inside two consecutive days. */
export function detectWorkloadConflicts(items: CalendarItem[], assignments: Assignment[], today: string): Conflict[] {
  const conflicts: Conflict[] = [];
  const big = items.filter((i) => isBig(i, assignments) && i.date > today);
  const seen = new Set<string>();
  for (const anchor of big) {
    const window = big.filter((i) => i.date >= anchor.date && diffDays(i.date, anchor.date) <= 1);
    if (window.length < 3) continue;
    const key = window.map((w) => w.id).sort().join("|");
    if ([...seen].some((s) => key.split("|").every((k) => s.includes(k)))) continue;
    seen.add(key);
    const lastDate = window[window.length - 1].date;
    const name = (d: string) => (diffDays(lastDate, today) >= 7 ? formatShortDate(d) : relativeDay(d, today));
    const span = anchor.date === lastDate ? name(anchor.date) : `${name(anchor.date)} and ${name(lastDate)}`;
    conflicts.push({
      id: `workload:${anchor.date}:${window.length}`,
      type: "workload",
      title: "Busy stretch ahead",
      summary: `${span} have ${window.length} big things due: ${window.map((w) => shortTitle(w)).join(", ")}.`,
      date: anchor.date,
      itemIds: window.map((w) => w.id),
      items: window,
      severity: "medium",
    });
  }
  return conflicts;
}

function shortTitle(i: CalendarItem): string {
  return i.title.replace(/ due$/, "");
}

/** Forgotten preparation: an exam soon with no study time planned. */
export function detectPrepGaps(exams: Exam[], events: CalendarEvent[], courses: Course[], today: string, horizonDays = 5): Conflict[] {
  return exams
    .filter((x) => x.date && x.date > today && diffDays(x.date, today) <= horizonDays)
    .filter((x) => !events.some((e) => e.category === "study" && (e.prepForExamId === x.id || (e.courseId === x.courseId && e.suggestedByOrbit)) && e.date >= today && e.date <= x.date!))
    .map((x) => {
      const course = courses.find((c) => c.id === x.courseId);
      return {
        id: `prep:${x.id}`,
        type: "prep" as const,
        title: "No study time yet",
        summary: `${course?.code ?? ""} ${x.title.replace(course?.code ?? "", "").trim()} is ${relativeDay(x.date!, today)}, and there's no study time on your calendar.`.trim(),
        date: x.date,
        itemIds: [x.id],
        severity: "medium" as const,
      };
    });
}

export function detectMissingInfo(exams: Exam[], assignments: Assignment[], courses: Course[]): Conflict[] {
  const missing: Conflict[] = [];
  for (const x of exams) {
    if (x.date) continue;
    const course = courses.find((c) => c.id === x.courseId);
    missing.push({
      id: `missing:${x.id}`,
      type: "missing_info",
      title: "Missing information",
      summary: `The ${course?.code ?? ""} syllabus lists “${x.title.replace(course?.code ?? "", "").trim()}” but no date.`,
      itemIds: [x.id],
      severity: "low",
    });
  }
  for (const a of assignments) {
    if (a.due || a.completed) continue;
    const course = courses.find((c) => c.id === a.courseId);
    missing.push({
      id: `missing:${a.id}`,
      type: "missing_info",
      title: "Missing information",
      summary: `The ${course?.code ?? ""} syllabus mentions “${a.title}” without a clear date.`,
      itemIds: [a.id],
      severity: "low",
    });
  }
  return missing;
}

// ---------------------------------------------------------------------------
// Free time
// ---------------------------------------------------------------------------

export interface Gap {
  date: string;
  start: string;
  end: string;
  minutes: number;
}

/** Unscheduled windows on a day, ignoring deadlines (they don't take time). */
export function findGaps(items: CalendarItem[], date: string, opts: { from?: string; dayStart?: string; dayEnd?: string; minMinutes?: number } = {}): Gap[] {
  const dayStart = toMinutes(opts.dayStart ?? "08:00");
  const dayEnd = toMinutes(opts.dayEnd ?? "21:00");
  const from = Math.max(dayStart, opts.from ? toMinutes(opts.from) : 0);
  const min = opts.minMinutes ?? 30;
  const blocks = items
    .filter((i) => i.date === date && isTimed(i))
    .map((i) => [toMinutes(i.startTime!), toMinutes(i.endTime!)] as const)
    .sort((a, b) => a[0] - b[0]);

  const gaps: Gap[] = [];
  let cursor = from;
  for (const [s, e] of blocks) {
    if (s > cursor && s - cursor >= min && cursor < dayEnd) {
      gaps.push({ date, start: fromMinutes(cursor), end: fromMinutes(Math.min(s, dayEnd)), minutes: Math.min(s, dayEnd) - cursor });
    }
    cursor = Math.max(cursor, e);
  }
  if (dayEnd - cursor >= min) gaps.push({ date, start: fromMinutes(cursor), end: fromMinutes(dayEnd), minutes: dayEnd - cursor });
  return gaps.filter((g) => g.minutes >= min);
}

function roundUpTo5(time: string): string {
  const m = toMinutes(time);
  return fromMinutes(Math.ceil(m / 5) * 5);
}

interface SuggestInput {
  date: string;
  items: CalendarItem[];
  loops: RankedLoop[];
  exams: Exam[];
  events: CalendarEvent[];
  courses: Course[];
  today: string;
  now: Date;
  minMinutes?: number;
  max?: number;
}

/**
 * Suggest how to use free windows on a day. Helpful, not controlling: at most a
 * couple of suggestions, never filling every minute.
 */
export function suggestFreeTime(input: SuggestInput): FreeTimeSuggestion[] {
  const { date, items, loops, exams, events, courses, today, now } = input;
  const isToday = date === today;
  const gaps = findGaps(items, date, {
    from: isToday ? roundUpTo5(toTimeStr(now)) : undefined,
    dayStart: weekday(date) === 0 || weekday(date) === 6 ? "10:00" : "08:00",
    minMinutes: input.minMinutes ?? 60,
  });
  if (date < today) return [];

  const planned = new Set(events.filter((e) => e.loopId).map((e) => e.loopId));
  const preppedExams = new Set(events.filter((e) => e.prepForExamId).map((e) => e.prepForExamId));
  const used = new Set<string>();
  const out: FreeTimeSuggestion[] = [];

  for (const gap of gaps) {
    if (out.length >= (input.max ?? 1)) break;
    const gapStartDT = `${gap.date}T${gap.start}`;

    const loopCandidate = loops.find(
      (l) =>
        (l.status === "now" || l.status === "soon") &&
        !l.snoozed &&
        !planned.has(l.id) &&
        !used.has(l.id) &&
        !l.requiresResponse &&
        (l.effortMinutes ?? 30) <= gap.minutes &&
        (l.effortMinutes ?? 0) >= 20 &&
        (!l.deadline || l.deadline > gapStartDT),
    );

    const exam = exams
      .filter((x) => x.date && x.date > date && diffDays(x.date, date) <= 4 && !preppedExams.has(x.id) && !used.has(x.id))
      .sort((a, b) => a.date!.localeCompare(b.date!))[0];

    const loopIsUrgent = loopCandidate && loopCandidate.deadline && datePart(loopCandidate.deadline) <= addDays(date, 1);

    if (loopCandidate && (loopIsUrgent || !exam)) {
      used.add(loopCandidate.id);
      const minutes = Math.min(gap.minutes, Math.max(loopCandidate.effortMinutes ?? 60, 30));
      const due = loopCandidate.deadline;
      const dueToday = due && datePart(due) === date;
      out.push({
        id: `free:${date}:${gap.start}`,
        date,
        start: gap.start,
        end: gap.end,
        minutes: gap.minutes,
        title: `You have ${formatDuration(gap.minutes)} free at ${formatTime(gap.start)}.`,
        detail: dueToday
          ? `Good time to ${actionPhrase(loopCandidate.title)} before it's due ${timePart(due!) === "23:59" ? "tonight" : `at ${formatTime(timePart(due!))}`}.`
          : `Good time to ${actionPhrase(loopCandidate.title)}. It takes about ${formatDuration(loopCandidate.effortMinutes ?? 30)}.`,
        why: dueToday
          ? `It's due today, and this is your longest open window before the deadline.`
          : `It's one of your top open loops and fits in this window.`,
        loopId: loopCandidate.id,
        courseId: loopCandidate.courseId,
        planTitle: loopCandidate.title,
        planEnd: addMinutesToTime(gap.start, minutes),
      });
      continue;
    }

    if (exam) {
      used.add(exam.id);
      const course = courses.find((c) => c.id === exam.courseId);
      const minutes = Math.min(gap.minutes, 90);
      out.push({
        id: `free:${date}:${gap.start}`,
        date,
        start: gap.start,
        end: gap.end,
        minutes: gap.minutes,
        title: `You have ${formatDuration(gap.minutes)} free at ${formatTime(gap.start)}.`,
        detail: `Good time to review for ${relativeDay(exam.date!, date) === "Tomorrow" ? "tomorrow's" : `${relativeDay(exam.date!, date)}'s`} ${course?.name ?? ""} exam.`.replace("  ", " "),
        why: `You have ${formatDuration(gap.minutes)} open and your ${course?.code ?? ""} exam is ${relativeDay(exam.date!, today)} with no study time planned.`,
        courseId: exam.courseId,
        planTitle: `Study for ${course?.code ?? "exam"}`,
        planEnd: addMinutesToTime(gap.start, minutes),
        loopId: `exam:${exam.id}`,
      });
    }
  }
  return out;
}

function lowerFirst(s: string): string {
  return /^[A-Z]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

/** Best study window before an exam (used by "Find time"). */
export function findStudySlot(items: CalendarItem[], from: string, before: string, minutes = 90): Gap | undefined {
  const days = daysInRange(from, Math.max(diffDays(before, from), 1));
  // Prefer the day before the exam, then work backwards.
  for (const day of [...days].reverse()) {
    if (day >= before) continue;
    const weekend = weekday(day) === 0 || weekday(day) === 6;
    const gap = findGaps(items, day, { dayStart: weekend ? "14:00" : "15:00", dayEnd: "21:00", minMinutes: minutes })[0];
    if (gap) return { ...gap, end: addMinutesToTime(gap.start, minutes), minutes };
  }
  return undefined;
}

export function todayStr(now: Date): string {
  return toDateStr(now);
}
