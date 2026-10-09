"use client";

import { AlertTriangle, Flag } from "lucide-react";
import type { CalendarItem } from "@/types";
import { cn } from "@/lib/cn";
import { addDays, formatTime, parseDate, toMinutes, toTimeStr, WEEKDAYS_SHORT } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { buildCalendarItems, detectTimeConflicts } from "@/services/calendar";
import { Button } from "@/components/ui/Button";

const START_HOUR = 7;
const END_HOUR = 22;
const HOUR_PX = 52;

const TONE: Record<string, string> = {
  class: "bg-accent-soft text-accent-strong border-accent-line",
  exam: "bg-critical-soft text-critical border-critical/30",
  meeting: "bg-teal-soft text-teal border-teal/30",
  appointment: "bg-teal-soft text-teal border-teal/30",
  study: "bg-surface text-accent-strong border-accent border-dashed",
  personal: "bg-sunken text-ink-2 border-line-strong",
  social: "bg-rose-soft text-rose border-rose/25",
  travel: "bg-sunken text-ink border-line-strong",
};

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

export function WeekView({ weekStart, onPickDay }: { weekStart: string; onPickDay: (d: string) => void }) {
  const { derived } = useOrbit();
  const { open } = useUI();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const items = buildCalendarItems(derived.calendarSource, weekStart, days[6]);
  const conflicts = detectTimeConflicts(items).filter((c) => derived.timeConflicts.some((t) => t.id === c.id));
  const conflictIds = new Set(conflicts.flatMap((c) => c.itemIds));
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const nowMinutes = toMinutes(toTimeStr(derived.now));

  return (
    <div>
      {conflicts.map((c) => (
        <div key={c.id} className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-attention-line bg-attention-soft px-4 py-3">
          <AlertTriangle size={18} className="shrink-0 text-attention" aria-hidden />
          <p className="flex-1 text-[15px] text-ink">
            <span className="font-semibold">{c.items?.[0].title}</span> and <span className="font-semibold">{c.items?.[1].title.toLowerCase()}</span> overlap by {c.overlapMinutes} minutes.
          </p>
          <Button size="sm" variant="primary" onClick={() => open({ type: "conflict", id: c.id })}>
            Review options
          </Button>
        </div>
      ))}

      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
        <div className="min-w-[760px]">
          {/* Day headers + deadlines */}
          <div className="sticky top-0 z-20 grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line bg-surface">
            <div />
            {days.map((d) => {
              const isToday = d === derived.today;
              const deadlines = items.filter((i) => i.date === d && i.kind === "deadline");
              return (
                <div key={d} className="border-l border-line px-1.5 pb-2 pt-2">
                  <button type="button" onClick={() => onPickDay(d)} className="flex w-full items-baseline gap-1.5 rounded-lg px-1 text-left hover:bg-sunken">
                    <span className="text-[13px] font-medium text-ink-3">{WEEKDAYS_SHORT[parseDate(d).getDay()]}</span>
                    <span className={cn("text-[17px] font-semibold", isToday ? "text-accent" : "text-ink")}>{parseDate(d).getDate()}</span>
                  </button>
                  <ul className="mt-1 space-y-0.5">
                    {deadlines.map((i) => (
                      <li key={i.id}>
                        <button
                          type="button"
                          onClick={() => open({ type: "loop", id: i.refId })}
                          className={cn(
                            "flex w-full items-center gap-1 truncate rounded-md bg-attention-soft px-1.5 py-0.5 text-left text-[12px] font-medium text-attention",
                            i.title.endsWith("— done") && "bg-sunken text-ink-3 line-through",
                            i.pendingChange && "ring-1 ring-attention",
                          )}
                          title={i.title}
                        >
                          <Flag size={11} className="shrink-0" aria-hidden />
                          <span className="truncate">{i.title.replace(/ due$/, "").replace(/ — done$/, "")}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))] pt-3">
            <div>
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className="relative">
                  <span className="absolute -top-2 right-2 text-[12px] text-ink-3">{formatTime(`${String(h).padStart(2, "0")}:00`)}</span>
                </div>
              ))}
            </div>
            {days.map((d) => {
              const timed = items.filter((i) => i.date === d && i.kind !== "deadline" && i.startTime && i.endTime);
              const isToday = d === derived.today;
              return (
                <div key={d} className={cn("relative border-l border-line", isToday && "bg-accent-soft/25")} style={{ height: hours.length * HOUR_PX }}>
                  {hours.map((h) => (
                    <div key={h} className="border-t border-line/70" style={{ height: HOUR_PX }} aria-hidden />
                  ))}
                  {isToday && nowMinutes > START_HOUR * 60 && nowMinutes < END_HOUR * 60 && (
                    <div className="absolute inset-x-0 z-10 h-0.5 bg-accent" style={{ top: ((nowMinutes - START_HOUR * 60) / 60) * HOUR_PX }} aria-hidden>
                      <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-accent" />
                    </div>
                  )}
                  {layout(timed).map(({ item, lane, lanes }) => {
                    const top = ((toMinutes(item.startTime!) - START_HOUR * 60) / 60) * HOUR_PX;
                    const height = Math.max(((toMinutes(item.endTime!) - toMinutes(item.startTime!)) / 60) * HOUR_PX - 2, 22);
                    const conflict = conflictIds.has(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => open({ type: "event", id: item.id })}
                        className={cn(
                          "absolute overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[12px] leading-tight shadow-card transition-shadow hover:z-10 hover:shadow-raised",
                          TONE[item.category] ?? TONE.personal,
                          conflict && "ring-2 ring-attention",
                          item.pendingChange && "opacity-70",
                        )}
                        style={{ top, height, left: `calc(${(lane / lanes) * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}
                        aria-label={`${item.title}, ${formatTime(item.startTime)} to ${formatTime(item.endTime)}${conflict ? ", overlaps another event" : ""}`}
                      >
                        <span className="block truncate font-semibold">{item.title}</span>
                        {height > 34 && <span className="block truncate opacity-80">{formatTime(item.startTime)}{item.location ? ` · ${item.location}` : ""}</span>}
                        {item.pendingChange && height > 48 && <span className="block truncate font-medium">May have moved</span>}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
