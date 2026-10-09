/**
 * ORBIT intelligence layer — the single entry point the UI uses.
 *
 * Everything here is deterministic and rule-based for the prototype. Each
 * function has a narrow, typed contract so a real model or backend service can
 * replace its body without touching components.
 */
import type {
  AttentionItem,
  CalendarItem,
  Conflict,
  DetectedChange,
  FreeTimeSuggestion,
  Message,
  MessageClassification,
  MorningBrief,
  RankedLoop,
} from "@/types";
import type { OrbitState } from "@/store/state";
import { addDays, toDateStr } from "@/lib/time";
import { buildRankedLoops, selectPriorities } from "./priority";
import { classifyMessage, isIgnored } from "./messages";
import { detectChanges } from "./changes";
import {
  buildCalendarItems,
  detectMissingInfo,
  detectPrepGaps,
  detectTimeConflicts,
  detectWorkloadConflicts,
  suggestFreeTime,
  type CalendarSource,
} from "./calendar";
import { buildAttention, buildComingUp, buildNoticed, createMorningBrief, type ComingUpGroup, type NoticedItem } from "./attention";
import { computeLearned, type Learned } from "./learning";
import { hiddenKinds } from "./connections";

export { calculatePriority, buildRankedLoops, selectPriorities } from "./priority";
export { classifyMessage, requiresReply } from "./messages";
export { detectChanges } from "./changes";
export { detectTimeConflicts as detectConflicts, suggestFreeTime, buildCalendarItems } from "./calendar";
export { createMorningBrief } from "./attention";
export { processCapture } from "./capture";
export { answerQuestion } from "./ask";

export interface OrbitDerived {
  now: Date;
  today: string;
  loops: RankedLoop[];
  openLoops: RankedLoop[];
  priorities: RankedLoop[];
  changes: DetectedChange[];
  conflicts: Conflict[];
  timeConflicts: Conflict[];
  attention: AttentionItem[];
  needsReply: { message: Message; classification: MessageClassification; loop?: RankedLoop }[];
  todayItems: CalendarItem[];
  freeTime: FreeTimeSuggestion[];
  comingUp: ComingUpGroup[];
  brief: MorningBrief;
  upcomingItems: CalendarItem[];
  calendarSource: CalendarSource;
  classified: { message: Message; classification: MessageClassification }[];
  /** Everything ORBIT noticed that isn't a normal task, ranked. */
  noticed: NoticedItem[];
  tomorrowItems: CalendarItem[];
  learned: Learned;
}

export function computeDerived(state: OrbitState, now: Date): OrbitDerived {
  const today = toDateStr(now);
  const prefs = state.preferences;
  const learned = computeLearned(state);
  const hidden = hiddenKinds(state.sources);

  const loops = buildRankedLoops({
    loops: state.loops,
    assignments: state.assignments,
    messages: state.messages,
    courses: state.courses,
    loopMeta: state.loopMeta,
    prefs,
    sources: state.sources,
    now,
    learnedAdjust: learned.loopPenalty,
    fastReplyTypes: learned.fastReplyTypes,
  });
  const openLoops = loops.filter((l) => l.status !== "done");
  const priorities = selectPriorities(openLoops);

  const changes = detectChanges(state.facts, state.exams, state.assignments, state.courses, state.sources, state.changeStatus);

  const calendarSource: CalendarSource = {
    courses: state.courses,
    events: state.events,
    exams: state.exams,
    assignments: state.assignments,
    loops,
    pendingChanges: changes,
    hiddenKinds: hidden,
  };

  const horizonEnd = addDays(today, 14);
  const upcomingItems = buildCalendarItems(calendarSource, today, horizonEnd);
  const todayItems = upcomingItems.filter((i) => i.date === today);

  const timeConflicts = detectTimeConflicts(upcomingItems).filter((c) => !state.conflictStatus[c.id]);
  const conflicts: Conflict[] = [
    ...timeConflicts,
    ...detectWorkloadConflicts(upcomingItems, state.assignments, today).filter((c) => !state.conflictStatus[c.id]),
    ...detectPrepGaps(state.exams, state.events, state.courses, today, learned.prepHorizonDays).filter((c) => !state.conflictStatus[c.id]),
    ...detectMissingInfo(state.exams, state.assignments, state.courses).filter((c) => !state.conflictStatus[c.id]),
  ].filter((c) => !state.dismissed.includes(c.id));

  const classified = state.messages
    .filter((m) => !hidden.has(m.source))
    .map((message) => ({ message, classification: classifyMessage(message, prefs) }))
    .sort((a, b) => b.message.timestamp.localeCompare(a.message.timestamp));

  const priorityIds = new Set(priorities.map((p) => p.id));
  const needsReply = classified
    .filter(({ message, classification }) => classification.category === "requires_reply" && !message.responded && !message.dismissed && !message.remindLater && !isIgnored(message.sender, prefs))
    .map(({ message, classification }) => ({ message, classification, loop: loops.find((l) => l.id === `msg:${message.id}`) }))
    .filter((r) => !r.loop || (!r.loop.snoozed && r.loop.status !== "done"))
    .sort((a, b) => (b.loop?.priorityScore ?? 0) - (a.loop?.priorityScore ?? 0));

  const freeTime = state.dismissed.includes(`free:${today}`)
    ? []
    : suggestFreeTime({ date: today, items: todayItems, loops: openLoops, exams: state.exams, events: state.events, courses: state.courses, today, now }).filter(
        (s) => !state.dismissed.includes(s.id),
      );

  // If today's free-time card already covers exam prep, don't also flag it.
  const freeCoversPrep = freeTime.some((f) => f.loopId?.startsWith("exam:"));
  const attention = buildAttention({
    changes,
    conflicts: freeCoversPrep ? conflicts.filter((c) => c.type !== "prep") : conflicts,
    loops: openLoops,
    priorities,
    courses: state.courses,
    dismissed: state.dismissed,
    prefs,
    today,
    now,
    quieted: learned.quietedKinds,
  });
  const visibleReplies = needsReply.filter((n) => !priorityIds.has(`msg:${n.message.id}`));
  const noticed = buildNoticed(attention, visibleReplies);
  const tomorrow = addDays(today, 1);
  const tomorrowItems = upcomingItems.filter((i) => i.date === tomorrow);

  // Coming Up stays high-level: anything already flagged in Needs Attention is left out.
  const comingUp = buildComingUp(upcomingItems, today, new Set(attention.filter((a) => a.kind === "deadline").map((a) => a.refId)));

  const brief = createMorningBrief({
    name: state.user.name,
    priorities,
    todayItems,
    conflicts,
    changes,
    freeTime,
    upcoming: upcomingItems,
    needsReply: needsReply.map((n) => n.message),
    today,
  });

  return {
    now,
    today,
    loops,
    openLoops,
    priorities,
    changes,
    conflicts,
    timeConflicts,
    attention,
    needsReply: visibleReplies,
    todayItems,
    freeTime,
    comingUp,
    brief,
    upcomingItems,
    calendarSource,
    classified,
    noticed,
    tomorrowItems,
    learned,
  };
}
