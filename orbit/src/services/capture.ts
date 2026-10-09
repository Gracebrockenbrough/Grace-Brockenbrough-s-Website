import type { CalendarEvent, CaptureInputKind, CaptureResult, Category, Consequence, Course, OpenLoop, RankedLoop, SourceKind } from "@/types";
import { addDays, addMinutesToTime, formatShortDate, formatTime, relativeDateTime, toDateStr, weekday, WEEKDAYS } from "@/lib/time";
import { uid } from "@/lib/cn";

// ---------------------------------------------------------------------------
// Natural-language date & time
// ---------------------------------------------------------------------------

export interface When {
  date?: string;
  time?: string;
  /** The text that matched, removed from the title. */
  matched: string[];
}

const MONTH_INDEX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11,
};

export function parseWhen(text: string, today: string): When {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  let date: string | undefined;
  let time: string | undefined;

  const take = (re: RegExp) => {
    const m = lower.match(re);
    if (m) matched.push(m[0]);
    return m;
  };

  // Times: "8 PM", "8:30pm", "at 2", "noon"
  let m = take(/\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)/);
  if (m) {
    let h = Number(m[1]) % 12;
    if (m[3].startsWith("p")) h += 12;
    time = `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
  } else if ((m = take(/\bat\s+(\d{1,2})(?::(\d{2}))?\b/))) {
    let h = Number(m[1]);
    if (h >= 1 && h <= 7) h += 12; // "at 2" almost always means afternoon
    time = `${String(h).padStart(2, "0")}:${m[2] ?? "00"}`;
  } else if (take(/\bnoon\b/)) {
    time = "12:00";
  }

  // Dates
  if (take(/\btonight\b/)) {
    date = today;
    time = time ?? "20:00";
  } else if (take(/\btoday\b/)) {
    date = today;
  } else if (take(/\btomorrow\b/)) {
    date = addDays(today, 1);
  } else if (take(/\bthis weekend\b/)) {
    date = nextWeekday(today, 6, false);
  } else if (take(/\bnext week\b/)) {
    date = addDays(nextWeekday(today, 1, true), 0);
  } else if ((m = take(/\b(jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/))) {
    date = dateFromMonthDay(today, MONTH_INDEX[m[1]], Number(m[2]));
    // "Saturday, October 17" — the weekday is redundant once there's a date.
    take(/\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday),?\s*/);
  } else if ((m = take(/\b(\d{1,2})\/(\d{1,2})\b/))) {
    date = dateFromMonthDay(today, Number(m[1]) - 1, Number(m[2]));
  } else if ((m = take(/\b(?:(next|this)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/))) {
    const target = WEEKDAYS.findIndex((d) => d.toLowerCase() === m![2]);
    // "by Friday" said on a Friday means next Friday; "this Friday" means today.
    date = nextWeekday(today, target, m[1] === "next" || (m[1] !== "this" && target === weekday(today)));
  }

  return { date, time, matched: matched.map((x) => x.trim()) };
}

function nextWeekday(today: string, target: number, forceNext: boolean): string {
  const current = weekday(today);
  let delta = (target - current + 7) % 7;
  if (delta === 0 && forceNext) delta = 7;
  return addDays(today, delta);
}

function dateFromMonthDay(today: string, month: number, day: number): string {
  const year = Number(today.slice(0, 4));
  let d = new Date(year, month, day);
  if (toDateStr(d) < today) d = new Date(year + 1, month, day);
  return toDateStr(d);
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

const EVENT_WORDS = /\b(concert|party|game|show|dinner|lunch|brunch|coffee|meeting|appointment|interview|movie|tailgate|recital|match|event)\b/i;
const COMPLETION = /^(?:i\s+)?(?:just\s+)?(finished|completed|submitted|turned in|did|am done with|i'm done with|done with)\s+(?:my\s+|the\s+)?(.+)$/i;
const OFFICE_HOURS = /office hours/i;
const IGNORE = /\bignore\s+(?:all\s+)?(?:emails?|messages?|texts?)?\s*(?:from\s+)?(.+?)(?:\s+from now on)?$/i;
const SYLLABUS_FILE = /syllab/i;

const WORK_WORDS = /\b(interview|application|recruiter|internship|resume|job|career|networking)\b/i;
const PERSONAL_WORDS = /\b(mom|dad|birthday|present|gift|dress|return|dentist|doctor|haircut|laundry|groceries|package|flight|rent)\b/i;
const MONEY_WORDS = /\b(return|refund|deposit|pay|bill|fee)\b/i;

function categorize(text: string, courses: Course[]): { category: Category; courseId?: string; consequence: Consequence } {
  const course = matchCourse(text, courses);
  if (course) return { category: "school", courseId: course.id, consequence: "academic" };
  if (WORK_WORDS.test(text)) return { category: "work", consequence: "professional" };
  if (PERSONAL_WORDS.test(text)) return { category: "personal", consequence: MONEY_WORDS.test(text) ? "financial" : "social" };
  if (/\b(class|exam|quiz|essay|paper|reading|professor|homework|problem set|study)\b/i.test(text)) return { category: "school", consequence: "academic" };
  return { category: "personal", consequence: "low" };
}

export function matchCourse(text: string, courses: Course[]): Course | undefined {
  const t = text.toLowerCase();
  return courses.find((c) => {
    const code = c.code.toLowerCase();
    const [dept] = code.split(" ");
    const keyword = c.name.toLowerCase().split(" ")[0];
    const subject: Record<string, string[]> = {
      acct: ["accounting", "acct"],
      fin: ["finance", "fin "],
      bus: ["ai and business", "bus 304", "bus304"],
      arth: ["art history", "arth"],
    };
    return t.includes(code) || t.includes(code.replace(" ", "")) || (subject[dept] ?? []).some((k) => t.includes(k)) || (keyword.length > 6 && t.includes(keyword));
  });
}

function cleanTitle(raw: string, when: When): string {
  let t = raw.trim();
  for (const m of when.matched) t = t.replace(new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "");
  t = t
    .replace(/^(hey\s+)?orbit[,:]?\s*/i, "")
    .replace(/^(please\s+)?(remind me|don't let me forget|remember)\s+(that\s+|to\s+)?/i, "")
    .replace(/^i\s+(have|need)\s+to\s+/i, "")
    .replace(/^i\s+should\s+/i, "")
    .replace(/^add\s+/i, "")
    .replace(/\b(by|on|due|before|at)\s*$/i, "")
    .replace(/\s+(by|on|due|before)\s+(?=[.,]|$)/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/[\s.,·•:;–—-]+$/, "")
    .trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !["the", "and", "for", "my", "assignment"].includes(w));
}

function bestLoopMatch(phrase: string, loops: RankedLoop[]): RankedLoop | undefined {
  const words = tokens(phrase);
  let best: { loop: RankedLoop; score: number } | undefined;
  for (const l of loops) {
    if (l.status === "done") continue;
    const hay = `${l.title} ${l.description ?? ""}`.toLowerCase();
    let score = words.filter((w) => hay.includes(w)).length;
    // "accounting assignment" should match an ACCT loop.
    if (/accounting/.test(phrase.toLowerCase()) && l.courseId === "acct311") score += 1;
    if (/finance/.test(phrase.toLowerCase()) && l.courseId === "fin359") score += 1;
    if (/art/.test(phrase.toLowerCase()) && l.courseId === "arth202") score += 1;
    if (score > 0 && (!best || score > best.score || (score === best.score && l.priorityScore > best.loop.priorityScore))) best = { loop: l, score };
  }
  return best?.loop;
}

export interface CaptureInput {
  kind: CaptureInputKind;
  text?: string;
  fileName?: string;
  fileType?: string;
}

export interface CaptureContext {
  today: string;
  nowStr: string;
  courses: Course[];
  loops: RankedLoop[];
}

const SOURCE_FOR: Record<CaptureInputKind, SourceKind> = {
  text: "manual",
  voice: "voice",
  photo: "screenshot",
  screenshot: "screenshot",
  file: "manual",
};

/**
 * Figure out what a capture means. The user never picks "task" vs "event" —
 * ORBIT decides, then either adds it (low risk) or asks first (calendar).
 */
export function processCapture(input: CaptureInput, ctx: CaptureContext): CaptureResult {
  if (input.kind === "file") {
    const name = input.fileName ?? "document.pdf";
    if (SYLLABUS_FILE.test(name) || /pdf/i.test(input.fileType ?? name)) {
      return { type: "syllabus", fileName: name, headline: "This looks like a syllabus.", detail: "ORBIT will route it to Courses and pull out the important dates for you to review." };
    }
  }

  const text = (input.text ?? "").trim();
  if (!text) return { type: "unclear", headline: "I didn't catch anything.", detail: "Try typing or saying what you want to remember." };

  // "Ignore emails from this club from now on"
  const ig = text.match(IGNORE);
  if (ig && /^ignore/i.test(text)) {
    const label = ig[1].replace(/^(this|the)\s+/i, "").replace(/\s+from now on$/i, "").trim();
    const resolved = /club/i.test(label) ? "Finance Club GroupMe" : label.replace(/^./, (c) => c.toUpperCase());
    return {
      type: "ignore_source",
      key: `sender:${resolved}`,
      label: resolved,
      headline: `ORBIT will ignore ${resolved}.`,
      detail: "Messages from this source won't show up in Today. You can undo this in Settings.",
    };
  }

  // "I finished my accounting assignment"
  const done = text.match(COMPLETION);
  if (done) {
    const loop = bestLoopMatch(done[2], ctx.loops);
    if (loop) {
      return { type: "completion", loopId: loop.id, loopTitle: loop.title, headline: `Nice. Marking “${loop.title}” as done.`, detail: "It'll leave your priorities and move to Done." };
    }
  }

  const when = parseWhen(text, ctx.today);

  // "My professor moved office hours to Wednesday at 2"
  if (OFFICE_HOURS.test(text)) {
    const course = matchCourse(text, ctx.courses);
    const day = when.date ? WEEKDAYS[weekday(when.date)] : undefined;
    const value = [day, when.time ? formatTime(when.time) : undefined].filter(Boolean).join(" · ");
    return {
      type: "office_hours",
      courseId: course?.id,
      value: value || text,
      headline: course ? `Office hours updated for ${course.code}` : "Which course is this for?",
      detail: value ? `${value}${course ? ` · ${course.professor}` : ""}` : "ORBIT couldn't find a day or time.",
    };
  }

  const title = cleanTitle(text, when) || "New item";
  const { category, courseId, consequence } = categorize(text, ctx.courses);
  const source = { kind: SOURCE_FOR[input.kind], label: input.kind === "voice" ? "Voice capture" : input.kind === "text" ? "Added by you" : "Screenshot" };

  // Events: something happening at a specific time.
  if (when.date && when.time && (EVENT_WORDS.test(text) || input.kind === "photo" || input.kind === "screenshot") && !/\b(remind|due|submit|return|buy|email|send|call)\b/i.test(text)) {
    const event: CalendarEvent = {
      id: uid("ev"),
      title: title.replace(/^(a|an|the)\s+/i, "").replace(/^./, (c) => c.toUpperCase()),
      date: when.date,
      startTime: when.time,
      endTime: addMinutesToTime(when.time, /concert|game|show|party/i.test(text) ? 150 : 60),
      category: /meeting|interview|appointment/i.test(text) ? "meeting" : "social",
      source,
      hardCommitment: false,
      confidence: input.kind === "text" || input.kind === "voice" ? 0.9 : 0.82,
      courseId,
    };
    return {
      type: "event",
      event,
      headline: "This looks like an event.",
      detail: `Add “${event.title}” to ${formatShortDate(event.date)} at ${formatTime(event.startTime)}?`,
    };
  }

  // Default: a low-risk Open Loop, added right away (with undo).
  const deadline = when.date ? `${when.date}T${when.time ?? "23:59"}` : undefined;
  const loop: OpenLoop = {
    id: uid("loop"),
    title,
    description: text !== title ? `“${text}”` : undefined,
    category,
    source,
    deadline,
    hardDeadline: /\b(due|deadline|by)\b/i.test(text),
    consequence,
    senderType: category === "school" ? "school_system" : category === "work" ? "professional" : "family",
    requiresResponse: /\b(email|reply|text|call|respond)\b/i.test(text),
    moneyAtRisk: MONEY_WORDS.test(text) ? 1 : undefined,
    courseId,
    effortMinutes: 30,
    confidence: when.date ? 0.9 : 0.8,
    completed: false,
    createdAt: ctx.nowStr,
    why: deadline ? `You told ORBIT about this, and it's due ${relativeDateTime(deadline, ctx.today).toLowerCase()}.` : "You told ORBIT about this.",
  };
  return {
    type: "loop",
    loop,
    headline: "Added an Open Loop",
    detail: deadline ? `${title} · ${relativeDateTime(deadline, ctx.today)}` : `${title} · No deadline`,
  };
}

/** What the simulated screenshot reader "sees" in the demo image. */
export const DEMO_SCREENSHOT_TEXT = "Concert Saturday October 17 · 8 PM";

export const VOICE_EXAMPLES = [
  "Orbit, remind me that I have to email John tonight.",
  "Buy Mom's birthday present Sunday.",
  "I finished my accounting assignment.",
  "My professor moved office hours to Wednesday at 2.",
];
