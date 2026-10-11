"use client";

import { Clock } from "lucide-react";
import type { RankedLoop } from "@/types";
import { cn } from "@/lib/cn";
import { datePart, formatTime, relativeDay, timePart, toDateStr, toTimeStr } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { SNOOZE_OPTIONS, useLoopActions } from "@/store/useActions";
import { Menu } from "@/components/ui/Menu";
import { DoneCircle, useCompleting } from "./LoopControls";
import { nextStepFor } from "@/services/helpers";
import { AREA_LABEL, AREA_STYLE } from "@/lib/areas";

/** One short detail: "Due 5 PM", "Closes tonight", "Reply by tomorrow", "Waiting on Maya". */
export function taskDetail(loop: RankedLoop, now: Date): string {
  if (loop.status === "done") return "Done";
  if (loop.waitingOn) return `Waiting on ${loop.waitingOn}`;
  if (!loop.deadline) return loop.snoozed ? "Snoozed" : "No deadline";
  const today = toDateStr(now);
  const date = datePart(loop.deadline);
  const time = timePart(loop.deadline);
  const past = loop.deadline < `${today}T${toTimeStr(now)}`;
  const at = time && time !== "23:59" ? formatTime(time) : "";
  if (past) return date === today ? `Was due ${at || "today"}` : `Overdue · ${relativeDay(date, today)}`;
  const day = relativeDay(date, today);
  const dayLower = day === "Today" || day === "Tomorrow" ? day.toLowerCase() : day.replace(/^Next /, "next ");
  if (loop.requiresResponse) return date === today ? "Reply today" : `Reply by ${dayLower}`;
  if (date === today) {
    if (!at) return /form|application/i.test(loop.title) ? "Closes tonight" : "Due tonight";
    return `Due ${at}`;
  }
  return `Due ${dayLower}`;
}

/**
 * The default way a task appears: status, title, one detail. Everything else
 * (source, priority, why ORBIT surfaced it) lives one tap away in the drawer.
 */
export function TaskRow({ loop, area, emphasizeToday = true, showStep = false }: { loop: RankedLoop; area?: "matters" | "tasks"; emphasizeToday?: boolean; showStep?: boolean }) {
  const { derived, dispatch } = useOrbit();
  const { open } = useUI();
  const actions = useLoopActions();
  const { completing, complete } = useCompleting(loop);
  const detail = taskDetail(loop, derived.now);
  const urgent = emphasizeToday && loop.status !== "done" && loop.deadline?.startsWith(derived.today);
  const done = loop.status === "done";
  const step = showStep ? nextStepFor(loop) : undefined;

  return (
    <li className={cn("group relative flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-surface", completing && "completing")}>
      <DoneCircle loop={loop} onComplete={complete} />
      <button
        type="button"
        onClick={() => {
          if (area) dispatch({ type: "SIGNAL", signal: { itemType: area === "matters" ? "today" : "loop", action: "open", context: { area, id: loop.id } } });
          open({ type: "loop", id: loop.id });
        }}
        className="min-w-0 flex-1 text-left"
      >
        <span className={cn("block truncate text-[16px] font-medium leading-snug", done ? "text-ink-3 line-through" : "text-ink")}>{loop.title}</span>
        <span className="flex items-center gap-1.5 text-[14px]">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", AREA_STYLE[loop.category].dot)} aria-hidden />
          <span className={cn("shrink-0", AREA_STYLE[loop.category].text)}>{AREA_LABEL[loop.category]}</span>
          <span className="text-ink-3" aria-hidden>·</span>
          <span className={cn("truncate", urgent ? "text-due-ink" : "text-ink-3")}>{detail}</span>
        </span>
      </button>
      {step && (
        <button
          type="button"
          onClick={() => open(step.kind === "draft" ? { type: "message", id: loop.messageId!, draft: true } : { type: "findTime", id: loop.id })}
          className="shrink-0 rounded-full bg-accent-soft px-3 py-1 text-[13.5px] font-medium text-accent-strong hover:bg-accent-line/60"
        >
          {step.label}
        </button>
      )}
      {/* Desktop: quick actions on hover. Touch: tap the row. */}
      {!done && (
        <div className="hidden items-center opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:flex">
          <Menu
            label={`Snooze “${loop.title}”`}
            trigger={<Clock size={16} aria-hidden />}
            items={SNOOZE_OPTIONS.map((o) => ({ label: `Snooze · ${o.label}`, onSelect: () => actions.snooze(loop.id, o.until, o.label) }))}
          />
        </div>
      )}
    </li>
  );
}
