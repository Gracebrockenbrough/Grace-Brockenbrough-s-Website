"use client";

import { ExternalLink } from "lucide-react";
import { appFor } from "@/lib/handoff";
import type { RankedLoop } from "@/types";
import { cn } from "@/lib/cn";
import { datePart, formatTime, relativeDay, timePart, toDateStr, toTimeStr } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { DoneCircle, useCompleting } from "./LoopControls";
import { nextStepFor } from "@/services/helpers";
import { areaLabel, areaStyle } from "@/lib/areas";

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
 * (source, priority, why Orbit surfaced it) lives one tap away in the drawer.
 */
export function TaskRow({
  loop,
  area,
  emphasizeToday = true,
  showStep = false,
  hint,
}: {
  loop: RankedLoop;
  area?: "matters" | "tasks";
  emphasizeToday?: boolean;
  showStep?: boolean;
  /** One extra useful line, e.g. "Best window 2:30–4:00". */
  hint?: string;
}) {
  const { derived, dispatch } = useOrbit();
  const { open } = useUI();
  const { completing, complete } = useCompleting(loop);
  const detail = taskDetail(loop, derived.now);
  const urgent = emphasizeToday && loop.status !== "done" && loop.deadline?.startsWith(derived.today);
  const done = loop.status === "done";

  return (
    <li className={cn("group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-colors", completing && "completing")}>
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
          <span className={cn("h-2 w-2 shrink-0 rounded-full", areaStyle(loop.category).dot)} aria-hidden title={areaLabel(loop.category)} />
          <span className="sr-only">{areaLabel(loop.category)}:</span>
          <span className={cn("truncate", urgent ? "font-medium text-due-ink" : "text-ink-3")}>{detail}</span>
        </span>
        {hint && <span className="block truncate text-[13.5px] text-ink-3">{hint}</span>}
      </button>
      {showStep && !done && <StepAction loop={loop} />}
    </li>
  );
}

/** The one contextual next step for a loop: draft, find time, nudge, or open the app it lives in. */
function StepAction({ loop }: { loop: RankedLoop }) {
  const { open } = useUI();
  const step = nextStepFor(loop);
  const pill = "inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full bg-sunken px-3 text-[13.5px] font-medium text-ink hover:bg-line";
  if (step) {
    return (
      <button type="button" className={pill} onClick={() => open(step.kind === "draft" ? { type: "message", id: loop.messageId!, draft: true } : { type: "findTime", id: loop.id })}>
        {step.label}
      </button>
    );
  }
  if (loop.waitingOn) {
    return (
      <button
        type="button"
        className={pill}
        onClick={() =>
          open({
            type: "compose",
            // A person gets a text; an organization gets an email.
            kind: /\s/.test(loop.waitingOn!) ? "email" : "text",
            to: loop.waitingOn,
            about: `follow up on ${loop.title.replace(new RegExp(`^${loop.waitingOn}'s\\s*`, "i"), "").toLowerCase()}`,
          })
        }
      >
        Nudge
      </button>
    );
  }
  const app = appFor(loop.title, loop.source.kind);
  if (app) {
    return (
      <a href={app.href} target="_blank" rel="noopener noreferrer" className={pill}>
        Open <ExternalLink size={12} aria-hidden />
      </a>
    );
  }
  return null;
}
