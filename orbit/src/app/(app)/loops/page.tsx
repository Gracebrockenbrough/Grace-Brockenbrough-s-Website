"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ChevronDown } from "lucide-react";
import type { Category, RankedLoop } from "@/types";
import { areaLabel, areaStyle } from "@/lib/areas";
import { datePart, diffDays, toDateStr, toTimeStr } from "@/lib/time";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { EmptyState } from "@/components/ui/Card";
import { TaskRow } from "@/components/loops/TaskRow";

type Group = "needs" | "soon" | "waiting" | "later";

const GROUPS: { id: Group; title: string; hint: string }[] = [
  { id: "needs", title: "Needs you", hint: "Due soon or someone is waiting on you" },
  { id: "soon", title: "Coming soon", hint: "This week" },
  { id: "waiting", title: "Waiting on someone", hint: "Orbit will remind you if they don't come through" },
  { id: "later", title: "Later", hint: "No rush" },
];

/**
 * Open loops: everything that isn't finished, including what other people
 * owe you. Each row carries its next step (find time, draft a reply, nudge, open).
 */
export default function OpenLoopsPage() {
  const { derived } = useOrbit();
  const [filter, setFilter] = useState<"all" | Category>("all");
  const [showDone, setShowDone] = useState(false);
  const [showLater, setShowLater] = useState(false);
  const nowStr = `${toDateStr(derived.now)}T${toTimeStr(derived.now)}`;

  const groupOf = (l: RankedLoop): Group => {
    if (l.waitingOn || l.status === "waiting") return "waiting";
    if (l.status === "now" || (l.deadline && l.deadline < nowStr) || l.requiresResponse) return "needs";
    if (l.deadline && diffDays(datePart(l.deadline), derived.today) <= 7) return "soon";
    return "later";
  };
  const areas = derived.areas.map((a) => a.area).filter((a) => derived.openLoops.some((l) => l.category === a));
  const matches = (l: RankedLoop) => filter === "all" || l.category === filter;
  const open = derived.openLoops.filter(matches).sort((a, b) => b.priorityScore - a.priorityScore);
  const done = derived.loops.filter((l) => l.status === "done" && matches(l));

  return (
    <div className="space-y-6">
      <Link href="/today" className="inline-flex min-h-9 items-center gap-1.5 px-1 text-[14.5px] text-ink-2 hover:text-ink">
        <ArrowLeft size={16} aria-hidden /> Today
      </Link>
      <header className="px-1">
        <h1 className="text-[34px] leading-tight">Open loops</h1>
        <p className="mt-1 text-[15.5px] text-ink-2">Everything still in motion — including what others owe you.</p>
      </header>

      <div role="group" aria-label="Filter by area" className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5">
        {(["all", ...areas] as ("all" | Category)[]).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn("inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-medium", filter === f ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}
          >
            {f !== "all" && <span className={cn("h-2 w-2 rounded-full", areaStyle(f).dot)} aria-hidden />}
            {f === "all" ? "All" : areaLabel(f)}
          </button>
        ))}
      </div>

      {open.length === 0 ? (
        <EmptyState icon={<CheckCircle2 size={28} />} title="You're caught up." body="Nothing needs your attention right now." />
      ) : (
        GROUPS.map((g) => {
          const items = open.filter((l) => groupOf(l) === g.id);
          if (!items.length) return null;
          const collapsed = g.id === "later" && !showLater;
          return (
            <section key={g.id} aria-label={g.title}>
              <button
                type="button"
                aria-expanded={!collapsed}
                disabled={g.id !== "later"}
                onClick={() => setShowLater((s) => !s)}
                className="mb-2 flex w-full items-baseline gap-2 px-1 text-left"
              >
                <h2 className={cn("text-[15px] font-semibold", g.id === "needs" ? "text-ink" : "text-ink-2")}>{g.title}</h2>
                <span className="text-[14px] text-ink-3">{items.length}</span>
                {g.id === "later" && <ChevronDown size={16} className={cn("ml-auto text-ink-3 transition-transform", collapsed && "-rotate-90")} aria-hidden />}
              </button>
              {!collapsed && (
                <ul className="divide-y divide-line rounded-2xl bg-surface shadow-card">
                  {items.map((l) => (
                    <TaskRow key={l.id} loop={l} area="tasks" showStep />
                  ))}
                </ul>
              )}
            </section>
          );
        })
      )}

      {done.length > 0 && (
        <section aria-label="Done">
          <button type="button" aria-expanded={showDone} onClick={() => setShowDone((s) => !s)} className="mb-2 flex w-full items-baseline gap-2 px-1 text-left">
            <h2 className="text-[15px] font-semibold text-ink-2">Done</h2>
            <span className="text-[14px] text-ink-3">{done.length}</span>
            <ChevronDown size={16} className={cn("ml-auto text-ink-3 transition-transform", !showDone && "-rotate-90")} aria-hidden />
          </button>
          {showDone && (
            <ul className="divide-y divide-line rounded-2xl bg-surface shadow-card">
              {done.map((l) => (
                <TaskRow key={l.id} loop={l} area="tasks" />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
