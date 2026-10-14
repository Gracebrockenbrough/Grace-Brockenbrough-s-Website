import type { CalendarItem, Course, RankedLoop } from "@/types";
import type { OrbitDerived } from "./orbitEngine";
import type { OrbitState } from "@/store/state";
import {
  addDays,
  datePart,
  diffDays,
  formatDuration,
  formatShortDate,
  formatTime,
  formatTimeRange,
  relativeDateTime,
  relativeDay,
  timePart,
  WEEKDAYS,
  weekday,
} from "@/lib/time";
import { buildCalendarItems, findGaps } from "./calendar";
import { describeWhen } from "./changes";
import { findSlotsFor } from "./helpers";

/** Something the user can do straight from an answer. */
export type AskAction =
  | { kind: "complete"; label: string; loopId: string }
  | { kind: "snooze"; label: string; loopId: string }
  | { kind: "open_loop"; label: string; loopId: string }
  | { kind: "open_message"; label: string; messageId: string }
  | { kind: "review_change"; label: string; changeId: string }
  | { kind: "review_conflict"; label: string; conflictId: string }
  | { kind: "add_block"; label: string; title: string; date: string; start: string; end: string; courseId?: string; loopId?: string; examId?: string }
  | { kind: "ignore_source"; label: string; key: string; sourceLabel: string }
  | { kind: "navigate"; label: string; href: string };

export interface AskAnswer {
  /** True when no built-in answer matched (Orbit's AI answers these when available). */
  fallback?: boolean;
  intro: string;
  items?: string[];
  outro?: string;
  actions?: AskAction[];
}

export const SUGGESTED_QUESTIONS = [
  "What am I forgetting?",
  "What should I do tonight?",
  "Did anything change?",
  "Do I owe anyone a response?",
  "When do I have time to study?",
  "What's due next week?",
  "Which class is busiest this week?",
  "When is my next Finance exam?",
  "Reorganize tomorrow",
  "Ignore emails from this club from now on",
];

const lowerFirst = (s: string) => (/^[A-Z]{2,}/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));

function dueText(l: RankedLoop, today: string): string {
  if (!l.deadline) return "";
  return relativeDateTime(l.deadline, today);
}

/**
 * Answers questions over the user's life using what Orbit already knows.
 * Rule-based intent matching for the prototype; the contract (question in,
 * actionable answer out) is what a real model would implement.
 */
export function answerQuestion(question: string, state: OrbitState, d: OrbitDerived): AskAnswer {
  const q = question.toLowerCase();
  const { today } = d;

  if (/^find .*(hour|time|minutes)|find time/.test(q)) return findTimeFor(q, d);
  if (/time for everything|enough time|fit everything|too much (this|on my)/.test(q)) return capacity(d);
  if (/coming up|next (7|seven) days|look like this week|what'?s ahead/.test(q)) return comingUp(d);
  if (/forget|missing|slip|overlook/.test(q)) return forgetting(state, d);
  if (/unfinished|still open|left to do|tonight|this evening|do today|today\b.*(do|focus)|what should i (do|work)/.test(q) && !/free hour/.test(q)) return tonight(d);
  if (/chang|moved|update/.test(q)) return changes(d);
  if (/owe|respon|reply|get back/.test(q)) return owe(d);
  if (/free hour|free time|what should i do during/.test(q)) return freeHour(d);
  if (/study|time to|when (can|do) i/.test(q)) return studyTime(state, d);
  if (/due next week|next week|due this week|what'?s due/.test(q)) return dueNextWeek(state, d, /this week/.test(q));
  if (/busiest|heaviest|hardest|which class/.test(q)) return busiestClass(state, d);
  if (/(next|when).*(exam|midterm|test|quiz)|exam.*when/.test(q)) return nextExam(state, d, q);
  if (/reorgani[sz]e|plan (my )?tomorrow|tomorrow/.test(q)) return reorganizeTomorrow(d);
  if (/ignore|stop showing|mute/.test(q)) return ignore(q);
  if (/biggest|three|top|priorit|matter/.test(q)) return biggest(d);

  return {
    fallback: true,
    intro: "I'm not sure how to answer that one yet. Here's what I can help with:",
    items: ["What you might be forgetting", "What to do tonight or during a free hour", "What changed and who's waiting on you", "When you have time to study"],
    outro: `Right now, your top priority is ${d.priorities[0] ? lowerFirst(d.priorities[0].title) : "nothing urgent"}${d.priorities[0]?.deadline ? ` (${dueText(d.priorities[0], today).toLowerCase()})` : ""}.`,
  };
}

/** The next seven days, one line per day, plus anything overdue. */
function comingUp(d: OrbitDerived): AskAnswer {
  const items = d.upcomingItems.filter((i) => i.date > d.today && diffDays(i.date, d.today) <= 7 && i.kind !== "class" && !i.title.endsWith("— done"));
  const days = [...new Set(items.map((i) => i.date))];
  const lines = days.map((day) => {
    const parts = items
      .filter((i) => i.date === day)
      .map((i) => (i.kind === "deadline" ? `Due: ${i.title.replace(/ due$/, "")}` : `${formatTime(i.startTime) || "All day"} ${i.title}`));
    return `${relativeDay(day, d.today)} — ${parts.join(" · ")}`;
  });
  const overdue = d.openLoops.filter((l) => l.deadline && l.deadline < `${d.today}T00:00`);
  return {
    intro: lines.length ? "Here's your next 7 days (classes left out):" : "Your next 7 days are clear.",
    items: lines,
    outro: overdue.length ? `Also overdue: ${overdue.map((l) => l.title).join(", ")}.` : undefined,
    actions: [{ kind: "navigate", label: "View week", href: "/calendar?view=week" }],
  };
}

function forgetting(state: OrbitState, d: OrbitDerived): AskAnswer {
  const items: string[] = [];
  const actions: AskAction[] = [];
  const replies = d.loops.filter((l) => l.derivedFrom === "message" && l.status !== "done" && !l.snoozed && l.interacted);
  for (const r of replies.slice(0, 1)) {
    const msg = state.messages.find((m) => m.id === r.messageId);
    const when = msg ? relativeDay(datePart(msg.timestamp), d.today).toLowerCase() : "";
    items.push(`${msg?.sender ?? r.title} asked ${msg?.senderType === "professor" ? "for your availability" : "you a question"} ${when} and you haven't replied.`);
    if (msg) actions.push({ kind: "open_message", label: `Open ${msg.sender.split(" ").slice(-1)[0]}'s ${msg.source === "email" ? "email" : "message"}`, messageId: msg.id });
  }
  const forms = d.openLoops.filter(
    (l) => l.derivedFrom === "loop" && l.hardDeadline && l.deadline && !d.priorities.some((p) => p.id === l.id) && diffDays(datePart(l.deadline), d.today) <= 4 && diffDays(datePart(l.deadline), d.today) >= 1,
  );
  for (const f of forms.slice(0, 1)) {
    items.push(`Your ${lowerFirst(f.title.replace(/^Submit /, ""))} ${/form|application/i.test(f.title) ? "closes" : "is due"} ${relativeDay(datePart(f.deadline!), d.today)} and is still incomplete.`);
    actions.push({ kind: "open_loop", label: `Open ${lowerFirst(f.title.replace(/^Submit /, ""))}`, loopId: f.id });
  }
  const prep = d.conflicts.find((c) => c.type === "prep");
  if (prep && items.length < 3) items.push(prep.summary);
  if (items.length === 0) return { intro: "Nothing's slipping right now. Everything with a deadline is either on track or already in your priorities." };
  return {
    intro: items.length === 1 ? "One thing is worth checking:" : `${items.length === 2 ? "Two" : "A few"} things are worth checking:`,
    items,
    actions,
  };
}

function tonight(d: OrbitDerived): AskAnswer {
  const focus = d.openLoops.filter((l) => (l.status === "now" || l.status === "soon") && !l.snoozed).slice(0, 3);
  if (!focus.length) return { intro: "You're caught up. Nothing needs to happen tonight." };
  const items = focus.map((l) => {
    const due = l.deadline ? datePart(l.deadline) === d.today ? ` before ${l.deadline.endsWith("23:59") ? "midnight" : formatTime(timePart(l.deadline))}` : "" : "";
    const startsWithVerb = /^(Submit|Reply|Return|Send|Confirm|Schedule|Buy|Email|Ask|Call|Register|Read|Finish|Study)\b/.test(l.title);
    if (l.requiresResponse) return `${l.title}.`;
    if (l.status === "soon") return startsWithVerb ? `${l.title} if you have time.` : `Start the ${lowerFirst(l.title)} if you have time.`;
    return startsWithVerb ? `${l.title}${due}.` : `Finish your ${lowerFirst(l.title)}${due}.`;
  });
  const evening = findGaps(d.todayItems, d.today, { from: "17:00", dayEnd: "23:00", minMinutes: 60 });
  const open = evening.find((g) => g.start >= "19:00") ?? evening[0];
  return {
    intro: "I'd focus on three things:",
    items,
    outro: open ? `Your evening is mostly open after ${formatTime(open.start)}.` : undefined,
    actions: [
      { kind: "complete", label: `Mark “${focus[0].title}” done`, loopId: focus[0].id },
      ...(open ? [{ kind: "add_block" as const, label: "Add study block", title: focus.find((f) => !f.requiresResponse)?.title ?? "Study block", date: d.today, start: open.start, end: addMinutes(open.start, 60), loopId: focus.find((f) => !f.requiresResponse)?.id }] : []),
      { kind: "snooze", label: "Remind me later", loopId: focus[focus.length - 1].id },
    ],
  };
}

function changes(d: OrbitDerived): AskAnswer {
  if (!d.changes.length) return { intro: "Nothing has changed. Your calendar matches everything Orbit has seen." };
  const confident = d.changes.filter((c) => c.confidence >= 0.8);
  const unsure = d.changes.filter((c) => c.confidence < 0.8);
  const items = [
    ...confident.map((c) => `${c.source.label.replace(" email", "")} says ${c.title} moved from ${describeWhen(c.previousValue)} to ${describeWhen(c.newValue)}. I haven't changed your calendar yet.`),
    ...unsure.map((c) => `Someone in ${c.source.label} thinks the ${c.title} moved to ${describeWhen(c.newValue)}, but it isn't confirmed.`),
  ];
  return {
    intro: confident.length ? "Yes." : "Maybe.",
    items,
    actions: d.changes.map((c) => ({ kind: "review_change" as const, label: confident.includes(c) ? "Review change" : "Review possible change", changeId: c.id })),
  };
}

function owe(d: OrbitDerived): AskAnswer {
  const replies = d.loops.filter((l) => l.derivedFrom === "message" && l.status !== "done");
  if (!replies.length) return { intro: "You don't owe anyone a response right now." };
  return {
    intro: `Yes, ${replies.length === 1 ? "one person is" : `${replies.length} people are`} waiting on you:`,
    items: replies.map((r) => `${r.source.label}${r.description ? ` — ${r.description.split(" — ")[0]}` : ""}${r.snoozed ? " (snoozed)" : ""}`),
    actions: replies.slice(0, 3).map((r) => ({ kind: "open_message" as const, label: `Open ${r.source.label}`, messageId: r.messageId! })),
  };
}

function freeHour(d: OrbitDerived): AskAnswer {
  const s = d.freeTime[0];
  if (!s) return { intro: "You don't have a long free window left today. Tomorrow looks more open." };
  return {
    intro: `${s.title} ${s.detail}`,
    actions: [{ kind: "add_block", label: "Add plan", title: s.planTitle, date: s.date, start: s.start, end: s.planEnd, courseId: s.courseId, loopId: s.loopId?.startsWith("exam:") ? undefined : s.loopId, examId: s.loopId?.startsWith("exam:") ? s.loopId.slice(5) : undefined }],
  };
}

function studyTime(state: OrbitState, d: OrbitDerived): AskAnswer {
  const nextExam = d.upcomingItems.find((i) => i.kind === "exam" && i.date > d.today);
  const windows: { date: string; start: string; end: string; minutes: number }[] = [];
  for (let i = 0; i < 4 && windows.length < 3; i++) {
    const day = addDays(d.today, i);
    const weekend = weekday(day) === 0 || weekday(day) === 6;
    const gaps = findGaps(d.upcomingItems, day, { from: i === 0 ? "08:15" : undefined, dayStart: weekend ? "10:00" : "08:00", minMinutes: 75 });
    if (gaps[0]) windows.push(gaps[0]);
  }
  const course = nextExam ? state.courses.find((c) => c.id === nextExam.courseId) : undefined;
  return {
    intro: nextExam ? `Your next exam is ${nextExam.title} ${relativeDay(nextExam.date, d.today)}. Good study windows:` : "Good study windows coming up:",
    items: windows.map((w) => {
      const shown = Math.min(w.minutes, 180);
      return `${relativeDay(w.date, d.today)} · ${formatTimeRange(w.start, addMinutes(w.start, shown))} (${formatDuration(shown)} open)`;
    }),
    actions: windows.slice(0, 2).map((w) => ({
      kind: "add_block" as const,
      label: `Add ${relativeDay(w.date, d.today).toLowerCase()} ${formatTime(w.start)}`,
      title: course ? `Study for ${course.code}` : "Study block",
      date: w.date,
      start: w.start,
      end: addMinutes(w.start, Math.min(w.minutes, 90)),
      courseId: course?.id,
      examId: nextExam?.refId,
    })),
  };
}

function dueNextWeek(state: OrbitState, d: OrbitDerived, thisWeek: boolean): AskAnswer {
  const start = thisWeek ? d.today : addDays(d.today, ((8 - weekday(d.today)) % 7) || 7);
  const end = addDays(start, thisWeek ? 7 - ((weekday(d.today) + 6) % 7) : 6);
  const items = buildCalendarItems(d.calendarSource, start, end).filter((i) => (i.kind === "deadline" || i.kind === "exam") && !i.title.endsWith("— done"));
  if (!items.length) return { intro: `Nothing is due ${thisWeek ? "the rest of this week" : "next week"} yet.` };
  return {
    intro: `Here's what's due ${thisWeek ? "the rest of this week" : `next week (${formatShortDate(start)} – ${formatShortDate(end)})`}:`,
    items: items.map((i) => `${WEEKDAYS[weekday(i.date)].slice(0, 3)} · ${i.title.replace(/ due$/, "")}${courseCode(state.courses, i)}${i.pendingChange ? " (date may change)" : ""}`),
    actions: [{ kind: "navigate", label: "View week", href: `/calendar?view=week&date=${start}` }],
  };
}

function courseCode(courses: Course[], i: CalendarItem): string {
  if (!i.courseId || i.kind === "exam") return "";
  const c = courses.find((x) => x.id === i.courseId);
  return c ? ` (${c.code})` : "";
}

function busiestClass(state: OrbitState, d: OrbitDerived): AskAnswer {
  const end = addDays(d.today, 7);
  const items = d.upcomingItems.filter((i) => i.date <= end && (i.kind === "deadline" || i.kind === "exam") && i.courseId && !i.title.endsWith("— done"));
  const counts = new Map<string, CalendarItem[]>();
  for (const i of items) counts.set(i.courseId!, [...(counts.get(i.courseId!) ?? []), i]);
  const ranked = [...counts.entries()].sort((a, b) => weight(b[1]) - weight(a[1]));
  if (!ranked.length) return { intro: "None of your classes have deadlines in the next week." };
  const [courseId, list] = ranked[0];
  const course = state.courses.find((c) => c.id === courseId)!;
  return {
    intro: `${course.code} is your busiest class this week:`,
    items: list.map((i) => `${i.title.replace(/ due$/, "")} · ${relativeDay(i.date, d.today)}`),
    outro: ranked[1] ? `${state.courses.find((c) => c.id === ranked[1][0])?.code} is next, with ${ranked[1][1].length} item${ranked[1][1].length === 1 ? "" : "s"}.` : undefined,
    actions: [{ kind: "navigate", label: `Open ${course.code}`, href: `/courses/${course.id}` }],
  };
}

const weight = (list: CalendarItem[]) => list.reduce((s, i) => s + (i.kind === "exam" ? 3 : 1), 0);

function nextExam(state: OrbitState, d: OrbitDerived, q: string): AskAnswer {
  const course = state.courses.find((c) => q.includes(c.code.toLowerCase()) || q.includes(c.name.toLowerCase().split(" ")[0]) || (q.includes("finance") && c.id === "fin359") || (q.includes("accounting") && c.id === "acct311") || (q.includes("art") && c.id === "arth202"));
  const exams = state.exams.filter((x) => x.date && x.date >= d.today && (!course || x.courseId === course.id)).sort((a, b) => (a.date! + a.startTime).localeCompare(b.date! + b.startTime));
  const exam = exams[0];
  if (!exam) return { intro: course ? `I don't see an upcoming ${course.code} exam with a date yet.` : "I don't see any upcoming exams." };
  const change = d.changes.find((c) => c.entityId === exam.id);
  return {
    intro: `${exam.title} is ${relativeDateTime(`${exam.date}T${exam.startTime ?? "09:00"}`, d.today)}${exam.location ? ` in ${exam.location}` : ""}.`,
    outro: change ? `Heads up: ${change.source.label} says it moved to ${describeWhen(change.newValue)}. I haven't changed your calendar yet.` : undefined,
    actions: change ? [{ kind: "review_change", label: "Review change", changeId: change.id }] : [{ kind: "navigate", label: "Open course", href: `/courses/${exam.courseId}` }],
  };
}

function reorganizeTomorrow(d: OrbitDerived): AskAnswer {
  const tomorrow = addDays(d.today, 1);
  const items = buildCalendarItems(d.calendarSource, tomorrow, tomorrow).filter((i) => i.startTime && i.kind !== "deadline");
  const gaps = findGaps(items, tomorrow, { dayStart: "09:30", minMinutes: 60 });
  const work = d.openLoops
    .filter((l) => !l.requiresResponse && l.status !== "waiting" && (l.effortMinutes ?? 0) >= 30 && (!l.deadline || datePart(l.deadline) >= tomorrow))
    .slice(0, 2);
  const plan: AskAction[] = [];
  const lines: { time: string; text: string }[] = [];
  for (const i of items) lines.push({ time: i.startTime!, text: `${formatTime(i.startTime)} · ${i.title} (already planned)` });
  work.forEach((w, idx) => {
    const g = gaps[idx];
    if (!g) return;
    const end = addMinutes(g.start, Math.min(w.effortMinutes ?? 60, g.minutes));
    lines.push({ time: g.start, text: `${formatTime(g.start)} · ${w.title} (suggested)` });
    plan.push({ kind: "add_block", label: `Add ${formatTime(g.start)} block`, title: w.title, date: tomorrow, start: g.start, end, courseId: w.courseId, loopId: w.id });
  });
  return {
    intro: `Here's a calmer ${WEEKDAYS[weekday(tomorrow)]}. I kept your existing plans and fit work into the open windows:`,
    items: lines.sort((a, b) => a.time.localeCompare(b.time)).map((l) => l.text),
    outro: "Nothing is added until you say so.",
    actions: plan,
  };
}

function ignore(q: string): AskAnswer {
  const club = /club/.test(q);
  const label = club ? "Finance Club GroupMe" : q.replace(/.*(from|ignore)\s+/, "").replace(/from now on|emails?|messages?/g, "").trim();
  return {
    intro: club ? "Got it. Do you want me to ignore the Finance Club GroupMe from now on?" : `Do you want me to ignore ${label}?`,
    outro: "You'll still be able to find these messages, and you can undo this in Settings.",
    actions: [{ kind: "ignore_source", label: "Yes, ignore it", key: `sender:${label}`, sourceLabel: label }],
  };
}

function biggest(d: OrbitDerived): AskAnswer {
  if (!d.priorities.length) return { intro: "Nothing urgent today. You're caught up." };
  return {
    intro: `Your ${d.priorities.length === 1 ? "biggest thing" : `${Math.min(3, d.priorities.length)} biggest things`} today:`,
    items: d.priorities.slice(0, 3).map((p) => `${p.title}${p.deadline ? ` · ${relativeDateTime(p.deadline, d.today)}` : ""}`),
    actions: [{ kind: "complete", label: `Mark “${d.priorities[0].title}” done`, loopId: d.priorities[0].id }],
  };
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** "Find 2 hours for my finance problem set" → real open slots, one tap to add. */
function findTimeFor(q: string, d: OrbitDerived): AskAnswer {
  const words = q.replace(/^find\s+(\w+\s+)?(hours?|minutes|time)\s+(for\s+)?(my\s+)?/, "").split(/\s+/).filter((w) => w.length > 3);
  const loop =
    d.openLoops.find((l) => words.some((w) => l.title.toLowerCase().includes(w))) ?? d.priorities.find((l) => (l.effortMinutes ?? 0) >= 30) ?? d.openLoops[0];
  if (!loop) return { intro: "There's nothing open that needs a block of time right now." };
  const hours = Number(q.match(/(\d+(?:\.\d+)?)\s*hours?/)?.[1] ?? (/\btwo\b/.test(q) ? 2 : 0));
  const want = hours ? hours * 60 : loop.effortMinutes ?? 60;
  const slots = findSlotsFor({ ...loop, effortMinutes: Math.min(want, 120) }, d.upcomingItems, d.now, d.today, 3);
  if (!slots.length) return { intro: `I couldn't find ${formatDuration(want)} before ${loop.title.toLowerCase()} is due. Want to look at what could move?`, actions: [{ kind: "open_loop", label: "Open it", loopId: loop.id }] };
  return {
    intro: `Here's when ${loop.title} fits${loop.deadline ? `, before it's due ${relativeDateTime(loop.deadline, d.today)}` : ""}:`,
    items: slots.map((s) => `${relativeDay(s.date, d.today)} · ${formatTimeRange(s.start, s.end)}`),
    actions: slots.slice(0, 2).map((s) => ({
      kind: "add_block" as const,
      label: `Add ${relativeDay(s.date, d.today).toLowerCase()} ${formatTime(s.start)}`,
      title: loop.title,
      date: s.date,
      start: s.start,
      end: s.end,
      courseId: loop.courseId,
      loopId: loop.id,
    })),
  };
}

/** "Do I actually have time for everything this week?" Work due vs. open time. */
function capacity(d: OrbitDerived): AskAnswer {
  const end = addDays(d.today, 6);
  const due = d.openLoops.filter((l) => l.deadline && datePart(l.deadline) <= end && !l.waitingOn);
  const need = due.reduce((sum, l) => sum + (l.effortMinutes ?? 30), 0);
  let free = 0;
  for (let i = 0; i < 7; i++) {
    const day = addDays(d.today, i);
    free += findGaps(d.upcomingItems, day, { from: i === 0 ? "08:15" : undefined, dayStart: "09:00", dayEnd: "21:00", minMinutes: 45 }).reduce((s, g) => s + g.minutes, 0);
  }
  if (!due.length) return { intro: "Yes. Nothing with a deadline is due in the next seven days." };
  const ok = free >= need * 1.5;
  const tight = due.filter((l) => datePart(l.deadline!) <= addDays(d.today, 1));
  return {
    intro: ok
      ? `Yes. You have about ${formatDuration(need)} of work due this week and roughly ${formatDuration(Math.round(free / 60) * 60)} of open time.`
      : `It's tight. About ${formatDuration(need)} of work is due this week and you have roughly ${formatDuration(Math.round(free / 60) * 60)} open.`,
    items: tight.length ? tight.map((l) => `${l.title} — due ${relativeDateTime(l.deadline!, d.today)}`) : undefined,
    outro: tight.length ? "These two days are the crunch. Everything else has room." : undefined,
    actions: tight[0] ? [{ kind: "open_loop", label: `Start ${tight[0].title}`, loopId: tight[0].id }] : undefined,
  };
}
