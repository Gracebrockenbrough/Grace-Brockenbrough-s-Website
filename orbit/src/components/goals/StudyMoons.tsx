"use client";

import { Check } from "lucide-react";
import type { StudyProgress } from "@/services/goals";
import { cn } from "@/lib/cn";
import { relativeDay } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";

/** Moons fill in as you study: "Studied 2 of 5 days." */
export function Moons({ filled, total, size = 22 }: { filled: number; total: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5" role="img" aria-label={`${filled} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const on = i < filled;
        return (
          <span
            key={i}
            className={cn("relative inline-block overflow-hidden rounded-full transition-colors duration-300", on ? "bg-primary" : "border-2 border-line-strong")}
            style={{ width: size, height: size }}
          >
            {on && (
              <>
                <span className="absolute rounded-full bg-canvas/20" style={{ width: size * 0.24, height: size * 0.24, left: size * 0.52, top: size * 0.2 }} />
                <span className="absolute rounded-full bg-canvas/20" style={{ width: size * 0.16, height: size * 0.16, left: size * 0.24, top: size * 0.56 }} />
              </>
            )}
          </span>
        );
      })}
    </span>
  );
}

export function StudyMoons({ study, compact = false }: { study: StudyProgress; compact?: boolean }) {
  const { dispatch, derived } = useOrbit();
  const { notify } = useUI();
  const { exam, studied, target, daysLeft, studiedToday, note } = study;
  const toggle = () => {
    dispatch({ type: "TOGGLE_STUDY_DAY", examId: exam.id, date: derived.today });
    notify(studiedToday ? "Removed today's study session." : `Nice. ${Math.min(target, studied.length + 1)} of ${target} study days for ${exam.title}.`, { undoable: true });
  };
  return (
    <div className={cn("rounded-2xl bg-surface shadow-card", compact ? "p-4" : "p-5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold">{exam.title}</p>
          <p className="text-[14px] text-ink-3">{relativeDay(exam.date!, derived.today)} · {daysLeft === 0 ? "today" : `${daysLeft} ${daysLeft === 1 ? "day" : "days"} away`}</p>
        </div>
        <p className="shrink-0 text-[14px] font-medium text-ink-2">
          Studied {Math.min(studied.length, target)}/{target} days
        </p>
      </div>
      <div className="mt-3">
        <Moons filled={Math.min(studied.length, target)} total={target} size={compact ? 22 : 26} />
      </div>
      {!compact && <p className="mt-3 text-[14.5px] text-ink-2">{note}</p>}
      <button
        type="button"
        onClick={toggle}
        aria-pressed={studiedToday}
        className={cn(
          "mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-[14px] font-medium transition-colors",
          studiedToday ? "border-success bg-success-soft text-success" : "border-line-strong text-ink hover:bg-sunken",
        )}
      >
        <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", studiedToday ? "border-success bg-success text-canvas" : "border-ink-3")}>
          {studiedToday && <Check size={11} strokeWidth={3} aria-hidden />}
        </span>
        {studiedToday ? "Studied today" : "I studied today"}
      </button>
    </div>
  );
}
