"use client";

import { Flag } from "lucide-react";
import type { CalendarItem, FreeTimeSuggestion } from "@/types";
import { cn } from "@/lib/cn";
import { formatDuration, formatTime, formatTimeRange, parseDate, toMinutes, toTimeStr, WEEKDAYS_SHORT } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { usePlanBlock } from "@/store/useActions";
import { EVENT_META } from "./eventStyle";

/** Assign side-by-side lanes to overlapping events. */
function layout(items: CalendarItem[]) {
  const sorted = [...items].sort((a, b) => toMinutes(a.startTime!) - toMinutes(b.startTime!));
  const placed: { item: CalendarItem; lane: number; lanes: number }[] = [];
  let cluster: typeof placed = [];
  let clusterEnd = -1;
  const flush = () => {
    const lanes = Math.max(1, ...cluster.map((c) => c.lane + 1));
    cluster.forEach((c) => (c.lanes = lanes));
    placed.push(...cluster);
    cluster = [];
  };
  for (const item of sorted) {
    const s = toMinutes(item.startTime!);
    if (s >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((c) => toMinutes(c.item.endTime!) > s).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ item, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, toMinutes(item.endTime!));
  }
  if (cluster.length) flush();
  return placed;
}

interface TimeGridProps {
  days: string[];
  items: CalendarItem[];
  startHour?: number;
  endHour?: number;
  hourPx?: number;
  /** Day headers with dates (Week view). */
  showDayHeaders?: boolean;
  /** Free-time suggestions to show as subtle open areas. */
  suggestions?: FreeTimeSuggestion[];
  conflictIds?: Set<string>;
  onPickDay?: (d: string) => void;
  compact?: boolean;
}

/**
 * A true time grid: blocks are placed by start time and sized by duration, so
 * the shape of the day is visible at a glance. Empty space is open time.
 * Deadlines don't take time, so they sit as small markers above the grid.
 */
export function TimeGrid({
  days,
  items,
  startHour = 7,
  endHour = 22,
  hourPx = 52,
  showDayHeaders = false,
  suggestions = [],
  conflictIds = new Set(),
  onPickDay,
  compact = false,
}: TimeGridProps) {
  const { derived, state } = useOrbit();
  const { open } = useUI();
  const plan = usePlanBlock();
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const nowMin = toMinutes(toTimeStr(derived.now));
  const top = (t: string) => ((toMinutes(t) - startHour * 60) / 60) * hourPx;
  const deadlinesFor = (d: string) => items.filter((i) => i.date === d && i.kind === "deadline");
  const anyDeadlines = days.some((d) => deadlinesFor(d).length > 0);
  const cols = days.length;
  const gutter = 56;

  return (
    <div className={cn(cols > 1 && "min-w-[760px]")}>
      {(showDayHeaders || anyDeadlines) && (
        <div className="grid border-b border-line" style={{ gridTemplateColumns: `${gutter}px repeat(${cols}, minmax(0, 1fr))` }}>
          <div />
          {days.map((d) => {
            const isToday = d === derived.today;
            const deadlines = deadlinesFor(d);
            return (
              <div key={d} className={cn("px-1.5 pb-2", cols > 1 && "border-l border-line", showDayHeaders ? "pt-2" : "pt-0")}>
                {showDayHeaders && (
                  <button type="button" onClick={() => onPickDay?.(d)} className="mb-1 flex w-full items-baseline gap-1.5 rounded-lg px-1 text-left hover:bg-sunken">
                    <span className="text-[13px] font-medium text-ink-3">{WEEKDAYS_SHORT[parseDate(d).getDay()]}</span>
                    <span className={cn("text-[17px] font-semibold", isToday ? "text-accent" : "text-ink")}>{parseDate(d).getDate()}</span>
                  </button>
                )}
                <ul className={cn("flex gap-1", cols > 1 ? "flex-col" : "flex-wrap")}>
                  {deadlines.map((i) => {
                    const done = i.title.endsWith("— done");
                    return (
                      <li key={i.id} className="min-w-0">
                        <button
                          type="button"
                          onClick={() => open({ type: "loop", id: i.refId })}
                          title={`${i.title.replace(/ due$/, "")}${i.startTime && i.startTime !== "23:59" ? ` · due ${formatTime(i.startTime)}` : " · due by midnight"}`}
                          className={cn(
                            "flex w-full min-w-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-left text-[12.5px] font-medium",
                            done ? "bg-sunken text-ink-3 line-through" : EVENT_META.deadline.chip,
                            i.pendingChange && "ring-1 ring-due",
                          )}
                        >
                          <Flag size={11} className="shrink-0" aria-hidden />
                          <span className="truncate">{i.title.replace(/ due$/, "").replace(/ — done$/, "")}</span>
                          {cols === 1 && i.startTime && i.startTime !== "23:59" && <span className="shrink-0 opacity-75">· {formatTime(i.startTime)}</span>}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative grid pt-3" style={{ gridTemplateColumns: `${gutter}px repeat(${cols}, minmax(0, 1fr))` }}>
        <div>
          {hours.map((h) => (
            <div key={h} style={{ height: hourPx }} className="relative">
              <span className="absolute -top-2 right-2 whitespace-nowrap text-[12px] tabular-nums text-ink-3">{formatTime(`${String(h).padStart(2, "0")}:00`)}</span>
            </div>
          ))}
        </div>
        {days.map((d) => {
          const timed = items.filter((i) => i.date === d && i.kind !== "deadline" && i.startTime && i.endTime);
          const isToday = d === derived.today;
          const daySuggestions = suggestions.filter((s) => s.date === d);
          return (
            <div key={d} className={cn("relative", cols > 1 && "border-l border-line")} style={{ height: hours.length * hourPx }}>
              {hours.map((h) => (
                <div key={h} className="border-t border-line/70" style={{ height: hourPx }} aria-hidden />
              ))}

              {daySuggestions.map((s) => {
                const y = top(s.start);
                const h = ((toMinutes(s.end) - toMinutes(s.start)) / 60) * hourPx;
                return (
                  <div
                    key={s.id}
                    className="absolute inset-x-1 z-[1] flex flex-col justify-center gap-1 overflow-hidden rounded-lg border border-dashed border-accent-line bg-accent-soft/50 px-2.5"
                    style={{ top: y + 2, height: h - 4 }}
                  >
                    <p className="truncate text-[12.5px] font-semibold text-accent-strong">{formatDuration(s.minutes)} open</p>
                    {h > 44 && (
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="min-w-0 truncate text-[12.5px] text-ink-2">Good time for {s.planTitle.replace(/^Study for /, "studying ")}</p>
                        <button
                          type="button"
                          onClick={() => plan({ title: s.planTitle, date: s.date, start: s.start, end: s.planEnd, courseId: s.courseId, loopId: s.loopId })}
                          className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-[12px] font-semibold text-white hover:bg-accent-strong"
                        >
                          Plan
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}

              {isToday && nowMin > startHour * 60 && nowMin < endHour * 60 && (
                <div className="absolute inset-x-0 z-20 h-0.5 bg-critical/80" style={{ top: top(toTimeStr(derived.now)) }} aria-label={`Now, ${formatTime(toTimeStr(derived.now))}`}>
                  <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-critical" />
                </div>
              )}

              {layout(timed).map(({ item, lane, lanes }) => {
                const y = top(item.startTime!);
                const height = Math.max(((toMinutes(item.endTime!) - toMinutes(item.startTime!)) / 60) * hourPx - 3, 20);
                const meta = EVENT_META[item.category];
                const conflict = conflictIds.has(item.id);
                const past = isToday && toMinutes(item.endTime!) <= nowMin;
                const roomy = height > 38;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => open({ type: "event", id: item.id })}
                    title={`${item.title} · ${formatTimeRange(item.startTime, item.endTime)}`}
                    className={cn(
                      "absolute z-10 overflow-hidden rounded-md border-l-[3px] px-2 text-left leading-tight shadow-card transition-shadow hover:z-30 hover:shadow-raised",
                      roomy ? "py-1" : "py-0.5",
                      meta.block,
                      conflict && "ring-2 ring-critical/70",
                      item.pendingChange && "opacity-70",
                      past && "opacity-55",
                    )}
                    style={{ top: y + 1, height, left: `calc(${(lane / lanes) * 100}% + 3px)`, width: `calc(${100 / lanes}% - 6px)` }}
                    aria-label={`${item.title}, ${formatTimeRange(item.startTime, item.endTime)}${conflict ? ", overlaps another event" : ""}`}
                  >
                    <span className={cn("block font-semibold", compact ? "text-[12.5px]" : "text-[13px]", roomy && height > 56 ? "line-clamp-2" : "truncate")}>
                      {item.kind === "class" && cols === 1 ? (state.courses.find((c) => c.id === item.courseId)?.name ?? item.title) : item.title}
                      {!roomy && <span className="ml-1 font-normal opacity-75">{formatTime(item.startTime)}</span>}
                    </span>
                    {roomy && (
                      <span className="block truncate text-[12px] opacity-80">
                        {formatTimeRange(item.startTime, item.endTime)}
                        {!compact && cols === 1 && item.location ? ` · ${item.location}` : ""}
                      </span>
                    )}
                    {item.pendingChange && height > 50 && <span className="block truncate text-[12px] font-semibold">May have moved</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
