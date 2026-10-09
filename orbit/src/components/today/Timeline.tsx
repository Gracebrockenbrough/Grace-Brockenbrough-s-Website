"use client";

import { BookOpen, Coffee, Flag, GraduationCap, NotebookPen, PartyPopper, Plane, Stethoscope, Users } from "lucide-react";
import type { CalendarItem, EventCategory } from "@/types";
import { cn } from "@/lib/cn";
import { formatClock, formatDuration, formatTime, toMinutes, toTimeStr } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { findGaps } from "@/services/calendar";

export const CATEGORY_META: Record<EventCategory, { label: string; icon: typeof BookOpen; tone: string }> = {
  class: { label: "Class", icon: BookOpen, tone: "text-accent bg-accent-soft" },
  exam: { label: "Exam", icon: GraduationCap, tone: "text-critical bg-critical-soft" },
  meeting: { label: "Meeting", icon: Users, tone: "text-teal bg-teal-soft" },
  appointment: { label: "Appointment", icon: Stethoscope, tone: "text-teal bg-teal-soft" },
  study: { label: "Study", icon: NotebookPen, tone: "text-accent bg-accent-soft" },
  personal: { label: "Personal", icon: Coffee, tone: "text-ink-2 bg-sunken" },
  social: { label: "Social", icon: PartyPopper, tone: "text-rose bg-rose-soft" },
  travel: { label: "Travel", icon: Plane, tone: "text-ink-2 bg-sunken" },
  deadline: { label: "Deadline", icon: Flag, tone: "text-attention bg-attention-soft" },
};

type Row =
  | { kind: "item"; time: string; item: CalendarItem }
  | { kind: "free"; time: string; end: string; minutes: number }
  | { kind: "now"; time: string };

/** A calm vertical timeline of the day, including open time. */
export function Timeline({ items, date, showNow = true }: { items: CalendarItem[]; date: string; showNow?: boolean }) {
  const { derived, state } = useOrbit();
  const { open } = useUI();
  const isToday = date === derived.today;
  const nowTime = toTimeStr(derived.now);

  const rows: Row[] = [];
  const timed = items.filter((i) => i.startTime && !(i.kind === "deadline" && i.startTime === "23:59"));
  for (const item of timed) rows.push({ kind: "item", time: item.startTime!, item });
  for (const g of findGaps(items, date, { dayStart: timed[0]?.startTime ?? "08:00", dayEnd: "21:00", minMinutes: 45 })) {
    rows.push({ kind: "free", time: g.start, end: g.end, minutes: g.minutes });
  }
  if (isToday && showNow) rows.push({ kind: "now", time: nowTime });
  rows.sort((a, b) => toMinutes(a.time) - toMinutes(b.time) || (a.kind === "now" ? -1 : b.kind === "now" ? 1 : 0));
  const lateDeadlines = items.filter((i) => i.kind === "deadline" && i.startTime === "23:59");

  return (
    <ol className="relative">
      {rows.map((row, idx) => {
        if (row.kind === "now") {
          return (
            <li key="now" className="relative flex items-center gap-3 py-1" aria-label={`Now, ${formatTime(row.time)}`}>
              <span className="w-[74px] shrink-0 text-right text-[13px] font-semibold text-accent">Now</span>
              <span className="relative z-10 h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-accent-soft" aria-hidden />
              <span className="h-px flex-1 bg-accent/40" aria-hidden />
            </li>
          );
        }
        const past = isToday && toMinutes(row.kind === "free" ? row.end : (row.item.endTime ?? row.item.startTime!)) <= toMinutes(nowTime);
        if (row.kind === "free") {
          return (
            <li key={`free-${row.time}`} className={cn("flex items-start gap-3 py-1.5", past && "opacity-50")}>
              <span className="w-[74px] shrink-0 pt-1.5 text-right text-[13.5px] tabular-nums text-ink-3">{formatClock(row.time)}</span>
              <span className="relative mt-2.5 flex w-2.5 justify-center" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full border-2 border-dashed border-line-strong bg-canvas" />
              </span>
              <span className="flex-1 rounded-xl border border-dashed border-line-strong px-3 py-2 text-[14.5px] text-ink-3">
                Open · {formatDuration(row.minutes)}
              </span>
            </li>
          );
        }
        const { item } = row;
        const meta = CATEGORY_META[item.category];
        const Icon = meta.icon;
        const course = state.courses.find((c) => c.id === item.courseId);
        return (
          <li key={item.id + idx} className={cn("flex items-start gap-3 py-1.5", past && "opacity-55")}>
            <span className="w-[74px] shrink-0 pt-2 text-right text-[13.5px] tabular-nums text-ink-2">{formatClock(item.startTime!)}</span>
            <span className="relative mt-3 flex w-2.5 justify-center" aria-hidden>
              <span className={cn("h-2.5 w-2.5 rounded-full", item.kind === "deadline" ? "bg-attention" : item.kind === "exam" ? "bg-critical" : "bg-ink/70")} />
            </span>
            <button
              type="button"
              onClick={() => open(item.kind === "deadline" ? { type: "loop", id: item.refId } : { type: "event", id: item.id })}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-surface hover:shadow-card"
            >
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.tone)} aria-hidden>
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15.5px] font-medium text-ink">
                  {item.kind === "class" && course ? `${course.name}` : item.title}
                </span>
                <span className="block truncate text-[13.5px] text-ink-3">
                  {item.kind === "deadline"
                    ? `Deadline${course ? ` · ${course.code}` : ""}`
                    : [meta.label === "Class" && course ? course.code : meta.label, item.endTime ? `until ${formatTime(item.endTime)}` : undefined, item.location].filter(Boolean).join(" · ")}
                </span>
              </span>
              {item.pendingChange && <span className="rounded-full bg-attention-soft px-2 py-0.5 text-[12px] font-medium text-attention">May change</span>}
            </button>
          </li>
        );
      })}
      {lateDeadlines.map((item) => (
        <li key={item.id} className="flex items-start gap-3 py-1.5">
          <span className="w-[74px] shrink-0 pt-2 text-right text-[13.5px] text-ink-2">Tonight</span>
          <span className="relative mt-3 flex w-2.5 justify-center" aria-hidden>
            <span className="h-2.5 w-2.5 rounded-full bg-attention" />
          </span>
          <button
            type="button"
            onClick={() => open({ type: "loop", id: item.refId })}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-surface hover:shadow-card"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-attention-soft text-attention" aria-hidden>
              <Flag size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15.5px] font-medium text-ink">{item.title}</span>
              <span className="block text-[13.5px] text-ink-3">Deadline · 11:59 PM</span>
            </span>
          </button>
        </li>
      ))}
      <span className="absolute bottom-3 left-[90px] top-3 w-px bg-line" aria-hidden />
    </ol>
  );
}
