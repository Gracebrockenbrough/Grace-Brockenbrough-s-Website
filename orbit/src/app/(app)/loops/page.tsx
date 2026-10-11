"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import type { Category, LoopStatus, RankedLoop } from "@/types";
import { AREA_LABEL, AREA_ORDER } from "@/lib/areas";
import { toDateStr, toTimeStr } from "@/lib/time";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { EmptyState } from "@/components/ui/Card";
import { TaskRow } from "@/components/loops/TaskRow";

type Filter = "all" | Category;
type Sort = "recommended" | "due" | "recent";

const GROUPS: { status: LoopStatus | "overdue"; title: string }[] = [
  { status: "overdue", title: "Overdue" },
  { status: "now", title: "Now" },
  { status: "soon", title: "Soon" },
  { status: "later", title: "Later" },
  { status: "waiting", title: "Waiting" },
];

function sortLoops(loops: RankedLoop[], sort: Sort): RankedLoop[] {
  const copy = [...loops];
  if (sort === "due") return copy.sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
  if (sort === "recent") return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return copy.sort((a, b) => b.priorityScore - a.priorityScore);
}

/**
 * Every Open Loop: anything that still needs attention. Rows stay minimal;
 * details, source, and priority live in the drawer.
 */
export default function TasksPage() {
  const { derived } = useOrbit();
  const [filter, setFilter] = useState<Filter>("all");
  const sort: Sort = "recommended";
  const [showDone, setShowDone] = useState(false);
  // Only what's close is open by default; Later and Waiting are one tap away.
  const [expanded, setExpanded] = useState<(LoopStatus | "overdue")[]>(["overdue", "now", "soon"]);
  const nowStr = `${toDateStr(derived.now)}T${toTimeStr(derived.now)}`;
  const isOverdue = (l: RankedLoop) => !!l.deadline && l.deadline < nowStr && l.status !== "waiting";
  const groupOf = (l: RankedLoop): LoopStatus | "overdue" => (isOverdue(l) ? "overdue" : l.status);
  // Only show the life areas that actually have something in them.
  const areas = AREA_ORDER.filter((a) => derived.openLoops.some((l) => l.category === a));

  const matches = (l: RankedLoop) => filter === "all" || l.category === filter;
  const open = sortLoops(derived.openLoops.filter(matches), sort);
  const done = derived.loops.filter((l) => l.status === "done" && matches(l));

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">Open Loops</h1>
        <p className="mt-1 text-[15.5px] text-ink-2">Everything you still need to handle.</p>
      </header>

      {/* Filters are secondary: small text tabs, not buttons. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line">
        <div role="group" aria-label="Filter" className="no-scrollbar -mb-px flex gap-4 overflow-x-auto">
          {(["all", ...areas] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn("min-h-10 border-b-2 text-[14.5px] font-medium", filter === f ? "border-ink text-ink" : "border-transparent text-ink-3 hover:text-ink")}
            >
              {f === "all" ? "All" : AREA_LABEL[f]}
            </button>
          ))}
        </div>
      </div>

      {open.length === 0 ? (
        <EmptyState icon={<CheckCircle2 size={28} />} title="You're caught up." body="Nothing needs your attention right now." />
      ) : sort === "recommended" ? (
        <div className="space-y-8">
          {GROUPS.map((g) => {
            const items = open.filter((l) => groupOf(l) === g.status);
            if (!items.length) return null;
            return (
              <section key={g.status} aria-labelledby={`group-${g.status}`}>
                <h2 id={`group-${g.status}`} className="mb-1">
                  <button
                    type="button"
                    aria-expanded={expanded.includes(g.status)}
                    onClick={() => setExpanded((e) => (e.includes(g.status) ? e.filter((x) => x !== g.status) : [...e, g.status]))}
                    className={cn("flex min-h-8 items-center gap-1 text-[13px] font-semibold uppercase tracking-wider hover:text-ink", g.status === "overdue" ? "text-critical" : "text-ink-3")}
                  >
                    <ChevronDown size={15} className={expanded.includes(g.status) ? "" : "-rotate-90"} aria-hidden />
                    {g.title} <span className="font-normal">· {items.length}</span>
                  </button>
                </h2>
                {expanded.includes(g.status) && <ul className="-mx-2">
                  {items.map((l) => (
                    <TaskRow key={l.id} loop={l} area="tasks" showStep />
                  ))}
                </ul>}
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="-mx-2">
          {open.map((l) => (
            <TaskRow key={l.id} loop={l} area="tasks" />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <section className="mt-10">
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone((v) => !v)}
            className="flex min-h-10 items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-ink-3 hover:text-ink"
          >
            <ChevronDown size={16} className={showDone ? "" : "-rotate-90"} aria-hidden />
            Done · {done.length}
          </button>
          {showDone && (
            <ul className="-mx-2 mt-1">
              {done.map((l) => (
                <TaskRow key={l.id} loop={l} emphasizeToday={false} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
