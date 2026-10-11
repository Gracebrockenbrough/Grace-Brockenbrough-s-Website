"use client";

import { useState } from "react";
import { addDays, formatDuration, formatTime, formatTimeRange, parseDate, WEEKDAYS_SHORT } from "@/lib/time";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { usePlanBlock } from "@/store/useActions";
import { buildCalendarItems, detectTimeConflicts } from "@/services/calendar";
import { EVENT_META } from "./eventStyle";

/**
 * The week as a phone-sized plan: a strip of days, then each day as a short
 * list. Conflicts are marked inline. Orbit points out at most one open window
 * (today's best one) instead of filling every gap with suggestions.
 */
export function WeekView({ weekStart, onPickDay }: { weekStart: string; onPickDay: (d: string) => void }) {
  const { derived, state } = useOrbit();
  const { open } = useUI();
  const plan = usePlanBlock();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const items = buildCalendarItems(derived.calendarSource, weekStart, days[6]);
  const conflicts = detectTimeConflicts(items).filter((c) => derived.timeConflicts.some((t) => t.id === c.id));
  const conflictIds = new Set(conflicts.flatMap((c) => c.itemIds));
  const free = state.profile.involvement !== "quiet" ? derived.freeTime.find((f) => f.minutes >= 60) : undefined;

  const [showPast, setShowPast] = useState(false);
  const jump = (d: string) => {
    if (d < derived.today) setShowPast(true);
    window.setTimeout(() => document.getElementById(`week-${d}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  return (
    <div className="space-y-5">
      <ol className="grid grid-cols-7 gap-1 rounded-2xl bg-surface p-1.5 shadow-card" aria-label="Days this week">
        {days.map((d) => {
          const dayItems = items.filter((i) => i.date === d && i.kind !== "class");
          const isToday = d === derived.today;
          return (
            <li key={d}>
              <button
                type="button"
                onClick={() => jump(d)}
                aria-label={`${WEEKDAYS_SHORT[parseDate(d).getDay()]} ${parseDate(d).getDate()}, ${dayItems.length} items`}
                className={cn("flex w-full flex-col items-center rounded-xl py-2", isToday ? "bg-primary text-on-primary" : "text-ink hover:bg-sunken")}
              >
                <span className={cn("text-[11.5px]", isToday ? "opacity-80" : "text-ink-3")}>{WEEKDAYS_SHORT[parseDate(d).getDay()].slice(0, 3)}</span>
                <span className="text-[16px] font-semibold tabular-nums">{parseDate(d).getDate()}</span>
                <span className="mt-1 flex h-1.5 gap-0.5" aria-hidden>
                  {dayItems.slice(0, 3).map((i) => (
                    <span key={i.id} className={cn("h-1.5 w-1.5 rounded-full", EVENT_META[i.category].dot)} />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {days.some((d) => d < derived.today) && days.includes(derived.today) && (
        <button type="button" onClick={() => setShowPast((v) => !v)} className="px-1 text-[14px] font-medium text-accent">
          {showPast ? "Hide earlier days" : "Show earlier this week"}
        </button>
      )}

      {days.filter((d) => showPast || !days.includes(derived.today) || d >= derived.today).map((d) => {
        const dayItems = items
          .filter((i) => i.date === d)
          .sort((a, b) => (a.startTime ?? "00:00").localeCompare(b.startTime ?? "00:00"));
        const isToday = d === derived.today;
        const past = d < derived.today;
        return (
          <section key={d} id={`week-${d}`} aria-label={d} className={cn("scroll-mt-20", past && "opacity-60")}>
            <button type="button" onClick={() => onPickDay(d)} className="mb-1.5 flex items-baseline gap-2 px-1">
              <span className={cn("text-[15px] font-semibold", isToday ? "text-accent" : "text-ink-2")}>{isToday ? "Today" : WEEKDAYS_SHORT[parseDate(d).getDay()]}</span>
              <span className="text-[14px] text-ink-3">{parseDate(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
            </button>
            {dayItems.length === 0 && !(isToday && free) ? (
              <p className="rounded-2xl px-4 py-2 text-[14.5px] text-ink-3">Nothing scheduled</p>
            ) : (
              <ul className="rounded-2xl bg-surface py-1 shadow-card">
                {dayItems.map((i) => {
                  const conflict = conflictIds.has(i.id);
                  const deadline = i.kind === "deadline";
                  return (
                    <li key={i.id}>
                      <button type="button" onClick={() => open(deadline ? { type: "loop", id: i.refId } : { type: "event", id: i.id })} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
                        <span className="w-[64px] shrink-0 whitespace-nowrap text-right text-[13px] tabular-nums text-ink-3">{deadline ? "Due" : formatTime(i.startTime)}</span>
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", EVENT_META[i.category].dot)} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-[15px]", i.kind === "exam" && "font-semibold")}>{i.title}</span>
                          {conflict && <span className="block text-[13px] font-medium text-critical">Overlaps another event</span>}
                          {i.pendingChange && <span className="block text-[13px] font-medium text-attention">This may have moved</span>}
                        </span>
                        {conflict && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              const c = conflicts.find((x) => x.itemIds.includes(i.id));
                              if (c) open({ type: "conflict", id: c.id });
                            }}
                            className="shrink-0 rounded-full bg-primary px-3 py-1 text-[13px] font-medium text-on-primary"
                          >
                            Fix
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
                {isToday && free && (
                  <li className="mx-2 my-1 flex items-center gap-3 rounded-xl border border-dashed border-line-strong px-2 py-2">
                    <span className="w-[64px] shrink-0 whitespace-nowrap text-right text-[13px] tabular-nums text-ink-3">{formatTime(free.start)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] text-ink">
                        {formatTimeRange(free.start, free.end)} open · {formatDuration(free.minutes)}
                      </span>
                      <span className="block truncate text-[13px] text-ink-3">Good time for {free.planTitle.replace(/^Work on /, "")}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => plan({ title: free.planTitle, date: free.date, start: free.start, end: free.planEnd, loopId: free.loopId, courseId: free.courseId })}
                      className="min-h-8 shrink-0 rounded-full bg-sunken px-3 text-[13px] font-medium hover:bg-line"
                    >
                      Plan
                    </button>
                  </li>
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
