"use client";

import { Check } from "lucide-react";
import type { Goal } from "@/types";
import type { GoalProgress } from "@/services/goals";
import { areaStyle } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { relativeDay } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";

export function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <span className="block h-1.5 w-full overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(3, pct)}%`, background: color }} />
    </span>
  );
}

/** A checkbox for one goal step. */
export function StepCheck({ goalId, stepId, done, label }: { goalId: string; stepId: string; done: boolean; label: string }) {
  const { dispatch } = useOrbit();
  const { notify } = useUI();
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={done ? `Mark “${label}” not done` : `Mark “${label}” done`}
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: "TOGGLE_GOAL_STEP", goalId, stepId });
        notify(done ? "Unchecked." : `Done: ${label}`, { undoable: true });
      }}
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        done ? "border-success bg-success text-on-primary" : "border-line-strong text-transparent hover:border-success hover:text-success",
      )}
    >
      <Check size={14} strokeWidth={3} aria-hidden />
    </button>
  );
}

export const GOAL_UNIT: Record<string, string> = { run: "runs", save: "deposits", read: "sessions", study: "sessions", habit: "days", career: "steps", generic: "steps" };

/** Compact goal row: title, progress, and the next step. */
export function GoalCard({ goal, progress, showStep = true }: { goal: Goal; progress: GoalProgress; showStep?: boolean }) {
  const { open } = useUI();
  const { today } = useOrbit().derived;
  const style = areaStyle(goal.area);
  const step = progress.today && !progress.today.done ? progress.today : progress.next;
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-card">
      <button type="button" onClick={() => open({ type: "goal", id: goal.id })} className="block w-full text-left">
        <span className="flex items-baseline justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} aria-hidden />
            <span className="truncate text-[16px] font-semibold">{goal.title}</span>
          </span>
          <span className="shrink-0 text-[13.5px] tabular-nums text-ink-3">
            {progress.done} / {progress.total} {GOAL_UNIT[goal.kind]}
          </span>
        </span>
        <span className="mt-2.5 block">
          <ProgressBar pct={progress.pct} color={style.hex} />
        </span>
      </button>
      {showStep && step && (
        <div className="mt-3 flex items-center gap-3">
          <StepCheck goalId={goal.id} stepId={step.id} done={step.done} label={step.title} />
          <p className="min-w-0 flex-1 truncate text-[14.5px]">
            <span className="text-ink">{step.title}</span> <span className="text-ink-3">· {relativeDay(step.date, today)}</span>
          </p>
        </div>
      )}
      {progress.missed.length > 0 && <p className="mt-2 text-[13.5px] text-ink-3">{progress.missed.length === 1 ? "1 step missed" : `${progress.missed.length} steps missed`} — Orbit can fit it in.</p>}
    </div>
  );
}
