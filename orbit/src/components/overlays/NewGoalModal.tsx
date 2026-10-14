"use client";

import { useMemo, useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import type { Category } from "@/types";
import { BUILTIN_AREAS, areaLabel, areaStyle } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { nowStr } from "@/lib/clock";
import { relativeDay } from "@/lib/time";
import { buildGoal, GOAL_EXAMPLES } from "@/services/goals";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Modal } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { Planet } from "@/components/areas/Planet";

/** "Run a 5K next month" → a plan of small steps, previewed before anything is added. */
export function NewGoalModal({ onClose, area: initialArea, text: initialText = "" }: { onClose: () => void; area?: Category; text?: string }) {
  const { dispatch, derived, state } = useOrbit();
  const { notify, open } = useUI();
  const [text, setText] = useState(initialText);
  const [preview, setPreview] = useState(!!initialText);
  const [area, setArea] = useState<Category | undefined>();
  const [target, setTarget] = useState<string | undefined>();
  const [listening, setListening] = useState(false);

  // The page's area is only a default for goals Orbit can't place on its own.
  const goal = useMemo(() => {
    if (!preview || !text.trim()) return undefined;
    const g = buildGoal(text, derived.today, nowStr(), { area, target });
    return !area && initialArea && g.kind === "generic" ? { ...g, area: initialArea } : g;
  }, [preview, text, area, target, derived.today, initialArea]);

  const speak = () => {
    setListening(true);
    setTimeout(() => {
      setListening(false);
      setText("Run a 5K next month");
    }, 1100);
  };

  if (goal) {
    const style = areaStyle(goal.area);
    return (
      <Modal
        title="Here's a plan"
        onClose={onClose}
        footer={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={() => {
                dispatch({ type: "ADD_GOAL", goal });
                notify(`Started “${goal.title}”. ${goal.steps.length} small steps until ${relativeDay(goal.target, derived.today)}.`, { undoable: true });
                open({ type: "goal", id: goal.id });
              }}
            >
              Start this plan
            </Button>
            <Button variant="ghost" onClick={() => setPreview(false)}>Change it</Button>
          </div>
        }
      >
        <div className="flex items-center gap-4">
          <Planet area={goal.area} size={12} className="mt-2.5 self-start" />
          <div className="min-w-0">
            <p className="font-display text-[22px] leading-snug">{goal.title}</p>
            <p className="text-[14.5px] text-ink-2">{goal.plan}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
          <label className="block text-[14px] text-ink-3">
            Finish by
            <input type="date" value={goal.target} min={derived.today} onChange={(e) => setTarget(e.target.value || undefined)} className="mt-1 block min-h-10 w-full rounded-xl border border-line-strong bg-canvas px-3 text-[15px] text-ink" />
          </label>
          <div>
            <p className="text-[14px] text-ink-3">Part of life</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {state.profile.areas.map((a) => (
                <button
                  key={a}
                  type="button"
                  aria-pressed={goal.area === a}
                  onClick={() => setArea(a)}
                  className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[13px]", goal.area === a ? `${areaStyle(a).border} ${areaStyle(a).soft} text-ink` : "border-line text-ink-3")}
                >
                  <span className={cn("h-2 w-2 rounded-full", areaStyle(a).dot)} aria-hidden />
                  {areaLabel(a)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <h3 className={cn("mb-2 mt-6 text-[13.5px] font-semibold", style.text)}>First steps</h3>
        <ol className="space-y-1.5">
          {goal.steps.slice(0, 5).map((s) => (
            <li key={s.id} className="flex items-start gap-3 rounded-xl bg-sunken px-3 py-2.5">
              <span className="mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-line-strong" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[15px] font-medium">{s.title}</span>
                <span className="block text-[13.5px] text-ink-3">{relativeDay(s.date, derived.today)}{s.detail ? ` · ${s.detail}` : ""}</span>
              </span>
            </li>
          ))}
        </ol>
        {goal.steps.length > 5 && <p className="mt-2 text-[14px] text-ink-3">…and {goal.steps.length - 5} more, each one small. Orbit adjusts if you miss a day.</p>}
      </Modal>
    );
  }

  return (
    <Modal
      title="What do you want to work toward?"
      onClose={onClose}
      footer={
        <Button variant="primary" disabled={!text.trim()} onClick={() => setPreview(true)}>
          <Sparkles size={16} aria-hidden /> Make a plan
        </Button>
      }
    >
      <p className="text-[15px] text-ink-2">Say it the way you'd tell a friend. Orbit turns it into small steps you can actually do.</p>
      <div className="relative mt-4">
        <label htmlFor="goal-text" className="sr-only">Your goal</label>
        <textarea
          id="goal-text"
          data-autofocus
          rows={2}
          value={listening ? "" : text}
          placeholder={listening ? "Listening…" : "Run a 5K next month"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && text.trim()) {
              e.preventDefault();
              setPreview(true);
            }
          }}
          className="w-full resize-none rounded-2xl border border-line-strong bg-canvas p-4 pr-14 text-[17px]"
        />
        <button
          type="button"
          onClick={speak}
          aria-label="Speak your goal"
          className={cn("absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full", listening ? "animate-pulse-soft bg-accent text-on-primary" : "bg-sunken text-ink-2 hover:text-ink")}
        >
          <Mic size={18} aria-hidden />
        </button>
      </div>
      <p className="mb-2 mt-5 text-[13.5px] font-semibold text-ink-3">Ideas</p>
      <div className="flex flex-wrap gap-2">
        {GOAL_EXAMPLES.map((g) => (
          <button key={g} type="button" onClick={() => { setText(g); setPreview(true); }} className="min-h-9 rounded-full border border-line-strong px-3.5 text-[14px] text-ink-2 hover:border-accent hover:text-ink">
            {g}
          </button>
        ))}
      </div>
    </Modal>
  );
}
