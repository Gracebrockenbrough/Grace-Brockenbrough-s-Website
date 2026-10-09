"use client";

import { AlertTriangle } from "lucide-react";
import { addDays } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { buildCalendarItems, detectTimeConflicts } from "@/services/calendar";
import { Button } from "@/components/ui/Button";
import { TimeGrid } from "./TimeGrid";

export function WeekView({ weekStart, onPickDay }: { weekStart: string; onPickDay: (d: string) => void }) {
  const { derived } = useOrbit();
  const { open } = useUI();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const items = buildCalendarItems(derived.calendarSource, weekStart, days[6]);
  const conflicts = detectTimeConflicts(items).filter((c) => derived.timeConflicts.some((t) => t.id === c.id));
  const conflictIds = new Set(conflicts.flatMap((c) => c.itemIds));

  return (
    <div>
      {conflicts.map((c) => (
        <div key={c.id} className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl border border-critical/20 bg-critical-soft px-4 py-2.5">
          <AlertTriangle size={17} className="shrink-0 text-critical" aria-hidden />
          <p className="flex-1 text-[15px] text-ink">
            <span className="font-semibold">Conflict</span> · {c.items?.[0].title.replace(/ session$/, "")} overlaps {c.items?.[1].title.replace(/ appointment$/, "").toLowerCase()}
          </p>
          <Button size="sm" variant="primary" onClick={() => open({ type: "conflict", id: c.id })}>
            Fix
          </Button>
        </div>
      ))}
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-card">
        <TimeGrid days={days} items={items} showDayHeaders conflictIds={conflictIds} onPickDay={onPickDay} hourPx={50} />
      </div>
    </div>
  );
}
