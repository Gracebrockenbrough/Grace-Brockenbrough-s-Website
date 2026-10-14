"use client";

import { useCallback, useMemo } from "react";
import type { CalendarEvent, LoopStatus, PriorityLevel, RankedLoop } from "@/types";
import { now, nowStr, todayStr } from "@/lib/clock";
import { addDays, formatShortDate, formatTime, weekday } from "@/lib/time";
import { uid } from "@/lib/cn";
import { useOrbit } from "./OrbitProvider";
import { useUI } from "./UIProvider";
import type { MessageFeedback } from "./reducer";

/** Snooze choices relative to the current time. */
export function snoozeOptions(): { label: string; until: string }[] {
  const today = todayStr();
  const hour = now().getHours();
  const toMonday = ((8 - weekday(today)) % 7) || 7;
  return [
    ...(hour < 17 ? [{ label: "Later today", until: `${today}T18:00` }] : []),
    { label: "Tomorrow", until: `${addDays(today, 1)}T09:00` },
    { label: "Monday", until: `${addDays(today, toMonday)}T08:00` },
    { label: "Next week", until: `${addDays(today, 7)}T08:00` },
  ];
}

const STATUS_LABEL: Record<LoopStatus, string> = { now: "Now", soon: "Soon", later: "Later", waiting: "Waiting", done: "Done" };

/** Loop actions with consistent, undoable confirmations. */
export function useLoopActions() {
  const { dispatch, derived } = useOrbit();
  const { notify } = useUI();

  const find = useCallback((id: string) => derived.loops.find((l) => l.id === id), [derived.loops]);

  return useMemo(
    () => ({
      complete(id: string) {
        const loop = find(id);
        dispatch({ type: "COMPLETE_LOOP", id, at: nowStr() });
        notify(`Done: ${loop?.title ?? "item"}`, { undoable: true });
      },
      reopen(id: string) {
        dispatch({ type: "REOPEN_LOOP", id });
        notify("Moved back to your open loops.", { undoable: true });
      },
      snooze(id: string, until: string = snoozeOptions().find((o) => o.label === "Tomorrow")!.until, label = "tomorrow") {
        dispatch({ type: "SNOOZE_LOOP", id, until });
        notify(`Snoozed until ${label.toLowerCase()}.`, { undoable: true });
      },
      unsnooze(id: string) {
        dispatch({ type: "UNSNOOZE_LOOP", id });
        notify("Back in your open loops.", { undoable: true });
      },
      setStatus(id: string, status: LoopStatus) {
        if (status === "done") {
          dispatch({ type: "COMPLETE_LOOP", id, at: nowStr() });
        } else {
          dispatch({ type: "SET_LOOP_STATUS", id, status });
        }
        notify(`Moved to ${STATUS_LABEL[status]}.`, { undoable: true });
      },
      setPriority(id: string, priority: PriorityLevel) {
        dispatch({ type: "SET_LOOP_PRIORITY", id, priority });
        notify(`Priority set to ${priority}. Orbit will remember this.`, { undoable: true });
      },
      reschedule(id: string, deadline: string) {
        dispatch({ type: "RESCHEDULE_LOOP", id, deadline });
        const [date, time] = deadline.split("T");
        notify(`Rescheduled to ${formatShortDate(date)}${time && time !== "23:59" ? ` at ${formatTime(time)}` : ""}.`, { undoable: true });
      },
      remove(id: string) {
        dispatch({ type: "REMOVE_LOOP", id });
        notify("Removed.", { undoable: true });
      },
      notImportant(loop: RankedLoop) {
        if (loop.messageId) {
          dispatch({ type: "MESSAGE_FEEDBACK", id: loop.messageId, feedback: "not_important" });
        } else {
          dispatch({ type: "MARK_LOOP_NOT_IMPORTANT", id: loop.id, sourceKey: `sender:${loop.source.label}` });
        }
        notify("Got it. Orbit will show fewer things like this.", { undoable: true });
      },
    }),
    [dispatch, notify, find],
  );
}

export function useMessageActions() {
  const { dispatch, state } = useOrbit();
  const { notify } = useUI();
  return useCallback(
    (id: string, feedback: MessageFeedback) => {
      const message = state.messages.find((m) => m.id === id);
      dispatch({ type: "MESSAGE_FEEDBACK", id, feedback });
      const copy: Record<MessageFeedback, string> = {
        not_important: `Got it. ${message?.sender ?? "This sender"} will matter less from now on.`,
        important: `Got it. Orbit will raise messages from ${message?.sender ?? "this sender"}.`,
        replied: "Marked as replied.",
        remind_later: "Orbit will remind you tomorrow morning.",
        ignore_source: `Orbit will ignore ${message?.sender ?? "this source"}.`,
      };
      notify(copy[feedback], { undoable: true });
    },
    [dispatch, notify, state.messages],
  );
}

/** Add a planned block to the calendar (user-approved suggestion). */
export function usePlanBlock() {
  const { dispatch } = useOrbit();
  const { notify } = useUI();
  return useCallback(
    (block: { title: string; date: string; start: string; end: string; courseId?: string; loopId?: string; examId?: string; category?: CalendarEvent["category"] }) => {
      const event: CalendarEvent = {
        id: uid("plan"),
        title: block.title,
        date: block.date,
        startTime: block.start,
        endTime: block.end,
        category: block.category ?? "study",
        source: { kind: "orbit", label: "Planned with Orbit" },
        hardCommitment: false,
        confidence: 1,
        courseId: block.courseId,
        suggestedByOrbit: true,
        loopId: block.loopId && !block.loopId.startsWith("exam:") ? block.loopId : undefined,
        prepForExamId: block.examId ?? (block.loopId?.startsWith("exam:") ? block.loopId.slice(5) : undefined),
      };
      dispatch({ type: "ADD_EVENT", event });
      notify(`Added “${block.title}” · ${formatTime(block.start)}–${formatTime(block.end)}.`, { undoable: true });
    },
    [dispatch, notify],
  );
}

export function tomorrowAt(time: string): string {
  return `${addDays(nowStr().split("T")[0], 1)}T${time}`;
}
