"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import type { CalendarItem, DemoTime } from "@/types";
import { cn } from "@/lib/cn";
import { formatLongDate, formatTime, toMinutes, toTimeStr } from "@/lib/time";

import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { TaskRow } from "@/components/loops/TaskRow";
import { Noticed } from "@/components/today/Noticed";
import { TimeGrid } from "@/components/calendar/TimeGrid";
import { EVENT_META } from "@/components/calendar/eventStyle";
import { StepCheck } from "@/components/goals/GoalCard";
import { Moons } from "@/components/goals/StudyMoons";
import { AREA_STYLE } from "@/lib/areas";
import { addDays, relativeDay } from "@/lib/time";

/** Goal steps for today (or tomorrow) and the closest exam's study moons. */
function Progress() {
  const { derived, dispatch } = useOrbit();
  const { open, notify } = useUI();
  const { today } = derived;
  const steps = derived.goals
    .map(({ goal, progress }) => {
      const step = progress.today ?? goal.steps.find((s) => s.date === addDays(today, 1) && !s.done) ?? progress.next;
      return step ? { goal, step } : undefined;
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
    .slice(0, 2);
  const study = derived.study[0];
  if (!steps.length && !study) return null;
  return (
    <ul className="space-y-2">
      {study && (
        <li className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={study.studiedToday}
            aria-label={study.studiedToday ? "Studied today" : `I studied for ${study.exam.title} today`}
            onClick={() => {
              dispatch({ type: "TOGGLE_STUDY_DAY", examId: study.exam.id, date: today });
              notify(study.studiedToday ? "Removed today's session." : "Logged. Another moon filled in.", { undoable: true });
            }}
            className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2", study.studiedToday ? "border-success bg-success text-navy" : "border-line-strong hover:border-success")}
          >
            {study.studiedToday && <CheckCircle2 size={14} aria-hidden />}
          </button>
          <Link href="/orbit/school" className="min-w-0 flex-1">
            <span className="block truncate text-[15.5px] font-medium">Study for {study.exam.title.replace(/^([A-Z]+ \d+).*/, "$1")}</span>
            <span className="block text-[13.5px] text-ink-3">
              Studied {Math.min(study.studied.length, study.target)}/{study.target} days · exam {relativeDay(study.exam.date!, today).toLowerCase()}
            </span>
          </Link>
          <span className="hidden sm:block"><Moons filled={Math.min(study.studied.length, study.target)} total={study.target} size={16} /></span>
        </li>
      )}
      {steps.map(({ goal, step }) => (
        <li key={step.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
          <StepCheck goalId={goal.id} stepId={step.id} done={step.done} label={step.title} />
          <button type="button" onClick={() => open({ type: "goal", id: goal.id })} className="min-w-0 flex-1 text-left">
            <span className="block truncate text-[15.5px] font-medium">{step.title}</span>
            <span className="flex items-center gap-1.5 text-[13.5px] text-ink-3">
              <span className={cn("h-2 w-2 rounded-full", AREA_STYLE[goal.area].dot)} aria-hidden />
              <span className="truncate">{relativeDay(step.date, today)} · {goal.title}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Same structure all day; the words and emphasis shift with the time. */
const CONTEXT: Record<DemoTime, { matters: string; headline: (n: number) => string; empty: string }> = {
  morning: { matters: "What matters", headline: (n) => (n ? `${n} ${n === 1 ? "thing matters" : "things matter"} today` : "Nothing urgent today"), empty: "Nothing urgent today." },
  midday: { matters: "Still to do", headline: (n) => (n ? `${n} ${n === 1 ? "thing" : "things"} left today` : "You're on track"), empty: "You're on track." },
  evening: { matters: "Unfinished", headline: (n) => (n ? `${n} ${n === 1 ? "thing is" : "things are"} still open` : "You're done for today"), empty: "You're done for today." },
};

function Section({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const id = title.toLowerCase().replace(/\W+/g, "-");
  return (
    <section aria-labelledby={id} className={className}>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 id={id} className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-3">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const SeeAll = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="inline-flex min-h-9 items-center gap-1 rounded-lg px-1 text-[14.5px] font-medium text-ink-2 hover:text-ink">
    {children} <ArrowRight size={15} aria-hidden />
  </Link>
);

/** Mobile schedule: the next few blocks, not the whole grid. */
function UpNext({ items, now, label }: { items: CalendarItem[]; now: Date; label: string }) {
  const { open } = useUI();
  const nowMin = toMinutes(toTimeStr(now));
  const upcoming = items.filter((i) => i.kind !== "deadline" && i.startTime && i.endTime && toMinutes(i.endTime) > nowMin).slice(0, 2);
  if (!upcoming.length) return <p className="px-2 text-[15px] text-ink-2">Nothing else {label === "Tomorrow" ? "tomorrow" : "today"}.</p>;
  return (
    <ul className="space-y-1">
      {upcoming.map((i, idx) => {
        const meta = EVENT_META[i.category];
        const live = toMinutes(i.startTime!) <= nowMin;
        return (
          <li key={i.id}>
            <button type="button" onClick={() => open({ type: "event", id: i.id })} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface">
              <span className="w-[68px] shrink-0 text-[14px] tabular-nums text-ink-2">{live ? "Now" : formatTime(i.startTime)}</span>
              <span className={cn("h-9 w-1 shrink-0 rounded-full", meta.dot)} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={cn("block truncate text-[15.5px] text-ink", idx === 0 && "font-semibold")}>{i.title}</span>
                {i.location && <span className="block truncate text-[13.5px] text-ink-3">{i.location}</span>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function TodayPage() {
  const { state, derived } = useOrbit();
  const { open } = useUI();
  const { priorities, noticed, todayItems, tomorrowItems, today, now, learned } = derived;
  const ctx = CONTEXT[state.demoTime];
  const evening = state.demoTime === "evening";
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const matters = priorities.slice(0, 3);
  const scheduleItems = evening ? tomorrowItems : todayItems;
  const scheduleLabel = evening ? "Tomorrow" : "Today";
  const timed = scheduleItems.filter((i) => i.startTime && i.endTime && i.kind !== "deadline");
  const startHour = Math.min(8, ...timed.map((i) => Math.floor(toMinutes(i.startTime!) / 60)));
  const endHour = Math.max(20, ...timed.map((i) => Math.ceil(toMinutes(i.endTime!) / 60)));

  const whatMatters = (
    <Section title={ctx.matters} action={<SeeAll href="/loops">See all tasks</SeeAll>}>
      {matters.length ? (
        <ul className="rounded-3xl border border-line bg-surface/70 p-2">
          {matters.map((l) => (
            <TaskRow key={l.id} loop={l} area="matters" />
          ))}
        </ul>
      ) : (
        <p className="flex items-center gap-2 px-1 py-2 text-[15.5px] text-ink-2">
          <CheckCircle2 size={18} className="text-success" aria-hidden /> {ctx.empty}
        </p>
      )}
    </Section>
  );

  const noticedSection = (limit: number) => (
    <Section title="ORBIT noticed">
      <div className="-mx-2">
        <Noticed items={noticed} limit={limit} />
      </div>
    </Section>
  );

  const progressSection = (
    <Section title="Goals & studying" action={<SeeAll href="/orbit">Orbit</SeeAll>}>
      <Progress />
    </Section>
  );
  return (
    <div className="space-y-10">
      <header>
        <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">{formatLongDate(today)}</p>
        <h1 className="mt-1 text-[34px] leading-tight md:text-[42px]">
          {greeting}, {state.user.name}
        </h1>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-4 text-[17px] text-ink-2">
          {ctx.headline(matters.length)}
          {state.demoTime === "morning" && (
            <button type="button" onClick={() => open({ type: "brief" })} className="text-[14.5px] text-accent underline-offset-4 hover:underline">
              Morning brief
            </button>
          )}
        </p>
      </header>

      {/* Desktop: two things on the left, the shape of the day on the right. Nothing else. */}
      <div className="hidden gap-14 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-10">
          {learned.noticedFirst ? noticedSection(2) : whatMatters}
          {learned.noticedFirst ? whatMatters : noticedSection(2)}
          {progressSection}
        </div>
        <Section title={scheduleLabel} action={<SeeAll href={`/calendar?view=day&date=${scheduleItems[0]?.date ?? today}`}>Open day</SeeAll>}>
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <TimeGrid
              days={[scheduleItems[0]?.date ?? today]}
              items={scheduleItems.filter((i) => i.kind !== "deadline")}
              suggestions={evening ? [] : derived.freeTime}
              startHour={startHour}
              endHour={endHour}
              hourPx={36}
              compact
            />
          </div>
        </Section>
      </div>

      {/* Mobile: three rows, the next few blocks, one noticed item. */}
      <div className="space-y-9 md:hidden">
        {whatMatters}
        {learned.noticedFirst && noticedSection(1)}
        <Section title={evening ? "Tomorrow" : "Up next"} action={<SeeAll href={`/calendar?view=day&date=${scheduleItems[0]?.date ?? today}`}>Day</SeeAll>}>
          <div className="-mx-2">
            <UpNext items={scheduleItems} now={evening ? new Date(0) : now} label={scheduleLabel} />
          </div>
        </Section>
        {!learned.noticedFirst && noticedSection(1)}
        {progressSection}
      </div>
    </div>
  );
}
