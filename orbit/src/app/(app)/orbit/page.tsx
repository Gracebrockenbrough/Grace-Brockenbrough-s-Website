"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import type { Category } from "@/types";
import { areaLabel, areaSlug, areaStyle, customArea } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { GoalCard } from "@/components/goals/GoalCard";
import { KnowYouCard } from "@/components/areas/KnowYouCard";
import type { AreaSummary } from "@/services/areas";

/** Optional visual: parts of life as small dots on one thin orbit around Today. */
function OrbitMap({ areas }: { areas: AreaSummary[] }) {
  const { derived } = useOrbit();
  const todayCount = derived.priorities.length;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[340px]">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
        <circle cx="50" cy="50" r="36" fill="none" stroke="var(--color-line-strong)" strokeWidth="0.35" />
      </svg>
      <Link
        href="/today"
        aria-label={`Today: ${todayCount} things matter`}
        className="absolute left-1/2 top-1/2 flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-primary text-on-primary"
      >
        <span className="font-display text-[26px] leading-none">{todayCount}</span>
        <span className="mt-0.5 text-[11.5px]">today</span>
      </Link>
      {areas.map((a, i) => {
        const angle = (i / areas.length) * Math.PI * 2 - Math.PI / 2;
        const x = 50 + Math.cos(angle) * 36;
        const y = 50 + Math.sin(angle) * 36;
        return (
          <Link
            key={a.area}
            href={`/orbit/${areaSlug(a.area)}`}
            aria-label={`${areaLabel(a.area)}: ${a.status}`}
            className="absolute flex w-[84px] -translate-x-1/2 -translate-y-[9px] flex-col items-center text-center"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span className={cn("h-[18px] w-[18px] rounded-full ring-4 ring-canvas", areaStyle(a.area).dot)} aria-hidden />
            <span className="mt-1 text-[13px] font-medium text-ink">{areaLabel(a.area)}</span>
            <span className="text-[11.5px] text-ink-3">{a.status}</span>
          </Link>
        );
      })}
    </div>
  );
}

function AddArea() {
  const { state, dispatch } = useOrbit();
  const { notify } = useUI();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  if (!adding) {
    return (
      <button type="button" onClick={() => setAdding(true)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] text-ink-3 hover:text-ink">
        <Plus size={16} aria-hidden /> Add an area
      </button>
    );
  }
  return (
    <form
      className="flex items-center gap-2 px-3 py-2.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        const area: Category = customArea(name);
        dispatch({ type: "SET_PROFILE", patch: { areas: [...state.profile.areas, area] } });
        notify(`Added “${name.trim()}” to your Orbit.`, { undoable: true });
        setName("");
        setAdding(false);
      }}
    >
      <label htmlFor="new-area" className="sr-only">New area</label>
      <input id="new-area" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Wedding, House renovation…" className="min-h-10 min-w-0 flex-1 rounded-xl bg-sunken px-3 text-[15px]" />
      <button type="submit" disabled={!name.trim()} className="min-h-10 rounded-xl bg-primary px-4 text-[14.5px] font-medium text-on-primary disabled:opacity-40">
        Add
      </button>
    </form>
  );
}

/** Your Orbit: every part of life in one calm list. The map is optional. */
export default function OrbitPage() {
  const { derived } = useOrbit();
  const { open } = useUI();
  const [view, setView] = useState<"overview" | "map">("overview");

  return (
    <div className="space-y-8">
      <header className="px-1 pt-2">
        <h1 className="text-[34px] leading-tight">Your Orbit</h1>
        <p className="mt-1 text-[16px] text-ink-2">Everything that matters, connected.</p>
        <div className="mt-4">
          <SegmentedControl<"overview" | "map">
            label="View"
            value={view}
            onChange={setView}
            options={[
              { value: "overview", label: "Overview" },
              { value: "map", label: "Orbit map" },
            ]}
          />
        </div>
      </header>

      {view === "overview" ? (
        <ul className="divide-y divide-line rounded-2xl bg-surface shadow-card" aria-label="Parts of life">
          {derived.areas.map((a) => (
            <li key={a.area}>
              <Link href={`/orbit/${areaSlug(a.area)}`} className="flex items-center gap-3 px-4 py-3.5">
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", areaStyle(a.area).dot)} aria-hidden />
                <span className="min-w-0 flex-1 text-[16px] font-medium">{areaLabel(a.area)}</span>
                <span className={cn("text-[14.5px]", a.hot ? "text-ink" : "text-ink-3")}>{a.status}</span>
                <ChevronRight size={16} className="text-ink-3" aria-hidden />
              </Link>
            </li>
          ))}
          <li>
            <AddArea />
          </li>
        </ul>
      ) : (
        <OrbitMap areas={derived.areas} />
      )}

      <section aria-labelledby="goals-h">
        <div className="mb-2 flex items-baseline justify-between px-1">
          <h2 id="goals-h" className="text-[15px] font-semibold text-ink-2">Goals</h2>
          <button type="button" onClick={() => open({ type: "newGoal" })} className="inline-flex items-center gap-1 text-[14px] font-medium text-accent">
            <Plus size={15} aria-hidden /> New goal
          </button>
        </div>
        {derived.goals.length ? (
          <div className="space-y-2.5">
            {derived.goals.map(({ goal, progress }) => (
              <GoalCard key={goal.id} goal={goal} progress={progress} showStep={false} />
            ))}
          </div>
        ) : (
          <button type="button" onClick={() => open({ type: "newGoal" })} className="w-full rounded-2xl bg-surface p-4 text-left text-[15px] text-ink-2 shadow-card">
            Set a goal — “Run a 5K next month” becomes small steps you can check off.
          </button>
        )}
      </section>

      <Link href="/loops" className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5 shadow-card">
        <span>
          <span className="block text-[16px] font-medium">Open loops</span>
          <span className="block text-[14px] text-ink-3">{derived.openLoops.length} things across your life</span>
        </span>
        <ChevronRight size={16} className="text-ink-3" aria-hidden />
      </Link>

      <KnowYouCard />
    </div>
  );
}
