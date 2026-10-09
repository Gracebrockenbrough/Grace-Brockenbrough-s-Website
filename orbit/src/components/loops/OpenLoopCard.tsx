"use client";

import { useId, useState } from "react";
import { BellOff, CalendarClock, ChevronsUpDown, HelpCircle, Trash2 } from "lucide-react";
import type { RankedLoop } from "@/types";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { useLoopActions } from "@/store/useActions";
import { Menu } from "@/components/ui/Menu";
import { PriorityTag } from "@/components/ui/Badges";
import { WhyThisText } from "@/components/ui/WhyThisPopover";
import { loopContext } from "@/components/today/PriorityCard";
import { DoneCircle, useCompleting } from "./LoopControls";

const CATEGORY_LABEL = { school: "School", work: "Work", personal: "Personal" };

export function OpenLoopCard({ loop }: { loop: RankedLoop }) {
  const { state, derived } = useOrbit();
  const { open } = useUI();
  const actions = useLoopActions();
  const { completing, complete } = useCompleting(loop);
  const [showWhy, setShowWhy] = useState(false);
  const whyId = useId();
  const course = state.courses.find((c) => c.id === loop.courseId);
  const done = loop.status === "done";

  const meta = [
    CATEGORY_LABEL[loop.category],
    loop.hardDeadline && !done ? "Hard deadline" : undefined,
    loop.waitingOn ? `Waiting on ${loop.waitingOn}` : undefined,
    loop.snoozed ? "Snoozed" : undefined,
  ].filter(Boolean);

  return (
    <li className={cn("rounded-2xl border border-line bg-surface px-4 py-3.5 shadow-card md:px-5", completing && "completing", done && "bg-surface/60")}>
      <div className="flex items-start gap-3.5">
        <div className="pt-0.5">
          <DoneCircle loop={loop} onComplete={complete} />
        </div>
        <button type="button" onClick={() => open({ type: "loop", id: loop.id })} className="min-w-0 flex-1 text-left">
          <span className={cn("block text-[16px] font-medium leading-snug", done ? "text-ink-3 line-through" : "text-ink")}>{loop.title}</span>
          <span className="mt-0.5 block text-[14px] text-ink-2">{loopContext(loop, derived.today, course?.code)}</span>
          <span className="mt-0.5 block text-[13.5px] text-ink-3">{meta.join(" · ")}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          {!done && loop.priority === "high" && <PriorityTag level="high" className="mr-1 hidden sm:inline-flex" />}
          {!done && (
            <button type="button" onClick={complete} className="hidden min-h-9 rounded-xl px-2.5 text-[14px] font-medium text-success hover:bg-success-soft sm:inline-flex sm:items-center">
              Done
            </button>
          )}
          <button type="button" onClick={() => open({ type: "loop", id: loop.id })} className="hidden min-h-9 rounded-xl px-2.5 text-[14px] font-medium text-ink-2 hover:bg-sunken sm:inline-flex sm:items-center">
            Open
          </button>
          <Menu
            label={`More options for “${loop.title}”`}
            items={[
              { label: "Reschedule", icon: <CalendarClock size={16} />, onSelect: () => open({ type: "loop", id: loop.id }) },
              {
                label: "Change priority",
                icon: <ChevronsUpDown size={16} />,
                onSelect: () => actions.setPriority(loop.id, loop.priority === "high" ? "medium" : "high"),
              },
              ...(loop.snoozed
                ? [{ label: "Unsnooze", icon: <BellOff size={16} />, onSelect: () => actions.unsnooze(loop.id) }]
                : []),
              ...(loop.why ? [{ label: showWhy ? "Hide why" : "Why this?", icon: <HelpCircle size={16} />, onSelect: () => setShowWhy((v) => !v) }] : []),
              { label: "Remove", icon: <Trash2 size={16} />, tone: "danger" as const, onSelect: () => actions.remove(loop.id) },
            ]}
          />
        </div>
      </div>
      {showWhy && loop.why && <WhyThisText id={whyId} why={loop.why} className="ml-[38px] mt-2" />}
    </li>
  );
}
