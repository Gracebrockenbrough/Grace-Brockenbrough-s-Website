"use client";

import { CalendarCheck } from "lucide-react";
import { formatDuration, formatTime } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { buildCalendarItems, findGaps, suggestFreeTime } from "@/services/calendar";
import { Timeline } from "@/components/today/Timeline";
import { FreeTimeCard } from "@/components/today/FreeTimeCard";
import { EmptyState } from "@/components/ui/Card";
import { OpenLoopCard } from "@/components/loops/OpenLoopCard";

/** Planning view: timeline, free time, what's due, and suggested blocks. */
export function DayView({ date }: { date: string }) {
  const { state, derived } = useOrbit();
  const items = buildCalendarItems(derived.calendarSource, date, date);
  const isPast = date < derived.today;
  const suggestions = isPast
    ? []
    : suggestFreeTime({
        date,
        items,
        loops: derived.openLoops,
        exams: state.exams,
        events: state.events,
        courses: state.courses,
        today: derived.today,
        now: derived.now,
        minMinutes: 30,
        max: 2,
      }).filter((s) => !state.dismissed.includes(s.id) && !(date === derived.today && state.dismissed.includes(`free:${date}`)));
  const dueToday = derived.openLoops.filter((l) => l.deadline?.startsWith(date));
  const free = findGaps(items, date, { dayStart: "08:00", dayEnd: "22:00", minMinutes: 30 }).reduce((n, g) => n + g.minutes, 0);
  const timed = items.filter((i) => i.startTime && i.kind !== "deadline");

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section aria-label="Timeline">
        <p className="mb-4 text-[15px] text-ink-2">
          {timed.length} {timed.length === 1 ? "event" : "events"} · {formatDuration(free)} open between 8 AM and 10 PM
        </p>
        {items.length ? (
          <Timeline items={items} date={date} />
        ) : (
          <EmptyState icon={<CalendarCheck size={28} />} title="Nothing scheduled." body="This day is wide open. A good day to get ahead." />
        )}
      </section>
      <div className="space-y-8">
        {suggestions.length > 0 && (
          <section aria-labelledby="day-suggestions">
            <h2 id="day-suggestions" className="mb-3 text-[19px] font-semibold">Suggested plans</h2>
            <div className="space-y-3">
              {suggestions.map((s) => (
                <FreeTimeCard key={s.id} suggestion={s} compact />
              ))}
            </div>
          </section>
        )}
        <section aria-labelledby="day-due">
          <h2 id="day-due" className="mb-3 text-[19px] font-semibold">Due this day</h2>
          {dueToday.length ? (
            <ul className="space-y-2.5">
              {dueToday.map((l) => (
                <OpenLoopCard key={l.id} loop={l} />
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-line-strong px-4 py-5 text-[15px] text-ink-2">Nothing due. {timed[0] ? `First up: ${timed[0].title} at ${formatTime(timed[0].startTime)}.` : ""}</p>
          )}
        </section>
      </div>
    </div>
  );
}
