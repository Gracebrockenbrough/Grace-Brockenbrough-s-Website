"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { AgendaRow, EV_DOT, utc } from "@/components/orbit/timeline";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { addDays } from "@/lib/domain/dates";
import type { DateOnly } from "@/lib/domain/types";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { calendarEvents, eventsOn, weekOf } from "@/lib/intelligence/calendar";
import { eventTone, eventToneLabel, type EventTone } from "@/lib/intelligence/today";
import { useOrbit } from "@/lib/store/store";

const MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const LONG = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

/** Month view of every dated event. Shares the selected day with Today's week strip. */
export default function CalendarPage() {
  const o = useOrbit();
  const [selected, setSelected] = useSessionState<DateOnly>("calendar-day", o?.today ?? "2026-01-01");
  if (!o) return <Shell loading />;
  const { data, today } = o;
  const events = calendarEvents(data, today);
  const first = `${selected.slice(0, 7)}-01`;
  const start = weekOf(first)[0];
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const month = selected.slice(0, 7);
  const shiftMonth = (n: number) => {
    const d = new Date(`${first}T12:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + n);
    setSelected(d.toISOString().slice(0, 10));
  };
  const dayEvents = eventsOn(events, selected);

  return (
    <Shell>
      <BackBar fallback="/" title="Calendar" />
      <div className="flex items-center gap-1 pt-2">
        <h1 className="font-display flex-1 text-[30px] leading-none">{MONTH.format(utc(first))}</h1>
        {selected !== today && (
          <button type="button" onClick={() => setSelected(today)} className="min-h-11 rounded-full px-3 text-[14px] font-semibold hover:bg-ivory-deep">
            Today
          </button>
        )}
        <IconButton label="Previous month" onClick={() => shiftMonth(-1)}>
          <ChevronLeft aria-hidden className="size-5" />
        </IconButton>
        <IconButton label="Next month" onClick={() => shiftMonth(1)} className="-mr-2">
          <ChevronRight aria-hidden className="size-5" />
        </IconButton>
      </div>

      <div className="mt-4 rounded-[22px] bg-card p-2 shadow-[var(--shadow-card)]">
        <div className="grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-muted" aria-hidden>
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <span key={d} className="py-1.5">
              {d}
            </span>
          ))}
        </div>
        <div role="group" aria-label="Choose a day" className="grid grid-cols-7 gap-0.5">
          {days.map((d) => {
            const evs = eventsOn(events, d);
            const tones = [...new Set(evs.map((e) => eventTone(e.kind)))];
            const sel = d === selected;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={sel}
                aria-label={`${LONG.format(utc(d))}${d === today ? ", today" : ""}: ${evs.length ? evs.map((e) => e.label).join(", ") : "nothing scheduled"}`}
                onClick={() => setSelected(d)}
                className={cn(
                  "flex min-h-[48px] flex-col items-center justify-center rounded-[12px] text-[15px] font-semibold",
                  d.slice(0, 7) !== month && "text-muted/50",
                  sel ? "bg-navy text-white" : "hover:bg-ivory-deep",
                  d === today && !sel && "ring-2 ring-inset ring-navy",
                )}
              >
                <span className="tabular">{Number(d.slice(8))}</span>
                <span className="flex h-1.5 gap-[2px]">
                  {tones.slice(0, 3).map((t) => (
                    <span key={t} className={cn("size-[5px] rounded-full", EV_DOT[t])} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 px-1 text-[12px] text-muted" aria-hidden>
        {(Object.keys(EV_DOT) as EventTone[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <span className={cn("size-2 rounded-full", EV_DOT[t])} />
            {eventToneLabel[t]}
          </span>
        ))}
      </div>

      <section aria-live="polite" className="mt-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">{selected === today ? "Today" : LONG.format(utc(selected))}</h2>
        {dayEvents.length ? (
          <ul className="divide-y divide-line">
            {dayEvents.map((e) => (
              <AgendaRow key={e.id} e={e} data={data} today={today} showDate={false} />
            ))}
          </ul>
        ) : (
          <p className="py-3 text-[15px] text-muted">Nothing on this day.</p>
        )}
      </section>
    </Shell>
  );
}
