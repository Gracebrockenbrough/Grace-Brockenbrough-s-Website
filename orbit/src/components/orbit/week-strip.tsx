import { addDays, daysBetween } from "@/lib/domain/dates";
import type { DateOnly } from "@/lib/domain/types";
import { kindMeta, type Priority } from "@/lib/intelligence/priorities";
import { cn } from "../ui/cn";

const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" });

/** The next seven days at a glance. Overdue items sit on today. */
export function WeekStrip({ items, today }: { items: Priority[]; today: DateOnly }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const onDay = (d: DateOnly, i: number) => items.filter((p) => p.dueDate && (i === 0 ? daysBetween(p.dueDate, d) >= 0 : p.dueDate === d));
  const summary = days
    .map((d, i) => ({ d, n: onDay(d, i).length }))
    .filter((x) => x.n)
    .map((x) => `${x.n} due ${x.d === today ? "today or overdue" : x.d}`)
    .join(", ");

  return (
    <div>
      <p className="sr-only">{summary || "Nothing due in the next 7 days."}</p>
      <ol aria-hidden className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const due = onDay(d, i);
          const isToday = i === 0;
          const urgent = due.some((p) => (p.daysLeft ?? 99) <= 3);
          return (
            <li key={d} className={cn("flex flex-col items-center rounded-2xl py-2", isToday ? "bg-navy text-white" : due.length ? "bg-card" : "")}>
              <span className={cn("text-[12px] font-semibold", isToday ? "text-white/70" : "text-muted")}>{isToday ? "Today" : WEEKDAY.format(new Date(`${d}T12:00:00Z`))}</span>
              <span className="tabular text-[17px] font-semibold leading-tight">{Number(d.slice(8))}</span>
              <span className="mt-1 flex h-6 items-center justify-center text-[15px] leading-none">
                {due.length === 0 ? (
                  <span className={cn("size-1.5 rounded-full", isToday ? "bg-white/30" : "bg-line")} />
                ) : (
                  <span className="flex -space-x-1">
                    {due.slice(0, 2).map((p) => (
                      <span key={p.key}>{kindMeta[p.kind].emoji}</span>
                    ))}
                  </span>
                )}
              </span>
              {due.length > 2 ? (
                <span className={cn("text-[11px] font-semibold", isToday ? "text-white/80" : "text-muted")}>+{due.length - 2}</span>
              ) : (
                <span className={cn("mt-0.5 size-1 rounded-full", urgent && !isToday ? "bg-terracotta" : "bg-transparent")} />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
