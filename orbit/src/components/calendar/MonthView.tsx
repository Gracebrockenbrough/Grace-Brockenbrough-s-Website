"use client";

import type { CalendarItem } from "@/types";
import { cn } from "@/lib/cn";
import { addDays, diffDays, parseDate, startOfMonth, startOfWeek, WEEKDAYS_SHORT, formatMonthDay } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { buildCalendarItems } from "@/services/calendar";

const isMajor = (i: CalendarItem) => (i.major || i.kind === "exam" || i.category === "travel") && !i.title.endsWith("— done");

/** Orientation only: exams, big deadlines, travel, major events. */
export function MonthView({ date, onPickDay }: { date: string; onPickDay: (d: string) => void }) {
  const { derived } = useOrbit();
  const { open } = useUI();
  const first = startOfMonth(date);
  const gridStart = startOfWeek(first);
  const month = parseDate(first).getMonth();
  const weeks = 6;
  const gridEnd = addDays(gridStart, weeks * 7 - 1);
  const items = buildCalendarItems(derived.calendarSource, gridStart, gridEnd).filter(isMajor);
  // Multi-day events appear on each day they span.
  const onDay = (d: string) => items.filter((i) => i.date === d || (i.endDate && i.date <= d && i.endDate >= d));

  const monthItems = items.filter((i) => parseDate(i.date).getMonth() === month);

  return (
    <div>
      <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="grid grid-cols-7 border-b border-line bg-canvas">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[13px] font-medium text-ink-3">
              {WEEKDAYS_SHORT[d]}
            </div>
          ))}
        </div>
        {Array.from({ length: weeks }, (_, w) => {
          const weekStart = addDays(gridStart, w * 7);
          const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
          const load = days.reduce((n, d) => n + onDay(d).filter((i) => i.kind === "exam" || i.kind === "deadline").length, 0);
          const intense = load >= 3;
          return (
            <div key={w} className={cn("relative grid grid-cols-7 border-b border-line last:border-b-0", intense && "bg-attention-soft/40")}>
              {intense && (
                <span className="pointer-events-none absolute right-2 top-1.5 z-10 hidden rounded-full bg-attention-soft px-2 py-0.5 text-[12px] font-semibold text-attention md:inline">
                  Heavy week
                </span>
              )}
              {days.map((d) => {
                const inMonth = parseDate(d).getMonth() === month;
                const dayItems = onDay(d);
                const isToday = d === derived.today;
                return (
                  <div key={d} className={cn("min-h-[64px] border-r border-line p-1 last:border-r-0 md:min-h-[112px] md:p-1.5", !inMonth && "bg-canvas/60")}>
                    <button
                      type="button"
                      onClick={() => onPickDay(d)}
                      aria-label={`Open ${d}${dayItems.length ? `, ${dayItems.length} important items` : ""}`}
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-[13.5px] font-medium",
                        isToday ? "bg-accent text-white" : inMonth ? "text-ink hover:bg-sunken" : "text-ink-3 hover:bg-sunken",
                      )}
                    >
                      {parseDate(d).getDate()}
                    </button>
                    {/* Mobile: dots. Desktop: short labels. */}
                    <div className="mt-1 flex gap-1 md:hidden" aria-hidden>
                      {dayItems.slice(0, 3).map((i) => (
                        <span key={i.id} className={cn("h-1.5 w-1.5 rounded-full", i.kind === "exam" ? "bg-critical" : i.kind === "deadline" ? "bg-attention" : "bg-accent")} />
                      ))}
                    </div>
                    <ul className="mt-1 hidden space-y-1 md:block">
                      {dayItems.slice(0, 2).map((i) => (
                        <li key={i.id}>
                          <button
                            type="button"
                            onClick={() => open(i.kind === "deadline" ? { type: "loop", id: i.refId } : { type: "event", id: i.id })}
                            className={cn(
                              "block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[12.5px] font-medium",
                              i.kind === "exam" ? "bg-critical-soft text-critical" : i.kind === "deadline" ? "bg-attention-soft text-attention" : "bg-accent-soft text-accent-strong",
                              i.pendingChange && "ring-1 ring-dashed ring-attention",
                            )}
                          >
                            {i.title.replace(/ due$/, "")}
                          </button>
                        </li>
                      ))}
                      {dayItems.length > 2 && (
                        <li>
                          <button type="button" onClick={() => onPickDay(d)} className="px-1.5 text-[12.5px] text-ink-3 hover:text-ink">
                            +{dayItems.length - 2} more
                          </button>
                        </li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-[13.5px] text-ink-2">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-critical" aria-hidden />Exams</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-attention" aria-hidden />Big deadlines</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-accent" aria-hidden />Events & travel</span>
      </div>

      {/* Mobile list, since month cells are too small for labels */}
      <ul className="mt-5 divide-y divide-line rounded-2xl border border-line bg-surface md:hidden">
        {monthItems.filter((i) => diffDays(i.date, derived.today) >= 0).map((i) => (
          <li key={i.id}>
            <button
              type="button"
              onClick={() => open(i.kind === "deadline" ? { type: "loop", id: i.refId } : { type: "event", id: i.id })}
              className="flex w-full items-baseline justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="truncate text-[15px]">{i.title.replace(/ due$/, "")}</span>
              <span className="shrink-0 text-[13.5px] text-ink-3">{formatMonthDay(i.date)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
