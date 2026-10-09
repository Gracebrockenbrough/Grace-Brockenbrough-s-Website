"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, formatShortDate, formatTimeRange, relativeDay } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { usePlanBlock } from "@/store/useActions";
import { Drawer } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { buildCalendarItems, findStudySlot } from "@/services/calendar";

/** Follow-ups for attention items that aren't changes or conflicts. */
export function AttentionDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, derived, dispatch } = useOrbit();
  const { notify } = useUI();
  const plan = usePlanBlock();
  const item = derived.attention.find((a) => a.id === id) ?? derived.conflicts.map((c) => ({ id: c.id, refId: c.id })).find((c) => c.id === id);
  const conflict = derived.conflicts.find((c) => c.id === (item?.refId ?? id));
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");

  const prepSlots = useMemo(() => {
    if (conflict?.type !== "prep") return [];
    const exam = state.exams.find((x) => x.id === conflict.itemIds[0]);
    if (!exam?.date) return [];
    const items = buildCalendarItems(derived.calendarSource, derived.today, exam.date);
    const slots = [];
    let before = exam.date;
    for (let i = 0; i < 3; i++) {
      const slot = findStudySlot(items, addDays(derived.today, 1), before, 90);
      if (!slot) break;
      slots.push(slot);
      before = slot.date;
    }
    return slots.map((s) => ({ ...s, examId: exam.id, courseId: exam.courseId }));
  }, [conflict, state.exams, derived.calendarSource, derived.today]);

  if (!conflict) {
    return (
      <Drawer title="All set" onClose={onClose}>
        <p className="text-ink-2">This has already been handled.</p>
      </Drawer>
    );
  }

  const dismiss = (message: string) => {
    dispatch({ type: "DISMISS", id: conflict.id });
    notify(message, { undoable: true });
    onClose();
  };

  if (conflict.type === "prep") {
    const exam = state.exams.find((x) => x.id === conflict.itemIds[0]);
    const course = state.courses.find((c) => c.id === exam?.courseId);
    return (
      <Drawer title={`Plan study time for ${course?.code ?? "your exam"}`} onClose={onClose}>
        <p className="text-[15px] text-ink-2">{conflict.summary} Here are open windows that don&apos;t touch your existing plans:</p>
        <ul className="mt-4 space-y-2">
          {prepSlots.map((s) => (
            <li key={s.date + s.start} className="flex items-center justify-between gap-3 rounded-2xl border border-line p-3.5">
              <div>
                <p className="font-medium">{relativeDay(s.date, derived.today)}</p>
                <p className="text-[14px] text-ink-2">{formatShortDate(s.date)} · {formatTimeRange(s.start, s.end)}</p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  plan({ title: `Study for ${course?.code ?? "exam"}`, date: s.date, start: s.start, end: s.end, courseId: s.courseId, examId: s.examId });
                  onClose();
                }}
              >
                Add
              </Button>
            </li>
          ))}
          {!prepSlots.length && <li className="text-ink-2">Your calendar is full before the exam. Try the Day view to find time.</li>}
        </ul>
        <Button variant="ghost" className="mt-4" onClick={() => dismiss("Okay. ORBIT won't suggest study time for this exam.")}>
          I&apos;ve got it covered
        </Button>
      </Drawer>
    );
  }

  if (conflict.type === "missing_info") {
    const exam = state.exams.find((x) => x.id === conflict.itemIds[0]);
    const assignment = state.assignments.find((x) => x.id === conflict.itemIds[0]);
    return (
      <Drawer title="Add the missing date" onClose={onClose}>
        <p className="text-[15px] text-ink-2">{conflict.summary} If you know it, add it here. Otherwise ORBIT will watch your email and Canvas for an announcement.</p>
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!date) return;
            if (exam) dispatch({ type: "SET_EXAM_DATE", id: exam.id, date, startTime: time, endTime: undefined });
            else if (assignment) dispatch({ type: "SET_ASSIGNMENT_DUE", id: assignment.id, due: `${date}T${time}` });
            notify(`Saved. ${exam?.title ?? assignment?.title} is on ${formatShortDate(date)}.`, { undoable: true });
            onClose();
          }}
        >
          <label className="flex flex-col text-[13px] text-ink-3">
            Date
            <input type="date" required value={date} min={derived.today} onChange={(e) => setDate(e.target.value)} className="mt-1 min-h-10 rounded-xl border border-line-strong px-3 text-[15px] text-ink" data-autofocus />
          </label>
          <label className="flex flex-col text-[13px] text-ink-3">
            Time
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1 min-h-10 rounded-xl border border-line-strong px-3 text-[15px] text-ink" />
          </label>
          <Button type="submit" variant="primary">Save date</Button>
        </form>
        <Button variant="ghost" className="mt-4" onClick={() => dismiss("ORBIT will watch for an announcement.")}>
          Watch for an announcement
        </Button>
      </Drawer>
    );
  }

  // Workload
  return (
    <Drawer title="Busy stretch ahead" onClose={onClose}>
      <p className="text-[15px] text-ink-2">These land close together. Starting one early keeps the week manageable.</p>
      <ul className="mt-4 divide-y divide-line rounded-2xl border border-line">
        {(conflict.items ?? []).map((i) => (
          <li key={i.id} className="flex justify-between gap-3 px-4 py-3 text-[15px]">
            <span className="font-medium">{i.title.replace(/ due$/, "")}</span>
            <span className="text-ink-2">{relativeDay(i.date, derived.today)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={`/calendar?view=week&date=${conflict.date}`} onClick={onClose} className="inline-flex min-h-10 items-center rounded-xl bg-accent px-4 text-[15px] font-medium text-white hover:bg-accent-strong">
          See the week
        </Link>
        <Button variant="ghost" onClick={() => dismiss("Got it.")}>
          Dismiss
        </Button>
      </div>
    </Drawer>
  );
}
