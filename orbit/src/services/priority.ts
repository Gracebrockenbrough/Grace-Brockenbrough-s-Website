import type {
  Assignment,
  ConnectedSource,
  Consequence,
  Course,
  LoopMeta,
  LoopStatus,
  Message,
  OpenLoop,
  Preferences,
  PriorityLevel,
  RankedLoop,
} from "@/types";
import { hoursBetween, parseDateTime } from "@/lib/time";
import { SENDER_IMPORTANCE, classifyMessage, isIgnored, replyWhy } from "./messages";

/**
 * Priority model (never shown to users):
 *   priority = deadlineUrgency + hardness + consequence + sourceImportance
 *            + directRequest + moneyRisk + dependency + userPreference
 */

const CONSEQUENCE_SCORE: Record<Consequence, number> = {
  academic: 14,
  professional: 14,
  financial: 12,
  travel: 10,
  social: 5,
  low: 1,
};

const EFFORT_MINUTES = { small: 30, medium: 90, large: 180 } as const;

/** Assignments due within this window become Open Loops automatically. */
const ASSIGNMENT_WINDOW_DAYS = 14;

export function deadlineUrgency(deadline: string | undefined, now: Date): number {
  if (!deadline) return 3;
  const hours = hoursBetween(now, parseDateTime(deadline));
  if (hours <= 12) return 40;
  if (hours <= 24) return 34;
  if (hours <= 48) return 26;
  if (hours <= 72) return 20;
  if (hours <= 24 * 7) return 12;
  if (hours <= 24 * 14) return 6;
  return 3;
}

export interface PriorityInput {
  loop: OpenLoop;
  meta?: LoopMeta;
  prefs: Preferences;
  now: Date;
}

export function calculatePriority({ loop, meta, prefs, now }: PriorityInput): number {
  const deadline = meta?.deadlineOverride ?? loop.deadline;
  // Soft deadlines (readings, reply-by dates) count less than hard ones.
  const urgency = deadlineUrgency(deadline, now) * (loop.hardDeadline ? 1 : loop.requiresResponse ? 0.8 : 0.6);

  let score =
    urgency +
    (loop.hardDeadline ? 10 : 0) +
    CONSEQUENCE_SCORE[loop.consequence] +
    SENDER_IMPORTANCE[loop.senderType] +
    (loop.requiresResponse ? 8 : 0) +
    (loop.interacted ? 4 : 0) +
    (loop.moneyAtRisk ? 6 : 0) +
    (loop.blocks ? 6 : 0) +
    (loop.effortMinutes && loop.effortMinutes >= 150 ? 4 : 0);

  // Waiting on a reply for a while raises urgency.
  if (loop.requiresResponse && loop.interacted) {
    const ageHours = hoursBetween(parseDateTime(loop.createdAt), now);
    if (ageHours > 12) score += 6;
  }

  score += prefs.sourceAdjust[`sender:${loop.source.label}`] ?? 0;
  score += prefs.sourceAdjust[`type:${loop.senderType}`] ?? 0;

  if (meta?.priorityOverride === "high") score += 30;
  if (meta?.priorityOverride === "low") score -= 30;
  if (loop.confidence < 0.7) score *= 0.85;

  return Math.round(score);
}

export function levelFromScore(score: number): PriorityLevel {
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

function statusFor(loop: OpenLoop, meta: LoopMeta | undefined, score: number, snoozed: boolean, now: Date): LoopStatus {
  if (meta?.completed ?? loop.completed) return "done";
  if (meta?.statusOverride) return meta.statusOverride;
  if (loop.waitingOn) return "waiting";
  if (snoozed) return "later";
  const deadline = meta?.deadlineOverride ?? loop.deadline;
  const hoursLeft = deadline ? hoursBetween(now, parseDateTime(deadline)) : Infinity;
  if (hoursLeft > 24 * 7 && meta?.priorityOverride !== "high") return "later";
  if (score >= 60) return "now";
  if (score >= 30) return "soon";
  return "later";
}

// ---------------------------------------------------------------------------
// Turning raw information into Open Loops
// ---------------------------------------------------------------------------

export function loopFromAssignment(a: Assignment, course: Course | undefined, createdAt: string): OpenLoop {
  return {
    id: `asg:${a.id}`,
    title: a.title,
    description: [course ? `${course.code} · ${course.name}` : undefined, a.note].filter(Boolean).join(" — "),
    category: "school",
    source: a.source,
    deadline: a.due,
    hardDeadline: true,
    consequence: "academic",
    senderType: "school_system",
    requiresResponse: false,
    courseId: a.courseId,
    effortMinutes: EFFORT_MINUTES[a.effort],
    confidence: a.confidence,
    completed: a.completed,
    createdAt,
  };
}

export function loopFromMessage(m: Message, now: Date): OpenLoop {
  return {
    id: `msg:${m.id}`,
    title: m.replyAction ?? `Reply to ${m.sender}`,
    description: m.subject ? `“${m.subject}” — ${m.channel}` : `“${m.content.length > 48 ? `${m.content.slice(0, 46).trim()}…` : m.content}” — ${m.channel}`,
    category: m.senderType === "employer" || m.senderType === "professional" ? "work" : m.senderType === "family" || m.senderType === "friend" ? "personal" : "school",
    source: { kind: m.source, label: `${m.sender} ${m.source === "email" ? "email" : "message"}`, ref: m.id },
    deadline: m.respondBy,
    hardDeadline: false,
    consequence: m.senderType === "professor" ? "academic" : m.senderType === "employer" ? "professional" : m.senderType === "family" ? "travel" : "social",
    senderType: m.senderType,
    requiresResponse: true,
    interacted: m.opened,
    courseId: m.courseId,
    messageId: m.id,
    effortMinutes: 10,
    confidence: 0.93,
    completed: m.responded,
    createdAt: m.timestamp,
    why: replyWhy(m, now),
  };
}

function assignmentWhy(loop: OpenLoop, now: Date): string {
  if (!loop.deadline) return "It's on your syllabus.";
  const hours = hoursBetween(now, parseDateTime(loop.deadline));
  if (hours <= 24) return "Hard deadline today.";
  if (hours <= 48) return "Hard deadline tomorrow.";
  return "It's a graded assignment due soon.";
}

export interface BuildLoopsInput {
  loops: OpenLoop[];
  assignments: Assignment[];
  messages: Message[];
  courses: Course[];
  loopMeta: Record<string, LoopMeta>;
  prefs: Preferences;
  sources: ConnectedSource[];
  now: Date;
}

/** Every Open Loop ORBIT knows about, scored and sorted by recommendation. */
export function buildRankedLoops(input: BuildLoopsInput): RankedLoop[] {
  const { now, prefs, loopMeta } = input;
  const disabledKinds = new Set(input.sources.filter((s) => !s.enabled).map((s) => s.kind));
  const candidates: { loop: OpenLoop; derivedFrom: RankedLoop["derivedFrom"] }[] = [];

  for (const loop of input.loops) {
    if (disabledKinds.has(loop.source.kind)) continue;
    candidates.push({ loop, derivedFrom: "loop" });
  }

  for (const a of input.assignments) {
    if (!a.due) continue;
    const hours = hoursBetween(now, parseDateTime(a.due));
    // Keep recent completions visible in "Done"; otherwise only the next two weeks.
    if (hours > ASSIGNMENT_WINDOW_DAYS * 24) continue;
    if (hours < -24 * 3 && !a.completed) continue;
    if (hours < -24 * 10) continue;
    const course = input.courses.find((c) => c.id === a.courseId);
    const loop = loopFromAssignment(a, course, "2026-09-02T09:00");
    loop.why = assignmentWhy(loop, now);
    candidates.push({ loop, derivedFrom: "assignment" });
  }

  for (const m of input.messages) {
    if (disabledKinds.has(m.source)) continue;
    if (isIgnored(m.sender, prefs)) continue;
    const c = classifyMessage(m, prefs);
    if (c.category !== "requires_reply" && !m.responded) continue;
    if (!m.directQuestion || m.massMessage) continue;
    if (m.dismissed) continue;
    const loop = loopFromMessage(m, now);
    // Keyed by sender so learned preferences ("sender:<name>") apply.
    candidates.push({ loop: { ...loop, source: { ...loop.source, label: m.sender } }, derivedFrom: "message" });
  }

  const ranked: RankedLoop[] = [];
  for (const { loop, derivedFrom } of candidates) {
    const meta = loopMeta[loop.id];
    if (meta?.removed) continue;
    const snoozed = !!meta?.snoozedUntil && parseDateTime(meta.snoozedUntil) > now;
    const score = calculatePriority({ loop, meta, prefs, now });
    const status = statusFor(loop, meta, score, snoozed, now);
    ranked.push({
      ...loop,
      deadline: meta?.deadlineOverride ?? loop.deadline,
      completed: status === "done",
      priorityScore: score,
      priority: meta?.priorityOverride ?? levelFromScore(score),
      status,
      snoozed,
      derivedFrom,
    });
  }

  return ranked.sort((a, b) => b.priorityScore - a.priorityScore);
}

/** The 3–5 things that deserve attention right now. */
export function selectPriorities(loops: RankedLoop[], max = 4): RankedLoop[] {
  return loops.filter((l) => l.status === "now" && !l.snoozed).slice(0, max);
}
