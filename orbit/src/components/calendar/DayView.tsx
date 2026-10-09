"use client";

import { formatDuration, toMinutes } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { buildCalendarItems, findGaps, suggestFreeTime } from "@/services/calendar";
import { TimeGrid } from "./TimeGrid";

/** Planning view: a real time grid. Open time is empty space; ORBIT only marks it when it has an idea. */
export function DayView({ date }: { date: string }) {
  const { state, derived } = useOrbit();
  const items = buildCalendarItems(derived.calendarSource, date, date);
  const suggestions =
    date < derived.today || (date === derived.today && state.dismissed.includes(`free:${date}`))
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
          minMinutes: 60,
          max: 2,
        }).filter((s) => !state.dismissed.includes(s.id));
  const timed = items.filter((i) => i.startTime && i.endTime && i.kind !== "deadline");
  const free = findGaps(items, date, { dayStart: "08:00", dayEnd: "22:00", minMinutes: 30 }).reduce((n, g) => n + g.minutes, 0);
  const first = Math.min(8, ...timed.map((i) => Math.floor(toMinutes(i.startTime!) / 60)));
  const last = Math.max(21, ...timed.map((i) => Math.ceil(toMinutes(i.endTime!) / 60)));

  return (
    <div>
      <p className="mb-3 text-[15px] text-ink-2">
        {timed.length ? `${timed.length} ${timed.length === 1 ? "event" : "events"} · ${formatDuration(free)} open` : "Nothing scheduled. A good day to get ahead."}
      </p>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <TimeGrid days={[date]} items={items} suggestions={suggestions} startHour={first} endHour={last} hourPx={56} />
      </div>
    </div>
  );
}
