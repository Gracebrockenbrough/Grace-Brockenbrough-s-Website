"use client";

import { Check, Flame } from "lucide-react";
import type { Goal } from "@/types";
import type { GoalProgress } from "@/services/goals";
import { AREA_LABEL, AREA_STYLE } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { relativeDay } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Planet } from "@/components/areas/Planet";

export function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <span className="block h-2 w-full overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
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
        done ? "border-success bg-success text-navy" : "border-line-strong text-transparent hover:border-success hover:text-success",
      )}
    >
      <Check size={14} strokeWidth={3} aria-hidden />
    </button>
  );
}

const UNIT: Record<string, string> = { run: "runs", save: "deposits", read: "sessions", study: "sessions", habit: "days", career: "steps", generic: "steps" };

export function GoalCard({ goal, progress }: { goal: Goal; progress: GoalProgress }) {
  const { open } = useUI();
  const { today } = useOrbit().derived;
  const style = AREA_STYLE[goal.area];
  const step = progress.today && !progress.today.done ? progress.today : progress.next;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => open({ type: "goal", id: goal.id })}
      onKeyDown={(e) => e.key === "Enter" && open({ type: "goal", id: goal.id })}
      className="cursor-pointer rounded-2xl border border-line bg-surface p-5 transition-shadow hover:shadow-raised"
    >
      <div className="flex items-start gap-3">
        <Planet area={goal.area} size={34} />
        <div className="min-w-0 flex-1">
          <p className={cn("text-[12px] font-semibold uppercase tracking-[0.12em]", style.text)}>{AREA_LABEL[goal.area]} goal</p>
          <p className="font-display text-[20px] leading-snug">{goal.title}</p>
        </div>
        {progress.streak >= 2 && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-attention-soft px-2.5 py-1 text-[13px] font-medium text-attention">
            <Flame size={14} aria-hidden /> {progress.streak} in a row
          </span>
        )}
      </div>
      <div className="mt-4">
        <ProgressBar pct={progress.pct} color={style.hex} />
        <p className="mt-2 text-[14px] text-ink-3">
          {progress.done} of {progress.total} {UNIT[goal.kind]} · {progress.daysLeft} days to go
        </p>
      </div>
      {step && (
        <div className="mt-4 flex items-center gap-3 rounded-xl bg-sunken px-3 py-2.5">
          <StepCheck goalId={goal.id} stepId={step.id} done={step.done} label={step.title} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium">{step.title}</p>
            <p className="truncate text-[13.5px] text-ink-3">{relativeDay(step.date, today)}{step.detail ? ` · ${step.detail}` : ""}</p>
          </div>
        </div>
      )}
      {progress.missed.length > 0 && (
        <p className="mt-3 text-[13.5px] text-attention">
          {progress.missed.length === 1 ? `Missed: ${progress.missed[0].title}` : `${progress.missed.length} steps missed`} — no stress, ORBIT can fit it in.
        </p>
      )}
    </div>
  );
}
