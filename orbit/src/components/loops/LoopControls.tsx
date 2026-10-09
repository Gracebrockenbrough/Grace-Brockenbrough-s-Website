"use client";

import { useState } from "react";
import { Check, Clock } from "lucide-react";
import type { RankedLoop } from "@/types";
import { cn } from "@/lib/cn";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { SNOOZE_OPTIONS, useLoopActions } from "@/store/useActions";

/** Round "mark done" control with a short completion animation. */
export function DoneCircle({ loop, onComplete, size = "md" }: { loop: RankedLoop; onComplete: () => void; size?: "md" | "lg" }) {
  const done = loop.status === "done";
  return (
    <button
      type="button"
      aria-label={done ? `Mark “${loop.title}” as not done` : `Mark “${loop.title}” done`}
      aria-pressed={done}
      onClick={(e) => {
        e.stopPropagation();
        onComplete();
      }}
      className={cn(
        "group flex shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        size === "lg" ? "h-7 w-7" : "h-6 w-6",
        done ? "border-success bg-success text-white" : "border-line-strong text-transparent hover:border-success hover:text-success",
      )}
    >
      <Check size={size === "lg" ? 16 : 14} strokeWidth={3} aria-hidden />
    </button>
  );
}

/** Completion with a brief exit animation before the state update. */
export function useCompleting(loop: RankedLoop) {
  const actions = useLoopActions();
  const [completing, setCompleting] = useState(false);
  const complete = () => {
    if (loop.status === "done") {
      actions.reopen(loop.id);
      return;
    }
    setCompleting(true);
    window.setTimeout(() => actions.complete(loop.id), 240);
  };
  return { completing, complete };
}

export function SnoozeMenu({ loop }: { loop: RankedLoop }) {
  const actions = useLoopActions();
  const items: MenuItem[] = SNOOZE_OPTIONS.map((o) => ({ label: o.label, onSelect: () => actions.snooze(loop.id, o.until, o.label) }));
  return (
    <Menu
      label={`Snooze “${loop.title}”`}
      items={items}
      align="left"
      trigger={
        <span className="inline-flex items-center gap-1.5 px-2 text-[14px] font-medium text-ink-2">
          <Clock size={15} aria-hidden />
          Snooze
        </span>
      }
    />
  );
}
