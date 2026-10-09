import type { AttentionKind, CalendarView, DemoTime, InteractionSignal, LearnedRoutine, LearningPrompt, SourcePreference } from "@/types";
import type { OrbitState } from "@/store/state";

/**
 * ORBIT's personalization layer. Rule-based for the prototype: it reads the
 * user's behavior (signals) and returns small, predictable adjustments.
 *
 * Stable structure, adaptive content: nothing here moves navigation. It only
 * changes defaults, ordering within sections, and how loudly ORBIT speaks up.
 * Every rule needs repeated behavior before it changes anything.
 */
export interface Learned {
  /** Effective default view when Calendar opens. */
  calendarView: CalendarView;
  /** Today shows ORBIT noticed before the schedule (mobile) and expands it a little more. */
  noticedFirst: boolean;
  /** How far ahead ORBIT suggests exam study time. */
  prepHorizonDays: number;
  /** Alert kinds the user keeps dismissing, so ORBIT quiets them. */
  quietedKinds: AttentionKind[];
  /** Small priority penalties for tasks the user keeps pushing back. */
  loopPenalty: Record<string, number>;
  /** Senders the user answers quickly — kept high priority. */
  fastReplyTypes: string[];
  /** Typical days early the user starts large assignments. */
  largeWorkLeadDays: number;
  /** One polite question per surface, at most. */
  prompts: LearningPrompt[];
  /** Patterns described in plain language for Settings. */
  routines: LearnedRoutine[];
  sourcePreferences: SourcePreference[];
  askSuggestions: string[];
}

const BUILT_IN_CALENDAR_VIEW: CalendarView = "day";
const VIEW_LABEL: Record<CalendarView, string> = { day: "Day", week: "Week", month: "Month" };

const count = (signals: InteractionSignal[], f: (s: InteractionSignal) => boolean) => signals.filter(f).length;
const last = (signals: InteractionSignal[], f: (s: InteractionSignal) => boolean) => [...signals].reverse().find(f)?.at ?? "";

const ASK_BASE = [
  "What am I forgetting?",
  "What should I do tonight?",
  "Did anything change?",
  "When do I have time to study?",
  "Do I owe anyone a response?",
  "What's due next week?",
  "Which class is busiest this week?",
  "When is my next Finance exam?",
  "Plan tomorrow",
  "Ignore emails from this club from now on",
];

export function computeLearned(state: OrbitState): Learned {
  const { signals, displayPrefs, promptsAnswered, preferences } = state;
  const routines: LearnedRoutine[] = [];
  const prompts: LearningPrompt[] = [];

  // ---- Preferred calendar view (a clear majority of the last 8 visits) ----
  const views = signals.filter((s) => s.itemType === "calendar" && s.action === "view").slice(-8);
  const tally = new Map<CalendarView, number>();
  views.forEach((v) => tally.set(v.context?.view as CalendarView, (tally.get(v.context?.view as CalendarView) ?? 0) + 1));
  const [topView, topCount] = [...tally.entries()].sort((a, b) => b[1] - a[1])[0] ?? [undefined, 0];
  const calendarView = displayPrefs.calendarView ?? BUILT_IN_CALENDAR_VIEW;
  if (topView && topCount >= 4 && topCount > views.length / 2) {
    routines.push({
      id: "calendar-view",
      pattern: `You usually plan in ${VIEW_LABEL[topView]} view.`,
      effect: displayPrefs.calendarView === topView ? "Calendar opens there by default." : "ORBIT will offer to make it your default.",
      confidence: topCount / views.length,
      lastObserved: views[views.length - 1].at,
    });
    const promptId = `calendar-view:${topView}`;
    if (topView !== calendarView && !promptsAnswered[promptId]) {
      prompts.push({
        id: promptId,
        surface: "calendar",
        message: `You usually use ${VIEW_LABEL[topView]} view. Make it your default?`,
        acceptLabel: "Yes",
        kind: "calendar_view",
        value: topView,
      });
    }
  }

  // ---- Sources the user keeps dismissing (3+ times) ------------------------
  const dismissedBySender = new Map<string, number>();
  signals
    .filter((s) => s.itemType === "message" && (s.action === "dismiss" || s.action === "mute") && s.context?.sender)
    .forEach((s) => dismissedBySender.set(s.context!.sender, (dismissedBySender.get(s.context!.sender) ?? 0) + 1));
  const sourcePreferences: SourcePreference[] = [];
  for (const [sender, n] of dismissedBySender) {
    const muted = preferences.ignoredSources.some((i) => i.key === `sender:${sender}`);
    sourcePreferences.push({
      key: `sender:${sender}`,
      label: sender,
      importanceWeight: Math.max(0, 1 - n * 0.25),
      ignoreProbability: Math.min(0.95, n * 0.3),
      userExplicitlyMuted: muted,
    });
    if (n >= 3) {
      routines.push({
        id: `ignores:${sender}`,
        pattern: `You usually ignore ${sender}.`,
        effect: muted ? "ORBIT hides its general announcements." : "ORBIT ranks it lower and may ask to hide it.",
        confidence: Math.min(0.95, n * 0.3),
        lastObserved: last(signals, (s) => s.context?.sender === sender),
      });
      const promptId = `ignore:${sender}`;
      if (!muted && !promptsAnswered[promptId]) {
        prompts.push({
          id: promptId,
          surface: "today",
          message: `You usually ignore ${sender}. Hide similar messages?`,
          acceptLabel: "Hide them",
          kind: "ignore_source",
          value: `sender:${sender}`,
          label: sender,
        });
      }
    }
  }

  // ---- Fast responders ------------------------------------------------------
  const fastReplyTypes: string[] = [];
  const quickProf = count(signals, (s) => s.action === "complete" && s.context?.senderType === "professor" && Number(s.context?.hoursOpen ?? 99) <= 12);
  if (quickProf >= 2) {
    fastReplyTypes.push("professor");
    routines.push({
      id: "fast-professor",
      pattern: "You answer professors within a few hours.",
      effect: "Professor requests stay near the top.",
      confidence: 0.8,
      lastObserved: last(signals, (s) => s.context?.senderType === "professor"),
    });
  }

  // ---- Works early on big assignments ----------------------------------------
  const early = signals.filter((s) => s.action === "complete" && s.context?.effort === "large" && s.context?.daysEarly);
  const largeWorkLeadDays = early.length >= 2 ? Math.round(early.reduce((n, s) => n + Number(s.context!.daysEarly), 0) / early.length) : 1;
  if (early.length >= 2) {
    routines.push({
      id: "works-early",
      pattern: `You usually finish big assignments about ${largeWorkLeadDays} days early.`,
      effect: "ORBIT suggests work blocks earlier for large projects.",
      confidence: 0.7,
      lastObserved: early[early.length - 1].at,
    });
  }

  // ---- Alert kinds the user keeps dismissing (3+) ----------------------------
  const kindDismissals = new Map<string, number>();
  signals.filter((s) => s.itemType === "attention" && s.action === "dismiss").forEach((s) => {
    const k = s.context?.kind ?? "";
    kindDismissals.set(k, (kindDismissals.get(k) ?? 0) + 1);
  });
  const KIND_FROM_ID: Record<string, AttentionKind> = { prep: "prep", workload: "workload", missing: "missing_info", deadline: "deadline", time: "conflict" };
  const quietedKinds: AttentionKind[] = [];
  for (const [k, n] of kindDismissals) {
    const kind = KIND_FROM_ID[k];
    if (kind && n >= 3 && !quietedKinds.includes(kind)) {
      quietedKinds.push(kind);
      routines.push({
        id: `quiet:${kind}`,
        pattern: `You often dismiss ${kind === "prep" ? "early study suggestions" : kind === "workload" ? "busy-week alerts" : "these alerts"}.`,
        effect: "ORBIT shows fewer of them.",
        confidence: Math.min(0.9, n * 0.25),
        lastObserved: last(signals, (s) => s.context?.kind === k),
      });
    }
  }
  const prepDismissed = kindDismissals.get("prep") ?? 0;
  const prepHorizonDays = prepDismissed >= 2 ? 3 : 5;

  // ---- Tasks pushed back repeatedly (2+ snoozes) -----------------------------
  const loopPenalty: Record<string, number> = {};
  const snoozes = new Map<string, number>();
  signals.filter((s) => s.itemType === "loop" && s.action === "snooze").forEach((s) => snoozes.set(s.context!.id, (snoozes.get(s.context!.id) ?? 0) + 1));
  for (const [id, n] of snoozes) {
    if (n >= 2) {
      loopPenalty[id] = -8;
      const title = state.loops.find((l) => l.id === id)?.title;
      routines.push({ id: `snooze:${id}`, pattern: `You keep pushing back “${title ?? "a task"}”.`, effect: "ORBIT ranks it a little lower.", confidence: 0.6, lastObserved: last(signals, (s) => s.context?.id === id) });
    }
  }

  // ---- Where the user looks first on Today (5+ visits to ORBIT noticed) ------
  const recent = signals.filter((s) => s.itemType === "today").slice(-20);
  const noticedOpens = count(recent, (s) => s.context?.area === "noticed");
  const mattersOpens = count(recent, (s) => s.context?.area === "matters");
  const noticedFirst = displayPrefs.todayOrder === "noticed_first" || (noticedOpens >= 5 && noticedOpens > mattersOpens * 2);
  if (noticedFirst) {
    routines.push({ id: "noticed-first", pattern: "You check what ORBIT noticed first.", effect: "Today shows it higher and expands it a bit more.", confidence: 0.7, lastObserved: last(signals, (s) => s.context?.area === "noticed") });
  }

  return {
    calendarView,
    noticedFirst,
    prepHorizonDays,
    quietedKinds,
    loopPenalty,
    fastReplyTypes,
    largeWorkLeadDays,
    prompts,
    routines,
    sourcePreferences,
    askSuggestions: askSuggestionsFor(state.demoTime, signals),
  };
}

/** Ask ORBIT suggestions: time of day first, then what the user actually asks. */
function askSuggestionsFor(time: DemoTime, signals: InteractionSignal[]): string[] {
  const asked = new Map<string, number>();
  signals.filter((s) => s.itemType === "ask").forEach((s) => asked.set(s.context?.q ?? "", (asked.get(s.context?.q ?? "") ?? 0) + 1));
  const byTime: Record<DemoTime, string[]> = {
    morning: ["What am I forgetting?", "Did anything change?", "When do I have time to study?", "What should I do tonight?"],
    midday: ["What should I do during my free hour?", "What am I forgetting?", "Did anything change?", "What should I do tonight?"],
    evening: ["Plan tomorrow", "What's unfinished?", "Did anything change?", "What am I forgetting?"],
  };
  const lead = byTime[time];
  const rest = [...ASK_BASE].sort((a, b) => (asked.get(b) ?? 0) - (asked.get(a) ?? 0)).filter((q) => !lead.includes(q));
  return [...lead, ...rest];
}
