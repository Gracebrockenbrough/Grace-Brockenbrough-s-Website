"use client";

import { addDays, formatDuration, formatShortDate, formatTimeRange, relativeDateTime, relativeDay } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { usePlanBlock } from "@/store/useActions";
import { Drawer } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { buildCalendarItems } from "@/services/calendar";
import { callSlots, findSlotsFor, nextStepFor } from "@/services/helpers";
import { findLoop } from "./lookup";

/** "Find time" and "Help me schedule": ORBIT finds the windows; you pick one. */
export function FindTimeDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { state, derived } = useOrbit();
  const plan = usePlanBlock();
  const loop = findLoop(id, state, derived);
  if (!loop) return null;

  const step = nextStepFor(loop);
  const scheduling = step?.kind === "schedule";
  const items = buildCalendarItems(derived.calendarSource, derived.today, addDays(derived.today, 8));
  const slots = scheduling ? callSlots(items, derived.now, derived.today) : findSlotsFor(loop, items, derived.now, derived.today);
  const blockTitle = scheduling ? `Call to ${loop.title.charAt(0).toLowerCase()}${loop.title.slice(1)}` : loop.title;

  return (
    <Drawer title={scheduling ? "Good times to call" : `Find time for ${loop.title}`} onClose={onClose}>
      <p className="text-[15.5px] text-ink-2">
        {scheduling
          ? "Short openings while offices are open. ORBIT won't book anything for you."
          : `About ${formatDuration(Math.min(Math.max(loop.effortMinutes ?? 60, 30), 120))}${loop.deadline ? `, before it's due ${relativeDateTime(loop.deadline, derived.today).toLowerCase()}` : ""}.`}
      </p>
      {slots.length ? (
        <ul className="mt-4 divide-y divide-line">
          {slots.map((s) => (
            <li key={s.date + s.start} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-medium">{relativeDay(s.date, derived.today)}</p>
                <p className="text-[14.5px] text-ink-3">
                  {formatShortDate(s.date)} · {formatTimeRange(s.start, s.end)}
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  plan({ title: blockTitle, date: s.date, start: s.start, end: s.end, courseId: loop.courseId, loopId: loop.id });
                  onClose();
                }}
              >
                Add
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-[15px] text-ink-2">No open window fits before the deadline. The Day view may help you make room.</p>
      )}
    </Drawer>
  );
}
