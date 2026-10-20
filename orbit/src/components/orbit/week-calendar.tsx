"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addDays, formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import type { DateOnly } from "@/lib/domain/types";
import { eventsOn, weekOf, type CalendarEvent } from "@/lib/intelligence/calendar";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { retailerOf } from "@/lib/store/selectors";
import type { OrbitData } from "@/lib/store/state";
import { IconButton } from "../ui/button";
import { cn } from "../ui/cn";
import { IndicatorBadge, dotTone, toneFor } from "./indicator";
import { daysBetween } from "@/lib/domain/dates";

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" });
const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const LONG = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
const utc = (d: DateOnly) => new Date(`${d}T12:00:00Z`);

/**
 * Interactive week calendar. Select a day to see what happens on it; every event
 * opens its record. Weeks can be paged, and "Today" jumps back.
 */
export function WeekCalendar({ events, today, data }: { events: CalendarEvent[]; today: DateOnly; data: OrbitData }) {
  const [selected, setSelected] = useSessionState<DateOnly>("calendar-day", today);
  const week = weekOf(selected);
  const dayEvents = eventsOn(events, selected);
  const isToday = selected === today;
  const nextDate = events.find((e) => e.date > selected && e.deadline)?.date ?? null;

  return (
    <section aria-labelledby="cal-title">
      <div className="mb-2 flex items-center gap-1">
        <h2 id="cal-title" className="flex-1 text-[17px] font-semibold">
          Upcoming dates <span className="font-normal text-muted">· {MONTH.format(utc(week[0]))}</span>
        </h2>
        {!isToday && (
          <button type="button" onClick={() => setSelected(today)} className="min-h-11 rounded-full px-3 text-[14px] font-semibold text-navy hover:bg-ivory-deep">
            Today
          </button>
        )}
        <IconButton label="Previous week" onClick={() => setSelected(addDays(selected, -7))}>
          <ChevronLeft aria-hidden className="size-5" />
        </IconButton>
        <IconButton label="Next week" onClick={() => setSelected(addDays(selected, 7))} className="-mr-2">
          <ChevronRight aria-hidden className="size-5" />
        </IconButton>
      </div>

      <div role="group" aria-label="Choose a day" className="grid grid-cols-7 gap-1">
        {week.map((d) => {
          const evs = eventsOn(events, d);
          const sel = d === selected;
          const deadlines = evs.filter((e) => e.deadline);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={sel}
              aria-label={`${LONG.format(utc(d))}${d === today ? ", today" : ""}: ${evs.length ? `${evs.length} ${evs.length === 1 ? "event" : "events"}` : "nothing scheduled"}`}
              onClick={() => setSelected(d)}
              className={cn(
                "flex min-h-[68px] flex-col items-center justify-start rounded-2xl pb-1.5 pt-2 transition-colors",
                sel ? "bg-navy text-white" : "hover:bg-card",
                d === today && !sel && "ring-1 ring-inset ring-navy/30",
              )}
            >
              <span className={cn("text-[12px] font-semibold", sel ? "text-white/70" : "text-muted")}>{WEEKDAY.format(utc(d))}</span>
              <span className="tabular text-[17px] font-semibold leading-tight">{Number(d.slice(8))}</span>
              <span className="mt-1.5 flex h-2 items-center gap-0.5">
                {(deadlines.length ? deadlines : evs).slice(0, 3).map((e) => (
                  <span key={e.id} className={cn("size-1.5 rounded-full", sel ? "bg-white" : dotTone[toneFor(e.indicator, daysBetween(today, e.date))])} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-3" aria-live="polite">
        <p className="mb-2 text-[14px] font-semibold text-muted">{isToday ? `Today, ${formatDate(selected, today)}` : LONG.format(utc(selected))}</p>
        {dayEvents.length === 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-dashed border-line px-4 py-2">
            <p className="py-1 text-[15px] text-muted">Nothing on this day.</p>
            {nextDate && (
              <button type="button" onClick={() => setSelected(nextDate)} className="min-h-11 rounded-full px-3 text-[14px] font-semibold text-navy hover:bg-ivory-deep">
                Next: {formatDate(nextDate, today)} →
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {dayEvents.map((e) => (
              <li key={e.id}>
                <Link href={e.href} className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-card px-3 py-2 hover:bg-ivory-deep">
                  <IndicatorBadge indicator={e.indicator} tone={toneFor(e.indicator, daysBetween(today, e.date))} className="size-9 rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-muted">
                      {retailerOf(data, e.retailerId).name} · {e.label}
                      {e.certainty === "estimated" ? " (estimated)" : e.certainty === "confirmed" && e.deadline ? " (confirmed)" : ""}
                    </span>
                    <span className="block truncate text-[15px] font-semibold">{e.title}</span>
                  </span>
                  {e.amount != null && <span className="tabular text-[15px] font-semibold">{money(e.amount)}</span>}
                  <ChevronRight aria-hidden className="size-4 text-muted/60" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
