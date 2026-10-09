"use client";

import { Sparkles } from "lucide-react";
import type { FreeTimeSuggestion } from "@/types";
import { formatTimeRange } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { usePlanBlock } from "@/store/useActions";
import { Button } from "@/components/ui/Button";
import { WhyThisPopover } from "@/components/ui/WhyThisPopover";

/** Helpful, not controlling: one suggestion for open time, easy to decline. */
export function FreeTimeCard({ suggestion, compact = false }: { suggestion: FreeTimeSuggestion; compact?: boolean }) {
  const { dispatch } = useOrbit();
  const { notify } = useUI();
  const plan = usePlanBlock();

  return (
    <div className="animate-rise-in rounded-2xl border border-accent-line bg-accent-soft/60 p-4 md:p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface text-accent" aria-hidden>
          <Sparkles size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold text-ink">{suggestion.title}</p>
          <p className="mt-0.5 text-[15px] text-ink-2">{suggestion.detail}</p>
          {!compact && <p className="mt-1 text-[13.5px] text-ink-3">Suggested block: {formatTimeRange(suggestion.start, suggestion.planEnd)}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                plan({
                  title: suggestion.planTitle,
                  date: suggestion.date,
                  start: suggestion.start,
                  end: suggestion.planEnd,
                  courseId: suggestion.courseId,
                  loopId: suggestion.loopId,
                })
              }
            >
              {compact ? "Schedule it" : "Add plan"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                dispatch({ type: "DISMISS", id: suggestion.id });
                notify("No problem. ORBIT won't suggest this window again.", { undoable: true });
              }}
            >
              {compact ? "Dismiss" : "Not now"}
            </Button>
          </div>
          <WhyThisPopover why={suggestion.why} className="mt-1" />
        </div>
      </div>
    </div>
  );
}
