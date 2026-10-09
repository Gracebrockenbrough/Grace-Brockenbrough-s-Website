"use client";

import { useId, useState } from "react";
import { CalendarClock, EyeOff, PanelRightOpen, Star } from "lucide-react";
import type { RankedLoop } from "@/types";
import { cn } from "@/lib/cn";
import { relativeDateTime } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { useLoopActions } from "@/store/useActions";
import { Menu } from "@/components/ui/Menu";
import { SourceBadge } from "@/components/ui/Badges";
import { WhyThisText, WhyThisToggle } from "@/components/ui/WhyThisPopover";
import { DoneCircle, SnoozeMenu, useCompleting } from "@/components/loops/LoopControls";

export function loopContext(loop: RankedLoop, today: string, courseCode?: string): string {
  const parts: string[] = [];
  if (loop.requiresResponse) {
    parts.push(loop.description?.split(" — ")[0] ?? "Waiting on your reply");
  } else if (loop.deadline) {
    const rel = relativeDateTime(loop.deadline, today);
    parts.push(rel === "Tonight" ? (loop.hardDeadline ? "Closes tonight" : "Tonight") : `Due ${/^(Today|Tomorrow)/.test(rel) ? rel.charAt(0).toLowerCase() + rel.slice(1) : rel}`);
  } else {
    parts.push("No deadline");
  }
  if (courseCode) parts.push(courseCode);
  return parts.join(" · ");
}

export function PriorityCard({ loop, index }: { loop: RankedLoop; index: number }) {
  const { derived, state } = useOrbit();
  const { open } = useUI();
  const actions = useLoopActions();
  const { completing, complete } = useCompleting(loop);
  const course = state.courses.find((c) => c.id === loop.courseId);
  const [showWhy, setShowWhy] = useState(false);
  const whyId = useId();

  return (
    <li
      className={cn("group relative animate-rise-in rounded-2xl border border-line bg-surface p-4 shadow-card transition-shadow hover:shadow-raised md:p-5", completing && "completing")}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-3.5">
        <div className="pt-0.5">
          <DoneCircle loop={loop} onComplete={complete} size="lg" />
        </div>
        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => open({ type: "loop", id: loop.id })}>
          <span className="block text-[17px] font-semibold leading-snug text-ink">{loop.title}</span>
          <span className={cn("mt-0.5 block text-[15px]", loop.deadline && loop.deadline.startsWith(derived.today) ? "text-attention" : "text-ink-2")}>
            {loopContext(loop, derived.today, course?.code)}
          </span>
        </button>
        <Menu
          label={`More options for “${loop.title}”`}
          items={[
            { label: "Open details", icon: <PanelRightOpen size={16} />, onSelect: () => open({ type: "loop", id: loop.id }) },
            { label: "Reschedule", icon: <CalendarClock size={16} />, onSelect: () => open({ type: "loop", id: loop.id }) },
            { label: "This is important", icon: <Star size={16} />, onSelect: () => actions.setPriority(loop.id, "high") },
            { label: "Not important", icon: <EyeOff size={16} />, onSelect: () => actions.notImportant(loop) },
          ]}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-1 gap-y-1 pl-[42px]">
        <button
          type="button"
          onClick={complete}
          className="inline-flex min-h-9 items-center rounded-xl px-2 text-[14px] font-medium text-success hover:bg-success-soft"
        >
          Done
        </button>
        <SnoozeMenu loop={loop} />
        {loop.why && <WhyThisToggle open={showWhy} onToggle={() => setShowWhy((v) => !v)} controls={whyId} />}
        <SourceBadge source={loop.source} className="ml-auto hidden sm:inline-flex" />
      </div>
      {showWhy && loop.why && <WhyThisText id={whyId} why={loop.why} className="ml-[42px] mt-2" />}
    </li>
  );
}
