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
        <h2 id={id} className="text-[19px] font-semibold tracking-tight">{title}</h2>
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
  const upcoming = items.filter((i) => i.kind !== "deadline" && i.startTime && i.endTime && toMinutes(i.endTime) > nowMin).slice(0, 3);
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
        <ul className="-mx-2">
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

  return (
    <div className="space-y-10">
      <header>
        <p className="text-[15px] font-medium text-ink-3">{formatLongDate(today)}</p>
        <h1 className="mt-0.5 text-[30px] font-semibold leading-tight tracking-tight md:text-[34px]">
          {greeting}, {state.user.name}
        </h1>
        <p className="mt-1 text-[17px] text-ink-2">{ctx.headline(matters.length)}</p>
      </header>

      {/* Desktop: two things on the left, the shape of the day on the right. Nothing else. */}
      <div className="hidden gap-14 md:grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="space-y-10">
          {learned.noticedFirst ? noticedSection(2) : whatMatters}
          {learned.noticedFirst ? whatMatters : noticedSection(2)}
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
      </div>
    </div>
  );
}
