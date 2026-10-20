"use client";

import { BackBar, Shell } from "@/components/layout/shell";
import { WeekCalendar } from "@/components/orbit/week-calendar";
import { calendarEvents } from "@/lib/intelligence/calendar";
import { useOrbit } from "@/lib/store/store";

export default function CalendarPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  return (
    <Shell>
      <BackBar fallback="/returns/" title="Calendar" />
      <p className="pb-4 pt-1 text-[16px] text-muted">Return deadlines, drop-offs, deliveries and refunds by day.</p>
      <WeekCalendar events={calendarEvents(o.data, o.today)} today={o.today} data={o.data} />
    </Shell>
  );
}
