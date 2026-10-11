"use client";

import { CalendarPlus } from "lucide-react";
import { formatDuration, formatTimeRange } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { usePlanBlock } from "@/store/useActions";
import { taskDetail } from "@/components/loops/TaskRow";

/** Ask opens with an answer already: the one thing to do now, and when. */
export function RightNow() {
  const { derived } = useOrbit();
  const { open } = useUI();
  const plan = usePlanBlock();
  const top = derived.priorities[0];
  if (!top) return null;
  const free = derived.freeTime.find((f) => f.loopId === top.id) ?? derived.freeTime[0];
  const verb = /^(Reply|Submit|Return|Send|Register|Schedule|Call|Email)\b/.test(top.title) ? "" : "Finish your ";

  return (
    <section aria-label="Right now" className="paper rounded-3xl p-5 shadow-raised">
      <p className="text-[14px] font-medium text-ink-2">Right now</p>
      <p className="mt-1 font-display text-[26px] leading-tight">
        {verb}
        {verb ? top.title.charAt(0).toLowerCase() + top.title.slice(1) : top.title}.
      </p>
      <p className="mt-1.5 text-[15px] text-ink-2">{taskDetail(top, derived.now)}</p>
      {free && (
        <p className="text-[15px] text-ink-2">
          You have a clear window from {formatTimeRange(free.start, free.end)} ({formatDuration(free.minutes)}).
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => open({ type: "loop", id: top.id })} className="min-h-10 rounded-full bg-canvas px-5 text-[15px] font-medium" style={{ color: "var(--color-ink)" }}>
          Start
        </button>
        {free && (
          <button
            type="button"
            onClick={() => plan({ title: top.title, date: free.date, start: free.start, end: free.planEnd, loopId: top.id, courseId: top.courseId })}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-current/25 px-4 text-[15px] font-medium opacity-90"
          >
            <CalendarPlus size={15} aria-hidden /> Block the time
          </button>
        )}
      </div>
    </section>
  );
}
