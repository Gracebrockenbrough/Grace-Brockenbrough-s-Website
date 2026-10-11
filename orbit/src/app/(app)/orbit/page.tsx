"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import type { Category } from "@/types";
import { AREA_LABEL, AREA_STYLE } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { formatTime, relativeDay } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Planet, Sun } from "@/components/areas/Planet";
import { KnowYouCard } from "@/components/areas/KnowYouCard";
import { GoalCard } from "@/components/goals/GoalCard";
import { areaForItem } from "@/services/areas";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

/** Where each planet sits on the map, as % of the square. */
const POS: Record<Category, { x: number; y: number }> = {
  school: { x: 50, y: 11 },
  work: { x: 86, y: 31 },
  wellness: { x: 84, y: 71 },
  social: { x: 50, y: 90 },
  travel: { x: 16, y: 71 },
  personal: { x: 14, y: 31 },
};

const STARS = Array.from({ length: 28 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 61 + 13) % 100, s: i % 3 === 0 ? 2 : 1 }));

function OrbitMap() {
  const { derived } = useOrbit();
  const todayCount = derived.priorities.length + derived.goals.filter((g) => g.progress.today && !g.progress.today.done).length;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[540px]">
      {STARS.map((s, i) => (
        <span key={i} className="absolute rounded-full bg-cream/40" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s }} aria-hidden />
      ))}
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="50" cy="50" r="39" fill="none" stroke="#3b4580" strokeWidth="0.3" strokeDasharray="0.8 1.2" />
        <circle cx="50" cy="50" r="25" fill="none" stroke="#2b3468" strokeWidth="0.3" />
      </svg>
      <Link href="/today" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-offset-4" aria-label={`Today: ${todayCount} things`}>
        <Sun size={104}>
          <span className="font-display text-[30px] leading-none">{todayCount}</span>
          <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em]">Today</span>
        </Sun>
      </Link>
      {derived.areas.map((a) => {
        const p = POS[a.area];
        const size = Math.min(60, 38 + a.count * 4);
        return (
          <Link
            key={a.area}
            href={`/orbit/${a.area}`}
            aria-label={`${AREA_LABEL[a.area]}: ${a.status}${a.count ? `, ${a.count} open` : ""}`}
            className="group absolute flex w-[96px] -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center sm:w-[120px]"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <span className="relative transition-transform duration-300 group-hover:scale-110">
              <Planet area={a.area} size={size} ring={a.area === "school" || a.area === "travel"} glow={a.hot} />
              {a.count > 0 && (
                <span className="absolute -right-1.5 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-cream px-1 text-[11.5px] font-bold text-navy">{a.count}</span>
              )}
            </span>
            <span className="mt-1.5 text-[14px] font-semibold text-ink">{AREA_LABEL[a.area]}</span>
            <span className="line-clamp-2 text-[11.5px] leading-tight text-ink-3">{a.status}</span>
          </Link>
        );
      })}
    </div>
  );
}

/** Everything together: one list, color-coded by part of life. */
function Together() {
  const { derived } = useOrbit();
  const { open } = useUI();
  const { today } = derived;
  const rows = [
    ...derived.openLoops
      .filter((l) => l.deadline)
      .map((l) => ({ id: l.id, date: l.deadline!.slice(0, 10) < today ? today : l.deadline!.slice(0, 10), time: l.deadline!.slice(11, 16), title: l.title, area: l.category, onClick: () => open({ type: "loop", id: l.id }) })),
    ...derived.upcomingItems
      .filter((i) => i.kind !== "deadline" && i.kind !== "class" && i.date <= derivedWeekEnd(today))
      .map((i) => ({ id: i.id, date: i.date, time: i.startTime ?? "", title: i.title, area: areaForItem(i, derived.loops), onClick: () => open({ type: "event", id: i.id }) })),
    ...derived.goals.flatMap(({ goal }) =>
      goal.steps
        .filter((s) => !s.done && s.date >= today && s.date <= derivedWeekEnd(today))
        .map((s) => ({ id: s.id, date: s.date, time: "", title: s.title, area: goal.area, onClick: () => open({ type: "goal", id: goal.id }) })),
    ),
  ]
    .filter((r) => r.date >= today && r.date <= derivedWeekEnd(today))
    .sort((a, b) => (a.date + (a.time || "99")).localeCompare(b.date + (b.time || "99")));

  const days = [...new Set(rows.map((r) => r.date))];
  return (
    <div className="space-y-5">
      {days.map((d) => (
        <section key={d} aria-label={relativeDay(d, today)}>
          <h3 className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-3">{relativeDay(d, today)}</h3>
          <ul className="space-y-1">
            {rows
              .filter((r) => r.date === d)
              .map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={r.onClick} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface">
                    <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", AREA_STYLE[r.area].dot)} aria-hidden />
                    <span className="min-w-0 flex-1 truncate text-[15px]">{r.title}</span>
                    <span className={cn("shrink-0 text-[12.5px]", AREA_STYLE[r.area].text)}>{AREA_LABEL[r.area]}</span>
                    <span className="w-16 shrink-0 text-right text-[13px] tabular-nums text-ink-3">{r.time && r.time !== "23:59" ? formatTime(r.time) : ""}</span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function derivedWeekEnd(today: string) {
  const d = new Date(`${today}T00:00`);
  d.setDate(d.getDate() + 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The Orbit: every part of life at a glance, together or one at a time. */
export default function OrbitPage() {
  const { derived } = useOrbit();
  const { open } = useUI();
  const [view, setView] = useState<"map" | "list">("map");

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-accent">Your orbit</p>
          <h1 className="text-[34px] leading-tight md:text-[40px]">Everything, in orbit</h1>
          <p className="mt-1 text-[15.5px] text-ink-2">Each part of your life is its own planet. Tap one to see just that.</p>
        </div>
        <SegmentedControl<"map" | "list">
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "map", label: "Planets" },
            { value: "list", label: "All together" },
          ]}
        />
      </header>

      {view === "map" ? <OrbitMap /> : <Together />}

      <ul className="flex gap-2 overflow-x-auto pb-1" aria-label="Parts of life">
        {derived.areas.map((a) => (
          <li key={a.area} className="shrink-0">
            <Link
              href={`/orbit/${a.area}`}
              className={cn("flex min-w-[150px] items-center gap-3 rounded-2xl border bg-surface p-3 hover:shadow-raised", AREA_STYLE[a.area].border)}
            >
              <Planet area={a.area} size={30} />
              <span className="min-w-0">
                <span className="block text-[14.5px] font-semibold">{AREA_LABEL[a.area]}</span>
                <span className="block truncate text-[12.5px] text-ink-3">{a.loops.length} {a.loops.length === 1 ? "task" : "tasks"} · {a.goals.length} {a.goals.length === 1 ? "goal" : "goals"}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="goals-h">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="goals-h" className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-3">Goals</h2>
          <button type="button" onClick={() => open({ type: "newGoal" })} className="inline-flex min-h-9 items-center gap-1 text-[14.5px] font-medium text-accent hover:text-accent-strong">
            <Plus size={16} aria-hidden /> New goal
          </button>
        </div>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
          {derived.goals.map(({ goal, progress }) => (
            <GoalCard key={goal.id} goal={goal} progress={progress} />
          ))}
          <button
            type="button"
            onClick={() => open({ type: "newGoal" })}
            className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong p-5 text-ink-2 hover:border-accent hover:text-ink"
          >
            <Plus size={22} aria-hidden />
            <span className="text-[15px] font-medium">Set a goal</span>
            <span className="text-[13.5px] text-ink-3">“Run a 5K next month” → a plan of small steps</span>
          </button>
        </div>
      </section>

      <KnowYouCard />

      <Link href="/loops" className="flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-4 hover:shadow-raised">
        <span>
          <span className="block text-[16px] font-semibold">See every task</span>
          <span className="block text-[14px] text-ink-3">{derived.openLoops.length} open across your whole life</span>
        </span>
        <ArrowRight size={18} className="text-ink-3" aria-hidden />
      </Link>
    </div>
  );
}
