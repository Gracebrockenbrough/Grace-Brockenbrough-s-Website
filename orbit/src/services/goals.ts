import type { Category, Exam, Goal, GoalKind, GoalStep } from "@/types";
import { addDays, diffDays, formatShortDate, weekday } from "@/lib/time";
import { parseWhen } from "./capture";

/**
 * Goals → small, achievable steps over time. Rule-based templates stand in for
 * a planning model: a running goal becomes a progressive running plan, a
 * savings goal becomes weekly transfers, and anything else becomes a weekly
 * rhythm of short sessions.
 */

export const GOAL_EXAMPLES = ["Run a 5K next month", "Save $400 by December", "Learn Spanish basics", "Land a summer internship", "Read 4 books this semester", "Sleep by midnight"];

const SEMESTER_END = "2026-12-11";

interface ParsedGoal {
  title: string;
  kind: GoalKind;
  area: Category;
  target: string;
}

export function parseGoal(text: string, today: string): ParsedGoal {
  const lower = text.toLowerCase();
  let kind: GoalKind = "generic";
  if (/\b(run|5k|10k|marathon|half|jog)\b/.test(lower)) kind = "run";
  else if (/\b(save|savings|\$\d)/.test(lower)) kind = "save";
  else if (/\b(read|books?)\b/.test(lower)) kind = "read";
  else if (/\b(internship|job|resume|network|recruit|career|offer)\b/.test(lower)) kind = "career";
  else if (/\b(learn|study|practice|get better at|gpa|ace|exam|language|spanish|french|code|coding)\b/.test(lower)) kind = "study";
  else if (/\b(sleep|meditate|journal|drink|water|stretch|yoga|gym|lift|workout|every day|daily|habit)\b/.test(lower)) kind = "habit";

  const area: Category =
    kind === "run" || (kind === "habit" && /\b(sleep|meditate|stretch|yoga|gym|lift|workout|water)\b/.test(lower))
      ? "health"
      : kind === "career"
        ? "career"
        : kind === "study"
          ? "school"
          : kind === "save" || kind === "read"
            ? "personal"
            : kind === "habit"
              ? "health"
              : /\b(friend|family|call|visit)\b/.test(lower)
                ? "social"
                : /\b(trip|travel|visit)\b/.test(lower)
                  ? "travel"
                  : "personal";

  let target: string | undefined;
  let m: RegExpMatchArray | null;
  if (/\bnext month\b/.test(lower)) target = addDays(today, 30);
  else if ((m = lower.match(/\bin (\d+|a|two|three|four|six|eight) (week|month)s?\b/))) {
    const n = { a: 1, two: 2, three: 3, four: 4, six: 6, eight: 8 }[m[1] as "a"] ?? Number(m[1]);
    target = addDays(today, m[2] === "week" ? n * 7 : n * 30);
  } else if (/\bthis semester\b|\bby (finals|winter break)\b/.test(lower)) target = SEMESTER_END;
  else if (/\bthis year\b|\bby (the )?end of (the )?year\b/.test(lower)) target = `${today.slice(0, 4)}-12-31`;
  else if ((m = lower.match(/\bby (january|february|march|april|may|june|july|august|september|october|november|december)\b(?!\s+\d)/))) {
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const idx = months.indexOf(m[1]);
    const year = Number(today.slice(0, 4)) + (idx < Number(today.slice(5, 7)) - 1 ? 1 : 0);
    target = `${year}-${String(idx + 1).padStart(2, "0")}-01`;
  } else {
    target = parseWhen(text, today).date;
  }
  if (!target || diffDays(target, today) < 7) target = addDays(today, kind === "run" ? 35 : 42);

  // A race lands on a weekend morning.
  if (kind === "run") {
    const wd = weekday(target);
    if (wd !== 6 && wd !== 0) target = addDays(target, (6 - wd + 7) % 7);
  }

  const title = text
    .replace(/\b(by|before|in|this|next)\s+(next month|month|semester|year|finals|winter break|\d+ (weeks?|months?)|a (week|month)|january|february|march|april|may|june|july|august|september|october|november|december)\b.*$/i, "")
    .replace(/\bnext month\b/i, "")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

  return { title: title || text.trim(), kind, area, target };
}

let stepCounter = 0;
const stepId = () => `gs-${Date.now().toString(36)}-${(stepCounter++).toString(36)}`;

/** Dates between start (inclusive) and end (exclusive) that fall on the given weekdays. */
function datesOn(start: string, end: string, weekdays: number[]): string[] {
  const out: string[] = [];
  for (let d = start; d < end; d = addDays(d, 1)) if (weekdays.includes(weekday(d))) out.push(d);
  return out;
}

function runPlan(title: string, today: string, target: string): { plan: string; steps: GoalStep[] } {
  const lower = title.toLowerCase();
  const distance = /half/.test(lower) ? "half marathon" : /10k/.test(lower) ? "10K" : /marathon/.test(lower) ? "marathon" : "5K";
  const peak = distance === "5K" ? 35 : distance === "10K" ? 60 : 90;
  const start = addDays(today, 1);
  // Tuesday, Thursday, Saturday — Saturday is the longer run.
  const dates = datesOn(start, target, [2, 4, 6]);
  const steps: GoalStep[] = dates.map((date, i) => {
    const progress = dates.length > 1 ? i / (dates.length - 1) : 1;
    const long = weekday(date) === 6;
    const base = Math.round((18 + (peak - 18) * progress) / 5) * 5;
    const minutes = long ? Math.round((base * 1.2) / 5) * 5 : base;
    const early = progress < 0.35;
    const taper = diffDays(target, date) <= 3;
    const kind = taper ? "Shakeout run" : early ? "Run/walk" : long ? "Long run" : "Easy run";
    const detail = taper
      ? "Short and easy. Save your legs for race day."
      : early
        ? `Run ${progress < 0.15 ? 1 : 2} min, walk 1 min. Repeat for ${minutes} min.`
        : long
          ? "Slow enough to talk the whole time."
          : "Comfortable pace. Finish feeling like you could keep going.";
    return { id: stepId(), title: `${kind} · ${taper ? 15 : minutes} min`, date, detail, minutes: taper ? 15 : minutes, done: false };
  });
  steps.push({ id: stepId(), title: `Race day: ${distance}`, date: target, detail: "You trained for this. Start slower than you want to.", done: false });
  const weeks = Math.max(1, Math.round(diffDays(target, today) / 7));
  return { plan: `3 runs a week for ${weeks} weeks, building from 18 to ${peak} minutes, then your ${distance} on ${formatShortDate(target)}.`, steps };
}

function savePlan(title: string, today: string, target: string): { plan: string; steps: GoalStep[] } {
  const amount = Number(title.match(/\$\s?([\d,]+)/)?.[1]?.replace(/,/g, "") ?? 300);
  const fridays = datesOn(addDays(today, 1), addDays(target, 1), [5]);
  const each = Math.ceil(amount / Math.max(1, fridays.length) / 5) * 5;
  const steps = fridays.map((date, i) => ({
    id: stepId(),
    title: `Move $${each} to savings`,
    date,
    detail: `Running total: $${Math.min(amount, each * (i + 1))} of $${amount}.`,
    minutes: 5,
    done: false,
  }));
  return { plan: `$${each} every Friday for ${fridays.length} weeks gets you to $${amount}.`, steps };
}

function rhythmPlan(kind: GoalKind, title: string, today: string, target: string): { plan: string; steps: GoalStep[] } {
  const subject = title.replace(/^(learn|practice|get better at|read|study)\s+/i, "");
  const cfg: Record<string, { days: number[]; minutes: number; step: (i: number) => string; detail: string; plan: string }> = {
    study: { days: [1, 3, 5], minutes: 25, step: (i) => (i === 0 ? `Pick a resource for ${subject}` : `${subject} practice`), detail: "Short and focused. Stop while it still feels easy.", plan: `25 minutes, 3 times a week` },
    read: { days: [0, 2, 4], minutes: 30, step: (i) => (i === 0 ? "Choose your first book" : "Read 30 min"), detail: "Phone in another room.", plan: `30 minutes of reading, 3 times a week` },
    habit: { days: [0, 1, 2, 3, 4, 5, 6], minutes: 5, step: () => title, detail: "Check it off before bed.", plan: `A daily check-in` },
    career: {
      days: [1, 4],
      minutes: 45,
      step: (i) => ["Update your resume", "List 10 companies you'd want to work for", "Message 2 alumni on LinkedIn", "Apply to 3 roles", "Practice a mock interview", "Follow up on applications"][i % 6],
      detail: "One concrete thing. Done beats perfect.",
      plan: `Two focused career sessions a week`,
    },
    generic: { days: [2, 6], minutes: 30, step: (i) => (i === 0 ? "Decide what “done” looks like" : `30 minutes on: ${title.toLowerCase()}`), detail: "Small steps add up.", plan: `Two short sessions a week` },
  };
  const c = cfg[kind] ?? cfg.generic;
  // Daily habits only plan the first three weeks; Orbit adds more as you go.
  const end = kind === "habit" ? (diffDays(target, today) > 21 ? addDays(today, 22) : target) : addDays(target, 1);
  const dates = datesOn(addDays(today, 1), end, c.days);
  const steps = dates.map((date, i) => ({ id: stepId(), title: c.step(i), date, detail: c.detail, minutes: c.minutes, done: false }));
  return { plan: `${c.plan} until ${formatShortDate(target)}.`, steps };
}

export function buildGoal(text: string, today: string, nowStr: string, override: { target?: string; area?: Category } = {}): Goal {
  const parsed = { ...parseGoal(text, today), ...Object.fromEntries(Object.entries(override).filter(([, v]) => v)) } as ParsedGoal;
  const built =
    parsed.kind === "run"
      ? runPlan(parsed.title, today, parsed.target)
      : parsed.kind === "save"
        ? savePlan(parsed.title, today, parsed.target)
        : rhythmPlan(parsed.kind, parsed.title, today, parsed.target);
  return { id: `goal-${Date.now().toString(36)}`, title: parsed.title, area: parsed.area, kind: parsed.kind, target: parsed.target, createdAt: nowStr, ...built };
}

export interface GoalProgress {
  done: number;
  total: number;
  pct: number;
  /** Today's step, if there is one. */
  today?: GoalStep;
  /** The next step that isn't done, on or after today. */
  next?: GoalStep;
  /** Past steps that weren't checked off. */
  missed: GoalStep[];
  daysLeft: number;
  /** Steps done in a row, counting back from the most recent past step. */
  streak: number;
}

export function goalProgress(goal: Goal, today: string): GoalProgress {
  const done = goal.steps.filter((s) => s.done).length;
  const past = goal.steps.filter((s) => s.date < today);
  let streak = 0;
  for (let i = past.length - 1; i >= 0 && past[i].done; i--) streak++;
  const todayStep = goal.steps.find((s) => s.date === today);
  return {
    done,
    total: goal.steps.length,
    pct: goal.steps.length ? Math.round((done / goal.steps.length) * 100) : 0,
    today: todayStep,
    next: goal.steps.find((s) => s.date >= today && !s.done),
    missed: past.filter((s) => !s.done),
    daysLeft: diffDays(goal.target, today),
    streak,
  };
}

// ---------------------------------------------------------------------------
// Study progress: "studied 2 of 5 days" for each upcoming exam.
// ---------------------------------------------------------------------------

export const STUDY_TARGET = 5;

export interface StudyProgress {
  exam: Exam;
  studied: string[];
  target: number;
  daysLeft: number;
  studiedToday: boolean;
  /** One line of honest advice. */
  note: string;
}

export function studyProgress(exams: Exam[], log: Record<string, string[]>, today: string): StudyProgress[] {
  return exams
    .filter((e) => e.date && e.date >= today && diffDays(e.date, today) <= 14)
    .sort((a, b) => (a.date! < b.date! ? -1 : 1))
    .map((exam) => {
      const studied = (log[exam.id] ?? []).filter((d) => d <= today).sort();
      const daysLeft = diffDays(exam.date!, today);
      const target = STUDY_TARGET;
      const studiedToday = studied.includes(today);
      const remaining = Math.max(0, target - studied.length);
      // Study days still available: today (if not logged) through the day before the exam.
      const available = Math.max(0, daysLeft - (studiedToday ? 1 : 0));
      const note =
        remaining === 0
          ? "You've put in the days. A light review the night before is enough."
          : available >= remaining
            ? `${remaining} more study ${remaining === 1 ? "day" : "days"}, ${daysLeft} ${daysLeft === 1 ? "day" : "days"} until the exam. You're on track.`
            : available === 0
              ? "Exam is today. Quick review, then trust what you know."
              : `${remaining} study days to go, ${available} ${available === 1 ? "day" : "days"} left. Make the next sessions a little longer.`;
      return { exam, studied, target, daysLeft, studiedToday, note };
    });
}
