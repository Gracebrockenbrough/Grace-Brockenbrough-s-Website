"use client";

import { CalendarPlus, ExternalLink, Link2 } from "lucide-react";
import { AREA_LABEL, AREA_STYLE } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { addDays, addMinutesToTime, formatShortDate, relativeDay, startOfWeek } from "@/lib/time";
import { appFor } from "@/lib/handoff";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { usePlanBlock } from "@/store/useActions";
import { Drawer } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { Planet } from "@/components/areas/Planet";
import { ProgressBar, StepCheck } from "@/components/goals/GoalCard";

function weekLabel(weekStart: string, thisWeek: string): string {
  if (weekStart === thisWeek) return "This week";
  if (weekStart === addDays(thisWeek, 7)) return "Next week";
  if (weekStart < thisWeek) return `Week of ${formatShortDate(weekStart)} · past`;
  return `Week of ${formatShortDate(weekStart)}`;
}

/** A goal's full plan: every step, grouped by week, each one checkable. */
export function GoalDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, derived, dispatch } = useOrbit();
  const { notify, open } = useUI();
  const plan = usePlanBlock();
  const entry = derived.goals.find((g) => g.goal.id === id);
  if (!entry) {
    return (
      <Drawer title="Goal not found" onClose={onClose}>
        <p className="text-ink-2">It may have been removed.</p>
      </Drawer>
    );
  }
  const { goal, progress } = entry;
  const style = AREA_STYLE[goal.area];
  const thisWeek = startOfWeek(derived.today);
  const weeks = new Map<string, typeof goal.steps>();
  for (const s of goal.steps) {
    const w = startOfWeek(s.date);
    weeks.set(w, [...(weeks.get(w) ?? []), s]);
  }
  const next = progress.next;
  const app = appFor(goal.title);
  const strava = goal.kind === "run" ? state.sources.find((s) => s.id === "src-strava" && s.status === "available") : undefined;

  return (
    <Drawer
      title={goal.title}
      onClose={onClose}
      eyebrow={<span className={cn("text-[12px] font-semibold uppercase tracking-[0.12em]", style.text)}>{AREA_LABEL[goal.area]} goal · by {formatShortDate(goal.target)}</span>}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {next && (
            <Button
              variant="primary"
              onClick={() => {
                const start = goal.area === "wellness" ? "17:00" : "15:00";
                const end = addMinutesToTime(start, next.minutes ?? 30);
                plan({ title: next.title, date: next.date, start, end, category: goal.area === "wellness" ? "personal" : "study" });
              }}
            >
              <CalendarPlus size={16} aria-hidden /> Put next step on my calendar
            </Button>
          )}
          {app && (
            <a href={app.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line-strong px-3 text-[15px] font-medium hover:bg-sunken">
              <ExternalLink size={15} aria-hidden /> Open {app.label}
            </a>
          )}
          <button
            type="button"
            className="ml-auto text-[14px] text-ink-3 hover:text-critical"
            onClick={() => {
              dispatch({ type: "REMOVE_GOAL", id: goal.id });
              notify("Goal removed.", { undoable: true });
              onClose();
            }}
          >
            Remove goal
          </button>
        </div>
      }
    >
      <div className="flex items-center gap-4">
        <Planet area={goal.area} size={52} ring glow />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] text-ink-2">{goal.plan}</p>
        </div>
      </div>
      <div className="mt-5">
        <ProgressBar pct={progress.pct} color={style.hex} />
        <div className="mt-2 flex justify-between text-[14px] text-ink-3">
          <span>{progress.done} of {progress.total} done</span>
          <span>{progress.daysLeft} days to go</span>
        </div>
      </div>

      {strava && (
        <button
          type="button"
          onClick={() => open({ type: "connect", id: strava.id })}
          className="mt-5 flex w-full items-center gap-3 rounded-xl border border-dashed border-accent-line px-4 py-3 text-left hover:bg-accent-soft"
        >
          <Link2 size={18} className="shrink-0 text-accent" aria-hidden />
          <span className="text-[14.5px]">
            <span className="font-medium">Connect Strava</span>
            <span className="block text-ink-3">Runs you log there will check themselves off here.</span>
          </span>
        </button>
      )}

      <div className="mt-6 space-y-6">
        {[...weeks.entries()].map(([week, steps]) => (
          <section key={week} aria-label={weekLabel(week, thisWeek)}>
            <h3 className={cn("mb-2 text-[12px] font-semibold uppercase tracking-[0.12em]", week === thisWeek ? style.text : "text-ink-3")}>{weekLabel(week, thisWeek)}</h3>
            <ul className="space-y-1">
              {steps.map((s) => {
                const missed = !s.done && s.date < derived.today;
                return (
                  <li key={s.id} className={cn("flex items-start gap-3 rounded-xl px-2 py-2", s.date === derived.today && "bg-sunken")}>
                    <span className="pt-0.5">
                      <StepCheck goalId={goal.id} stepId={s.id} done={s.done} label={s.title} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={cn("block text-[15px]", s.done ? "text-ink-3 line-through" : "font-medium")}>{s.title}</span>
                      <span className="block text-[13.5px] text-ink-3">
                        {relativeDay(s.date, derived.today)}
                        {missed ? " · missed" : s.detail ? ` · ${s.detail}` : ""}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Drawer>
  );
}
