"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOrbit } from "@/store/OrbitProvider";
import { addDays, addMonths, formatLongDate, formatMonthDay, MONTHS, parseDate, startOfWeek } from "@/lib/time";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Button } from "@/components/ui/Button";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";
import { LearningPrompt } from "@/components/ui/LearningPrompt";

type View = "month" | "week" | "day";

function CalendarInner() {
  const { derived, dispatch } = useOrbit();
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  // No view in the link? Use the one ORBIT learned this person prefers.
  const view = (["month", "week", "day"].includes(params.get("view") ?? "") ? params.get("view") : derived.learned.calendarView) as View;
  const prompt = derived.learned.prompts.find((p) => p.surface === "calendar");

  // Every visit is a quiet signal about which view this person actually uses.
  useEffect(() => {
    dispatch({ type: "SIGNAL", signal: { itemType: "calendar", action: "view", context: { view } } });
  }, [view, dispatch]);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("date") ?? "") ? params.get("date")! : derived.today;

  const go = (v: View, d: string) => router.replace(`${pathname}?view=${v}&date=${d}`, { scroll: false });
  const step = (dir: 1 | -1) => go(view, view === "month" ? addMonths(date, dir) : addDays(date, view === "week" ? 7 * dir : dir));

  const weekStart = startOfWeek(date);
  const title =
    view === "month"
      ? `${MONTHS[parseDate(date).getMonth()]} ${parseDate(date).getFullYear()}`
      : view === "week"
        ? `${formatMonthDay(weekStart)} – ${formatMonthDay(addDays(weekStart, 6))}`
        : formatLongDate(date);

  return (
    <div>
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">Calendar</h1>
          <div className="mt-2 flex items-center gap-1">
            <button type="button" onClick={() => step(-1)} aria-label={`Previous ${view}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 hover:bg-sunken">
              <ChevronLeft size={20} />
            </button>
            <button type="button" onClick={() => step(1)} aria-label={`Next ${view}`} className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-2 hover:bg-sunken">
              <ChevronRight size={20} />
            </button>
            <p className="ml-1 text-[17px] font-medium text-ink" aria-live="polite">{title}</p>
            <Button size="sm" variant="ghost" className="ml-2" onClick={() => go(view, derived.today)}>
              Today
            </Button>
          </div>
        </div>
        <SegmentedControl<View>
          label="Calendar view"
          value={view}
          onChange={(v) => go(v, date)}
          options={[
            { value: "month", label: "Month" },
            { value: "week", label: "Week" },
            { value: "day", label: "Day" },
          ]}
        />
      </header>

      {prompt && (
        <div className="mb-5">
          <LearningPrompt prompt={prompt} onAccept={() => go(prompt.value as View, date)} />
        </div>
      )}

      <div key={view} className="animate-fade-in">
        {view === "month" && <MonthView date={date} onPickDay={(d) => go("day", d)} />}
        {view === "week" && <WeekView weekStart={weekStart} onPickDay={(d) => go("day", d)} />}
        {view === "day" && <DayView date={date} />}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Suspense>
      <CalendarInner />
    </Suspense>
  );
}
