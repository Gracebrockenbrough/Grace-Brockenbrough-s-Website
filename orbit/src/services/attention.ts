import type {
  AttentionItem,
  CalendarItem,
  Conflict,
  Course,
  DetectedChange,
  FreeTimeSuggestion,
  Message,
  MorningBrief,
  Preferences,
  RankedLoop,
} from "@/types";
import { datePart, diffDays, formatShortDate, hoursBetween, parseDateTime, formatTime, formatTimeRange, relativeDateTime, relativeDay, timePart } from "@/lib/time";
import { describeWhen } from "./changes";

interface AttentionInput {
  changes: DetectedChange[];
  conflicts: Conflict[];
  loops: RankedLoop[];
  priorities: RankedLoop[];
  courses: Course[];
  dismissed: string[];
  prefs: Preferences;
  today: string;
  now: Date;
}

/**
 * "Needs Attention" holds exceptions, not normal tasks: changes, conflicts,
 * deadlines that could slip, and gaps in what ORBIT knows.
 */
export function buildAttention(input: AttentionInput): AttentionItem[] {
  const { changes, conflicts, loops, priorities, dismissed, prefs, today } = input;
  const items: AttentionItem[] = [];

  for (const c of changes) {
    const confident = c.confidence >= 0.8;
    items.push({
      id: c.id,
      kind: confident ? "change" : "possible_change",
      label: confident ? "Important change" : "Possible change",
      title: confident ? `${c.title} appears to have moved` : `${c.title} may have moved`,
      body: `${describeWhen(c.previousValue)} → ${describeWhen(c.newValue)}`,
      why: confident
        ? `${c.source.label} says the date changed, and it doesn't match your calendar.`
        : `A classmate mentioned it in ${c.source.label}. Your professor hasn't confirmed it, so ORBIT hasn't changed anything.`,
      weight: confident ? 95 : 55,
      refId: c.id,
    });
  }

  for (const c of conflicts) {
    if (c.type === "time") {
      const [a, b] = c.items ?? [];
      const within = c.date ? diffDays(c.date, today) : 0;
      if (within > 7) continue;
      items.push({
        id: c.id,
        kind: "conflict",
        label: "Schedule conflict",
        title: `${a?.title} and ${b?.title?.toLowerCase()} overlap`,
        body: `${relativeDay(c.date!, today)} · ${formatTimeRange(a?.startTime, a?.endTime)} and ${formatTimeRange(b?.startTime, b?.endTime)}`,
        why: `Both are on your calendar ${relativeDay(c.date!, today)} and overlap by ${c.overlapMinutes} minutes.`,
        weight: 85 - within,
        refId: c.id,
      });
    } else if (c.type === "workload") {
      items.push({
        id: c.id,
        kind: "workload",
        label: "Busy stretch ahead",
        title: c.summary.split(":")[0],
        body: c.summary.split(":")[1]?.trim() ?? "",
        why: "Several graded deadlines land close together. Starting early spreads out the work.",
        weight: 58,
        refId: c.id,
      });
    } else if (c.type === "prep") {
      items.push({
        id: c.id,
        kind: "prep",
        label: "No study time yet",
        title: c.summary,
        body: "ORBIT can find a window for you.",
        why: "Exams go better with planned review time, and your calendar doesn't have any yet.",
        weight: 64,
        refId: c.id,
      });
    } else if (c.type === "missing_info") {
      items.push({
        id: c.id,
        kind: "missing_info",
        label: "Missing information",
        title: c.summary,
        body: "Add the date when you know it, or ORBIT will watch for an announcement.",
        why: "ORBIT can't plan around something without a date.",
        weight: 28,
        refId: c.id,
      });
    }
  }

  const priorityIds = new Set(priorities.map((p) => p.id));
  for (const l of loops) {
    if (priorityIds.has(l.id) || l.status === "done" || l.snoozed || !l.hardDeadline || !l.deadline) continue;
    if (l.derivedFrom === "assignment") continue;
    const hours = hoursBetween(input.now, parseDateTime(l.deadline));
    if (hours < 0 || hours > 96) continue;
    items.push({
      id: `deadline:${l.id}`,
      kind: "deadline",
      label: "Upcoming deadline",
      title: capitalize(`${l.title.replace(/^Submit /, "")} ${verbFor(l.title)} ${relativeDay(datePart(l.deadline), today)}`),
      body: l.blocks ? `${l.blocks} depends on it.` : l.description ?? "",
      why: l.why ?? "It has a hard deadline coming up.",
      weight: 70,
      refId: l.id,
    });
  }

  return items
    .filter((i) => !dismissed.includes(i.id))
    .map((i) => ({ ...i, weight: i.weight + (prefs.recommendationAdjust[`attention:${i.kind}`] ?? 0) }))
    .filter((i) => i.weight > 10)
    .sort((a, b) => b.weight - a.weight);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function verbFor(title: string): string {
  return /form|application/i.test(title) ? "closes" : "is due";
}

// ---------------------------------------------------------------------------
// Coming up
// ---------------------------------------------------------------------------

export interface ComingUpGroup {
  date: string;
  label: string;
  items: { id: string; title: string; detail: string; kind: CalendarItem["kind"]; refId: string }[];
}

/** A handful of high-level things in the next week. Not a second calendar. */
export function buildComingUp(items: CalendarItem[], today: string, excludeRefIds: Set<string> = new Set(), maxItems = 6): ComingUpGroup[] {
  const significant = items.filter(
    (i) =>
      !excludeRefIds.has(i.refId) &&
      i.date > today &&
      diffDays(i.date, today) <= 7 &&
      (i.kind === "exam" ||
        (i.kind === "deadline" && (i.major || i.refId.startsWith("asg:") || i.refId.startsWith("l-"))) ||
        i.category === "appointment" ||
        i.category === "travel" ||
        i.major),
  );
  const groups: ComingUpGroup[] = [];
  let count = 0;
  for (const i of significant) {
    if (count >= maxItems) break;
    if (i.title.endsWith("— done")) continue;
    let group = groups.find((g) => g.date === i.date);
    if (!group) {
      group = { date: i.date, label: relativeDay(i.date, today), items: [] };
      groups.push(group);
    }
    group.items.push({
      id: i.id,
      title: i.title.replace(/ due$/, ""),
      detail: i.kind === "deadline" ? (i.startTime && i.startTime !== "23:59" ? `Due ${formatTime(i.startTime)}` : "Due by midnight") : formatTime(i.startTime) || "All day",
      kind: i.kind,
      refId: i.refId,
    });
    count++;
  }
  return groups;
}

// ---------------------------------------------------------------------------
// Morning Brief
// ---------------------------------------------------------------------------

interface BriefInput {
  name: string;
  priorities: RankedLoop[];
  todayItems: CalendarItem[];
  conflicts: Conflict[];
  changes: DetectedChange[];
  freeTime: FreeTimeSuggestion[];
  upcoming: CalendarItem[];
  needsReply: Message[];
  today: string;
}

export function createMorningBrief(input: BriefInput): MorningBrief {
  const { priorities, todayItems, changes, freeTime, upcoming, today } = input;
  const classes = todayItems.filter((i) => i.kind === "class").length;
  const meetings = todayItems.filter((i) => i.category === "meeting" || i.category === "appointment").length;
  const social = todayItems.filter((i) => (i.category === "social" || i.category === "personal") && i.startTime && i.startTime >= "17:00");

  const schedule: string[] = [];
  const parts = [plural(classes, "class", "classes"), meetings ? plural(meetings, "meeting") : ""].filter(Boolean);
  if (parts.length) schedule.push(parts.join(" · "));
  for (const s of social.slice(0, 1)) schedule.push(`${s.title} at ${formatTime(s.startTime)}`);
  const firstItem = todayItems.find((i) => i.startTime && i.kind !== "deadline");
  if (firstItem) schedule.unshift(`First up: ${firstItem.title} at ${formatTime(firstItem.startTime)}`);

  let watchOut: string | undefined;
  const dueToday = priorities.find((p) => !p.requiresResponse && p.deadline && datePart(p.deadline) === today && timePart(p.deadline) !== "23:59");
  if (dueToday && freeTime[0]) {
    watchOut = `Your ${lowerFirst(dueToday.title)} is due at ${formatTime(timePart(dueToday.deadline!))}. Your best window for it is ${formatTimeRange(freeTime[0].start, freeTime[0].end)}.`;
  } else if (dueToday) {
    watchOut = `Your ${lowerFirst(dueToday.title)} is due at ${formatTime(timePart(dueToday.deadline!))}.`;
  }

  const change = changes.find((c) => c.confidence >= 0.8);
  const changeLine = change
    ? `${change.title} may have moved to ${describeWhen(change.newValue)}. I haven't changed your calendar yet.`
    : undefined;

  const nextExam = upcoming.find((i) => i.kind === "exam" && i.date > today);
  const workload = input.conflicts.find((c) => c.type === "workload");
  let lookingAhead: string | undefined;
  if (nextExam) lookingAhead = `${nextExam.title} ${relativeDateTime(`${nextExam.date}T${nextExam.startTime ?? "09:00"}`, today)}.`;
  if (workload) lookingAhead = `${lookingAhead ? `${lookingAhead} ` : ""}${workload.summary.split(":")[0]}.`;

  const busyAfternoon = todayItems.filter((i) => i.startTime && i.startTime >= "12:00" && i.kind !== "deadline").length >= 3;
  const headline = busyAfternoon ? "Here's what matters today. You've got a full afternoon." : "Here's what matters today.";

  return {
    greeting: `Good morning, ${input.name}`,
    headline,
    priorities: priorities.slice(0, 3).map((p) => ({
      id: p.id,
      title: p.title,
      detail: p.requiresResponse ? "Waiting on your reply" : p.deadline ? relativeDateTime(p.deadline, today) : "",
    })),
    schedule,
    watchOut,
    change: changeLine,
    lookingAhead,
  };
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function lowerFirst(s: string): string {
  return /^[A-Z]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

export function formatChangeShort(c: DetectedChange): string {
  return `${c.previousValue.date ? formatShortDate(c.previousValue.date) : "?"} → ${formatShortDate(c.newValue.date)}`;
}
