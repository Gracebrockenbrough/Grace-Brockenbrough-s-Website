import type {
  AttentionItem,
  AttentionKind,
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
import { datePart, diffDays, formatShortDate, hoursBetween, parseDate, parseDateTime, formatTime, formatTimeRange, relativeDateTime, relativeDay, timePart } from "@/lib/time";
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
  /** Kinds the user keeps dismissing; ORBIT turns them down. */
  quieted?: AttentionKind[];
}

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "Thu 10 AM" — compact enough for a one-line detail. */
function whenShort(v: { date?: string; startTime?: string }): string {
  if (!v.date) return "no date";
  const day = DAY_SHORT[parseDate(v.date).getDay()];
  return v.startTime && v.startTime !== "23:59" ? `${day} ${formatTime(v.startTime)}` : day;
}

/**
 * Exceptions only: changes, conflicts, deadlines that could slip, and gaps in
 * what ORBIT knows. Copy is deliberately short; details live behind a tap.
 */
export function buildAttention(input: AttentionInput): AttentionItem[] {
  const { changes, conflicts, loops, priorities, courses, dismissed, prefs, today } = input;
  const items: AttentionItem[] = [];
  const code = (courseId?: string) => courses.find((c) => c.id === courseId)?.code ?? "";

  for (const c of changes) {
    const confident = c.confidence >= 0.8;
    const what = c.entityType === "exam" ? "Exam" : "Due date";
    items.push({
      id: c.id,
      kind: confident ? "change" : "possible_change",
      label: confident ? "Changed" : "Possible change",
      title: confident ? `${what} moved` : `${what} may have moved`,
      body: `${code(c.courseId)} · ${whenShort(c.previousValue)} → ${whenShort(c.newValue)}`,
      why: confident
        ? `${c.source.label} gives a new date that doesn't match your calendar.`
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
        label: "Conflict",
        title: `Conflict ${relativeDay(c.date!, today)}`,
        body: `${shortName(a?.title)} overlaps ${shortName(b?.title).toLowerCase()}`,
        why: `Both are on your calendar ${relativeDay(c.date!, today)} and overlap by ${c.overlapMinutes} minutes.`,
        weight: 85 - within,
        refId: c.id,
      });
    } else if (c.type === "workload") {
      const n = c.items?.length ?? 3;
      items.push({
        id: c.id,
        kind: "workload",
        label: "Busy stretch",
        title: `Busy ${spanDays(c.items ?? [])}`,
        body: `${n} big deadlines close together`,
        why: "Several graded deadlines land close together. Starting one early spreads out the work.",
        weight: 58,
        refId: c.id,
      });
    } else if (c.type === "prep") {
      const examDay = c.date ? relativeDay(c.date, today) : "";
      items.push({
        id: c.id,
        kind: "prep",
        label: "Study time",
        title: `No study time for ${examDay}'s exam`,
        body: c.summary.split(" ")[0] + " " + (c.summary.split(" ")[1] ?? ""),
        why: "Your calendar has no review time before this exam.",
        weight: 64,
        refId: c.id,
      });
    } else if (c.type === "missing_info") {
      const m = c.summary.match(/“(.+)”/);
      items.push({
        id: c.id,
        kind: "missing_info",
        label: "Missing date",
        title: `${m?.[1] ?? "An item"} has no date`,
        body: c.summary.match(/The (\S+ \S+)/)?.[1] ?? "",
        why: "ORBIT can't plan around something without a date. It will watch for an announcement.",
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
      label: "Deadline",
      title: capitalize(`${l.title.replace(/^Submit (spring )?/, "")} ${verbFor(l.title)} ${relativeDay(datePart(l.deadline), today)}`),
      body: l.blocks ? `${l.blocks} depends on it` : "",
      why: l.why ?? "It has a hard deadline coming up.",
      weight: 70,
      refId: l.id,
    });
  }

  const quieted = new Set(input.quieted ?? []);
  return items
    .filter((i) => !dismissed.includes(i.id))
    .map((i) => ({ ...i, weight: i.weight + (prefs.recommendationAdjust[`attention:${i.kind}`] ?? 0) - (quieted.has(i.kind) ? 20 : 0) }))
    .filter((i) => i.weight > 10)
    .sort((a, b) => b.weight - a.weight);
}

// ---------------------------------------------------------------------------
// ORBIT noticed — one list for everything that isn't a normal task
// ---------------------------------------------------------------------------

export type NoticedTarget = { type: "change" | "conflict" | "loop" | "message" | "attention"; id: string };

export interface NoticedItem {
  id: string;
  kind: AttentionKind | "reply";
  title: string;
  detail: string;
  /** The one obvious action. */
  action: string;
  target: NoticedTarget;
  why: string;
  weight: number;
  /** Unusual or important enough to deserve a card instead of a row. */
  prominent: boolean;
}

const ACTION: Record<AttentionKind, string> = {
  change: "Review",
  possible_change: "Review",
  conflict: "Fix",
  deadline: "Open",
  prep: "Plan",
  workload: "See week",
  missing_info: "Add date",
};

export function buildNoticed(attention: AttentionItem[], replies: { message: Message; loop?: RankedLoop }[]): NoticedItem[] {
  const fromAttention: NoticedItem[] = attention.map((a) => ({
    id: a.id,
    kind: a.kind,
    title: a.title,
    detail: a.body,
    action: ACTION[a.kind],
    target:
      a.kind === "change" || a.kind === "possible_change"
        ? { type: "change", id: a.refId }
        : a.kind === "conflict"
          ? { type: "conflict", id: a.refId }
          : a.kind === "deadline"
            ? { type: "loop", id: a.refId }
            : { type: "attention", id: a.id },
    why: a.why,
    weight: a.weight,
    prominent: a.kind === "change" || a.kind === "conflict",
  }));
  const fromReplies: NoticedItem[] = replies.map(({ message, loop }) => ({
    id: `reply:${message.id}`,
    kind: "reply",
    title: `${message.sender.split(" (")[0]} is waiting for a reply`,
    detail: shortQuestion(message.content),
    action: "Open",
    target: { type: "message", id: message.id },
    why: loop?.why ?? `${message.sender} asked you a direct question.`,
    weight: 55 + (message.senderType === "employer" || message.senderType === "professor" ? 17 : message.senderType === "family" ? 5 : 0),
    prominent: false,
  }));
  return [...fromAttention, ...fromReplies].sort((a, b) => b.weight - a.weight);
}

function shortQuestion(content: string): string {
  const body = content.replace(/^(hi|hey|hello)[^\n]*\n+/i, "").trim();
  const q = (body.split(/(?<=[?.!])\s/).find((x) => x.includes("?")) ?? body.split("\n")[0]).trim();
  return q.length > 52 ? `${q.slice(0, 50).trim()}…` : q;
}

/** "Finance review session" → "Finance review". */
function shortName(title = ""): string {
  return title.replace(/\s+(session|appointment)$/i, "");
}

const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function spanDays(items: CalendarItem[]): string {
  const days = [...new Set(items.map((i) => i.date))].sort();
  const name = (d: string) => DAY_LONG[parseDate(d).getDay()];
  return days.length > 1 ? `${name(days[0])}–${name(days[days.length - 1])}` : name(days[0] ?? "");
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
