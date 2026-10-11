"use client";

import type { Category } from "@/types";
import { cn } from "@/lib/cn";
import { areaStyle } from "@/lib/areas";
import { datePart, formatDuration, formatTime, formatTimeRange, timePart } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Modal } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { EVENT_META } from "@/components/calendar/eventStyle";

interface BriefRow {
  id: string;
  when: string;
  area: Category;
  title: string;
  detail: string;
  onOpen: () => void;
}

/** Glanceable in five seconds: three things, the shape of the day, one useful fact. */
export function MorningBrief({ onClose }: { onClose: () => void }) {
  const { state, derived, dispatch } = useOrbit();
  const { open } = useUI();
  const { priorities, changes, todayItems, freeTime, today } = derived;

  const start = () => {
    dispatch({ type: "SET_BRIEF_SEEN", seen: true });
    onClose();
  };

  const loopRow = (l: (typeof priorities)[number]): BriefRow => {
    const time = l.deadline && datePart(l.deadline) === today ? timePart(l.deadline) : undefined;
    const window = freeTime.find((f) => f.loopId === l.id);
    const closes = /form|application/i.test(l.title);
    return {
      id: l.id,
      when: time && time !== "23:59" ? formatTime(time) : time ? "Tonight" : l.requiresResponse ? "Reply" : "Soon",
      area: l.category,
      title: l.title,
      detail: window ? `Best window: ${formatTimeRange(window.start, window.planEnd)}` : time === "23:59" ? (closes ? "Closes tonight." : "Due tonight.") : l.waitingOn ? `Waiting on ${l.waitingOn}` : l.why ?? "",
      onOpen: () => open({ type: "loop", id: l.id }),
    };
  };

  const change = changes[0];
  const changeRow: BriefRow | undefined = change && {
    id: change.id,
    when: "Changed",
    area: "school",
    title: change.title.replace(/ Midterm$/, " exam") + " moved",
    detail: change.impact?.replace(/^That removes (\d+) study days?\..*/, "You lost $1 study days.") ?? "Review the new date.",
    onOpen: () => open({ type: "change", id: change.id }),
  };
  const dueToday = priorities.filter((p) => p.deadline && datePart(p.deadline) === today);
  const others = priorities.filter((p) => !dueToday.includes(p));
  const rows = [...(dueToday[0] ? [loopRow(dueToday[0])] : []), ...(changeRow ? [changeRow] : []), ...dueToday.slice(1).map(loopRow), ...others.map(loopRow)].slice(0, 3);

  const timed = todayItems.filter((i) => i.startTime && i.kind !== "deadline");
  const free = freeTime[0];
  const insight = free ? `You have ${formatDuration(free.minutes)} free ${toMinutesHour(free.start) >= 12 ? "this afternoon" : "this morning"}.` : undefined;

  return (
    <Modal title={`Good morning, ${state.user.name}`} hideTitle onClose={start} footer={<Button variant="primary" size="lg" className="w-full" onClick={start} data-autofocus>Start my day</Button>}>
      <p className="font-display text-[30px] leading-tight">Good morning, {state.user.name}</p>
      <p className="mt-1 text-[16px] text-ink-2">
        {priorities.length} {priorities.length === 1 ? "thing matters" : "things matter"} today
      </p>

      <ul className="mt-5 space-y-1">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={r.onOpen} className="flex w-full items-start gap-3 rounded-xl py-2 text-left">
              <span className={cn("w-[62px] shrink-0 pt-0.5 text-[13.5px] font-medium", r.when === "Changed" ? "text-attention" : "text-ink-3")}>{r.when}</span>
              <span className={cn("mt-[9px] h-2 w-2 shrink-0 rounded-full", areaStyle(r.area).dot)} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[16px] font-semibold leading-snug">{r.title}</span>
                {r.detail && <span className="block text-[14px] text-ink-2">{r.detail}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {timed.length > 0 && (
        <>
          <p className="mb-1.5 mt-5 text-[14px] font-semibold text-ink-2">Your day</p>
          <ol className="space-y-0.5">
            {timed.map((i) => (
              <li key={i.id} className="flex items-center gap-3 text-[14.5px]">
                <span className="w-[62px] shrink-0 tabular-nums text-ink-3">{formatTime(i.startTime)}</span>
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", EVENT_META[i.category].dot)} aria-hidden />
                <span className="truncate">{i.title}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {insight && <p className="mt-5 rounded-xl bg-accent-soft px-4 py-3 text-[15px] font-medium text-accent-strong">{insight}</p>}
    </Modal>
  );
}

function toMinutesHour(t: string) {
  return Number(t.slice(0, 2));
}
