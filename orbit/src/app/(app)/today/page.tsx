"use client";

import Link from "next/link";
import { CheckCircle2, ChevronRight } from "lucide-react";
import type { CalendarItem, DemoTime } from "@/types";
import { cn } from "@/lib/cn";
import { formatDuration, formatTime, formatTimeRange, toMinutes, toTimeStr } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { usePlanBlock } from "@/store/useActions";
import { TaskRow } from "@/components/loops/TaskRow";
import { Noticed } from "@/components/today/Noticed";
import { EVENT_META } from "@/components/calendar/eventStyle";
import { StepCheck } from "@/components/goals/GoalCard";
import { areaStyle } from "@/lib/areas";

/** Same structure all day; the words shift with the time. */
const CONTEXT: Record<DemoTime, { headline: (n: number) => string; empty: string }> = {
  morning: { headline: (n) => (n ? `${n} ${n === 1 ? "thing matters" : "things matter"} today` : "Nothing urgent today"), empty: "Nothing urgent today." },
  midday: { headline: (n) => (n ? `${n} ${n === 1 ? "thing" : "things"} left today` : "You're on track"), empty: "You're on track." },
  evening: { headline: (n) => (n ? `${n} ${n === 1 ? "thing is" : "things are"} still open` : "You're done for today"), empty: "You're done for today." },
};

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  const id = `today-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id}>
      <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
        <h2 id={id} className="text-[15px] font-semibold text-ink-2">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** The rest of the day as a short timeline, with at most one meaningful open window. */
function DayLine({ items, label }: { items: CalendarItem[]; label: "Today" | "Tomorrow" }) {
  const { derived, state } = useOrbit();
  const { open } = useUI();
  const plan = usePlanBlock();
  const nowMin = label === "Today" ? toMinutes(toTimeStr(derived.now)) : 0;
  const upcoming = items.filter((i) => i.kind !== "deadline" && i.startTime && i.endTime && toMinutes(i.endTime) > nowMin);
  const showFree = label === "Today" && state.profile.involvement !== "quiet";
  const free = showFree ? derived.freeTime.find((f) => f.minutes >= 60) : undefined;

  type Row = { kind: "event"; item: CalendarItem; start: string } | { kind: "free"; start: string };
  const rows: Row[] = [...upcoming.map((item) => ({ kind: "event" as const, item, start: item.startTime! })), ...(free ? [{ kind: "free" as const, start: free.start }] : [])].sort((a, b) =>
    a.start.localeCompare(b.start),
  );

  if (!rows.length) return <p className="rounded-2xl bg-surface px-4 py-4 text-[15px] text-ink-2 shadow-card">Nothing else on the calendar {label === "Today" ? "today" : "tomorrow"}.</p>;

  return (
    <ol className="rounded-2xl bg-surface py-1.5 shadow-card">
      {rows.map((r) => {
        if (r.kind === "free" && free) {
          return (
            <li key="free" className="mx-2 my-1 flex items-center gap-3 rounded-xl border border-dashed border-line-strong px-2 py-2.5">
              <span className="w-[54px] shrink-0 text-right text-[13.5px] tabular-nums text-ink-3">{formatTime(free.start)}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-ink">{formatDuration(free.minutes)} open</span>
                <span className="block truncate text-[13.5px] text-ink-3">Good time for {free.planTitle.replace(/^Work on /, "")}</span>
              </span>
              <button
                type="button"
                onClick={() => plan({ title: free.planTitle, date: free.date, start: free.start, end: free.planEnd, loopId: free.loopId, courseId: free.courseId })}
                className="min-h-8 shrink-0 rounded-full bg-sunken px-3 text-[13.5px] font-medium hover:bg-line"
              >
                Plan
              </button>
            </li>
          );
        }
        if (r.kind !== "event") return null;
        const i = r.item;
        const live = label === "Today" && toMinutes(i.startTime!) <= nowMin;
        return (
          <li key={i.id}>
            <button type="button" onClick={() => open({ type: "event", id: i.id })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
              <span className={cn("w-[54px] shrink-0 text-right text-[13.5px] tabular-nums", live ? "font-semibold text-accent" : "text-ink-3")}>{live ? "Now" : formatTime(i.startTime)}</span>
              <span className={cn("h-2 w-2 shrink-0 rounded-full", EVENT_META[i.category].dot)} aria-hidden />
              <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{i.title}</span>
              {i.pendingChange && <span className="shrink-0 text-[12.5px] font-medium text-attention">May change</span>}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Today answers three questions in a few seconds: what matters, what the day
 * looks like, and whether anything changed. Everything else is one level deeper.
 */
export default function TodayPage() {
  const { state, derived } = useOrbit();
  const { open } = useUI();
  const { priorities, noticed, todayItems, tomorrowItems, now, today, freeTime } = derived;
  const ctx = CONTEXT[state.demoTime];
  const evening = state.demoTime === "evening";
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const involvement = state.profile.involvement;

  const matters = priorities.slice(0, 3);
  // "Best window" turns a deadline into a plan.
  const bestWindow = (id: string) => {
    const f = freeTime.find((x) => x.loopId === id);
    return f ? `Best window ${formatTimeRange(f.start, f.planEnd)}` : undefined;
  };

  // Quiet: only changes and conflicts. Helpful/Proactive: the top two of everything.
  const noticedItems = involvement === "quiet" ? noticed.filter((n) => n.kind === "change" || n.kind === "conflict") : noticed;
  const goalToday = derived.goals.map(({ goal, progress }) => ({ goal, step: progress.today })).find((g) => g.step && !g.step.done);

  return (
    <div className="space-y-8">
      <header className="px-1 pt-2">
        <h1 className="text-[34px] leading-tight">
          {greeting}, {state.user.name}
        </h1>
        <p className="mt-1 text-[16.5px] text-ink-2">
          {ctx.headline(matters.length)}
          {state.demoTime === "morning" && (
            <>
              {" · "}
              <button type="button" onClick={() => open({ type: "brief" })} className="text-accent underline-offset-4 hover:underline">
                Brief
              </button>
            </>
          )}
        </p>
      </header>

      <Section title="What matters">
        {matters.length ? (
          <ul className="divide-y divide-line rounded-2xl bg-surface shadow-card">
            {matters.map((l, i) => (
              <TaskRow key={l.id} loop={l} area="matters" hint={i === 0 && !evening ? bestWindow(l.id) : undefined} />
            ))}
            {goalToday?.step && (
              <li className="flex items-center gap-3 px-3 py-3">
                <StepCheck goalId={goalToday.goal.id} stepId={goalToday.step.id} done={false} label={goalToday.step.title} />
                <button type="button" onClick={() => open({ type: "goal", id: goalToday.goal.id })} className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-[16px] font-medium">{goalToday.step.title}</span>
                  <span className="flex items-center gap-1.5 text-[14px] text-ink-3">
                    <span className={cn("h-2 w-2 rounded-full", areaStyle(goalToday.goal.area).dot)} aria-hidden />
                    {goalToday.goal.title}
                  </span>
                </button>
              </li>
            )}
          </ul>
        ) : (
          <p className="flex items-center gap-2 rounded-2xl bg-surface px-4 py-4 text-[15.5px] text-ink-2 shadow-card">
            <CheckCircle2 size={18} className="text-success" aria-hidden /> {ctx.empty}
          </p>
        )}
      </Section>

      <Section
        title={evening ? "Tomorrow" : "Your day"}
        action={
          <Link href={`/calendar?view=day&date=${evening ? tomorrowItems[0]?.date ?? today : today}`} className="text-[14px] font-medium text-accent">
            Full day
          </Link>
        }
      >
        <DayLine items={evening ? tomorrowItems : todayItems} label={evening ? "Tomorrow" : "Today"} />
      </Section>

      <Section title="Orbit noticed">
        <Noticed items={noticedItems} limit={involvement === "quiet" ? 1 : 2} />
      </Section>

      <Link href="/loops" className="flex items-center justify-between rounded-2xl px-1 py-2 text-[15px] text-ink-2 hover:text-ink">
        <span>
          Open loops <span className="text-ink-3">· {derived.openLoops.length}</span>
        </span>
        <ChevronRight size={18} className="text-ink-3" aria-hidden />
      </Link>
    </div>
  );
}
