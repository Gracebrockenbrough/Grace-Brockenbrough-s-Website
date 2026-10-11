"use client";

import { useState } from "react";
import { ArrowDown, ArrowRight, ShieldCheck } from "lucide-react";
import { addDays, formatShortDate, formatTimeRange, relativeDay, relativePast } from "@/lib/time";
import { buildCalendarItems, findGaps } from "@/services/calendar";
import { usePlanBlock } from "@/store/useActions";
import type { DetectedChange } from "@/types";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Modal } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { ConfidenceTag, SourceBadge } from "@/components/ui/Badges";
import { describeWhen } from "@/services/changes";

/** High-impact schedule changes are never applied silently. */
export function ChangeModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, derived, dispatch } = useOrbit();
  const { open, notify } = useUI();
  const plan = usePlanBlock();
  // Keep a copy: once applied, the change leaves the list but the re-plan step still needs it.
  const [snapshot] = useState<DetectedChange | undefined>(() => derived.changes.find((c) => c.id === id));
  const [planSlots, setPlanSlots] = useState<{ date: string; start: string; end: string; include: boolean }[] | null>(null);
  const change = derived.changes.find((c) => c.id === id) ?? (planSlots ? snapshot : undefined);

  if (planSlots && change) {
    const course = state.courses.find((c) => c.id === change.courseId);
    const chosen = planSlots.filter((s) => s.include);
    return (
      <Modal title="Your new study plan" onClose={onClose}>
        <p className="text-[15.5px] text-ink-2">
          Calendar updated. Here are the best open windows before {relativeDay(change.newValue.date, derived.today)}&apos;s exam.
        </p>
        {planSlots.length ? (
          <ul className="mt-4 divide-y divide-line">
            {planSlots.map((slot, i) => (
              <li key={slot.date + slot.start}>
                <label className="flex cursor-pointer items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={slot.include}
                    onChange={() => setPlanSlots((all) => all!.map((x, j) => (j === i ? { ...x, include: !x.include } : x)))}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span className="flex-1">
                    <span className="block text-[16px] font-medium">Study for {course?.code ?? "the exam"}</span>
                    <span className="block text-[14.5px] text-ink-3">
                      {relativeDay(slot.date, derived.today)} · {formatShortDate(slot.date)} · {formatTimeRange(slot.start, slot.end)}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-[15px] text-ink-2">Your days before the exam are full. The Day view can help you make room.</p>
        )}
        <div className="mt-5 flex gap-2">
          <Button
            variant="primary"
            disabled={!chosen.length}
            onClick={() => {
              chosen.forEach((slot) =>
                plan({ title: `Study for ${course?.code ?? "exam"}`, date: slot.date, start: slot.start, end: slot.end, courseId: change.courseId, examId: change.entityId }),
              );
              onClose();
            }}
          >
            Add {chosen.length} study {chosen.length === 1 ? "block" : "blocks"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Skip
          </Button>
        </div>
      </Modal>
    );
  }

  if (!change) {
    return (
      <Modal title="Already handled" onClose={onClose}>
        <p className="text-ink-2">This change has already been applied or dismissed.</p>
      </Modal>
    );
  }

  const confident = change.confidence >= 0.8;
  const course = state.courses.find((c) => c.id === change.courseId);
  const message = change.source.ref ? state.messages.find((m) => m.id === change.source.ref) : undefined;

  /** Up to three 90-minute windows, one per day, before the new exam date. */
  const proposeSlots = (c: DetectedChange) => {
    const items = buildCalendarItems(derived.calendarSource, derived.today, c.newValue.date);
    const slots: { date: string; start: string; end: string; include: boolean }[] = [];
    for (let d = addDays(derived.today, 1); d < c.newValue.date && slots.length < 3; d = addDays(d, 1)) {
      const gap = findGaps(items, d, { dayStart: "13:00", dayEnd: "21:00", minMinutes: 90 })[0];
      if (gap) slots.push({ date: d, start: gap.start, end: addMinutesSafe(gap.start, 90), include: true });
    }
    return slots;
  };

  const applyAndPlan = () => {
    dispatch({ type: "APPLY_CHANGE", changeId: change.id, entityType: change.entityType, entityId: change.entityId, value: change.newValue });
    setPlanSlots(proposeSlots(change));
  };

  const apply = () => {
    dispatch({ type: "APPLY_CHANGE", changeId: change.id, entityType: change.entityType, entityId: change.entityId, value: change.newValue });
    notify(`${change.title} updated to ${describeWhen(change.newValue)}.`, { undoable: true });
    onClose();
  };
  const ignore = () => {
    dispatch({ type: "DISMISS_CHANGE", changeId: change.id });
    notify(confident ? "Kept the original date." : "Kept the original date. Orbit will watch for an official update.", { undoable: true });
    onClose();
  };

  return (
    <Modal
      title={confident ? (change.entityType === "exam" ? "Exam moved" : "Due date moved") : "This may have moved"}
      onClose={onClose}
      eyebrow={<span className="text-[13.5px] font-semibold text-attention">{course?.code ?? "Change"}</span>}
      footer={
        <div className="flex flex-wrap gap-2">
          {confident && change.entityType === "exam" ? (
            <>
              <Button variant="primary" onClick={applyAndPlan} data-autofocus>
                Update &amp; make a study plan
              </Button>
              <Button variant="secondary" onClick={apply}>
                Just update
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={apply} data-autofocus>
              {confident ? "Update calendar" : "Update anyway"}
            </Button>
          )}
          {message && (
            <Button variant="secondary" onClick={() => open({ type: "message", id: message.id })}>
              See {change.source.kind === "email" ? "email" : "message"}
            </Button>
          )}
          <Button variant="ghost" onClick={ignore}>
            {confident ? "Ignore" : "Keep original"}
          </Button>
        </div>
      }
    >
      <p className="text-[16px] font-semibold text-ink">{change.title}</p>

      <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <div className="flex-1 rounded-2xl border border-line bg-canvas p-4">
          <p className="text-[13.5px] font-semibold text-ink-3">Was</p>
          <p className="mt-1 text-[16px] text-ink-2 line-through decoration-ink-3/60">{describeWhen(change.previousValue)}</p>
        </div>
        <ArrowRight className="hidden shrink-0 text-ink-3 sm:block" size={20} aria-hidden />
        <ArrowDown className="mx-auto shrink-0 text-ink-3 sm:hidden" size={20} aria-hidden />
        <div className="flex-1 rounded-2xl border border-attention-line bg-attention-soft p-4">
          <p className="text-[13.5px] font-semibold text-attention">Now</p>
          <p className="mt-1 text-[16px] font-semibold text-ink">{describeWhen(change.newValue)}</p>
        </div>
      </div>

      {change.impact && (
        <p className="mt-3 rounded-xl bg-attention-soft px-3 py-2.5 text-[15px] font-medium text-ink">{change.impact}</p>
      )}

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={change.source} className="text-[14px] text-ink-2" />
          {message && <span className="text-[13.5px] text-ink-3">· {relativePast(message.timestamp, derived.now)}</span>}
          <ConfidenceTag confidence={change.confidence} />
        </div>
        <blockquote className="mt-2 border-l-2 border-line-strong pl-3 text-[15px] italic leading-relaxed text-ink-2">“{change.quote}”</blockquote>
      </div>

      <p className="mt-5 flex items-start gap-2 text-[14px] text-ink-2">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />
        {confident ? "Your calendar hasn't changed yet." : "Only a classmate mentioned this. Nothing changes unless you say so."}
      </p>
    </Modal>
  );
}

function addMinutesSafe(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
