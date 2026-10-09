"use client";

import { Sparkles } from "lucide-react";
import type { LearningPrompt as Prompt } from "@/types";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";

/** An occasional, polite question when ORBIT has noticed a pattern. Never more than one at a time. */
export function LearningPrompt({ prompt, onAccept }: { prompt: Prompt; onAccept?: () => void }) {
  const { dispatch } = useOrbit();
  const { notify } = useUI();

  const accept = () => {
    dispatch({ type: "ANSWER_PROMPT", id: prompt.id, answer: "yes" });
    if (prompt.kind === "calendar_view") {
      dispatch({ type: "SET_DISPLAY_PREF", patch: { calendarView: prompt.value as "day" | "week" | "month" } });
      notify("Done. Calendar will open there from now on.", { undoable: true });
    } else if (prompt.kind === "ignore_source") {
      dispatch({ type: "IGNORE_SOURCE", key: prompt.value, label: prompt.label ?? prompt.value });
      notify(`Hidden. You can bring ${prompt.label} back in Settings.`, { undoable: true });
    }
    onAccept?.();
  };

  return (
    <div className="flex animate-rise-in flex-wrap items-center gap-x-3 gap-y-1" role="status">
      <Sparkles size={16} className="shrink-0 text-accent" aria-hidden />
      <p className="min-w-[14rem] flex-1 text-[14.5px] text-ink">{prompt.message}</p>
      <div className="flex gap-1">
        <button type="button" onClick={accept} className="min-h-8 rounded-lg px-2 text-[14px] font-semibold text-accent hover:bg-accent-soft">
          {prompt.acceptLabel}
        </button>
        <button type="button" onClick={() => dispatch({ type: "ANSWER_PROMPT", id: prompt.id, answer: "no" })} className="min-h-8 rounded-lg px-2 text-[14px] font-medium text-ink-3 hover:text-ink">
          Not now
        </button>
      </div>
    </div>
  );
}
