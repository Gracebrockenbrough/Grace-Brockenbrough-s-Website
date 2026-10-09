"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown } from "lucide-react";
import type { LoopStatus, RankedLoop } from "@/types";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { EmptyState, PageHeader } from "@/components/ui/Card";
import { FilterChips } from "@/components/ui/SegmentedControl";
import { OpenLoopCard } from "@/components/loops/OpenLoopCard";
import { Button } from "@/components/ui/Button";

type Filter = "all" | "school" | "work" | "personal" | "waiting";
type Sort = "recommended" | "due" | "category" | "recent";

const GROUPS: { status: LoopStatus; title: string; hint: string }[] = [
  { status: "now", title: "Now", hint: "Needs attention very soon" },
  { status: "soon", title: "Soon", hint: "Important, not immediate" },
  { status: "later", title: "Later", hint: "Not urgent" },
  { status: "waiting", title: "Waiting", hint: "On someone else" },
];

function sortLoops(loops: RankedLoop[], sort: Sort): RankedLoop[] {
  const copy = [...loops];
  switch (sort) {
    case "due":
      return copy.sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
    case "category":
      return copy.sort((a, b) => a.category.localeCompare(b.category) || b.priorityScore - a.priorityScore);
    case "recent":
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    default:
      return copy.sort((a, b) => b.priorityScore - a.priorityScore);
  }
}

export default function LoopsPage() {
  const { derived } = useOrbit();
  const { open } = useUI();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recommended");
  const [showDone, setShowDone] = useState(false);

  const matches = (l: RankedLoop) => (filter === "all" ? true : filter === "waiting" ? l.status === "waiting" : l.category === filter);
  const open_ = sortLoops(derived.openLoops.filter(matches), sort);
  const done = derived.loops.filter((l) => l.status === "done" && matches(l));

  const count = (f: Filter) => derived.openLoops.filter((l) => (f === "all" ? true : f === "waiting" ? l.status === "waiting" : l.category === f)).length;

  return (
    <div>
      <PageHeader
        title="Open Loops"
        subtitle="Everything that still needs your attention. ORBIT sorts it for you."
        action={
          <Button variant="secondary" onClick={() => open({ type: "capture" })}>
            Add something
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <FilterChips<Filter>
          label="Filter open loops"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: count("all") },
            { value: "school", label: "School", count: count("school") },
            { value: "work", label: "Work", count: count("work") },
            { value: "personal", label: "Personal", count: count("personal") },
            { value: "waiting", label: "Waiting", count: count("waiting") },
          ]}
        />
        <label className="flex items-center gap-2 text-[14.5px] text-ink-2">
          Sort
          <span className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="min-h-9 appearance-none rounded-xl border border-line-strong bg-surface py-1 pl-3 pr-8 text-[14.5px] font-medium text-ink"
            >
              <option value="recommended">Recommended</option>
              <option value="due">Due date</option>
              <option value="category">Category</option>
              <option value="recent">Recently added</option>
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3" aria-hidden />
          </span>
        </label>
      </div>

      {open_.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={28} />}
          title="You're caught up."
          body={filter === "all" ? "Nothing needs your attention right now." : "Nothing here right now. Try another filter."}
        />
      ) : sort === "recommended" ? (
        <div className="space-y-8">
          {GROUPS.map((g) => {
            const items = open_.filter((l) => l.status === g.status);
            if (!items.length) return null;
            return (
              <section key={g.status} aria-labelledby={`group-${g.status}`}>
                <div className="mb-3 flex items-baseline gap-3">
                  <h2 id={`group-${g.status}`} className="text-[19px] font-semibold">
                    {g.title}
                    <span className="ml-2 text-[15px] font-normal text-ink-3">{items.length}</span>
                  </h2>
                  <p className="text-[14px] text-ink-3">{g.hint}</p>
                </div>
                <ul className="space-y-2.5">
                  {items.map((l) => (
                    <OpenLoopCard key={l.id} loop={l} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <ul className="space-y-2.5">
          {open_.map((l) => (
            <OpenLoopCard key={l.id} loop={l} />
          ))}
        </ul>
      )}

      {done.length > 0 && (
        <section className="mt-10" aria-labelledby="group-done">
          <button
            type="button"
            aria-expanded={showDone}
            onClick={() => setShowDone((v) => !v)}
            className="flex min-h-10 items-center gap-2 rounded-xl text-[17px] font-semibold text-ink-2 hover:text-ink"
            id="group-done"
          >
            <ChevronDown size={18} className={showDone ? "" : "-rotate-90"} aria-hidden />
            Done <span className="font-normal text-ink-3">{done.length}</span>
          </button>
          {showDone && (
            <ul className="mt-3 space-y-2.5">
              {done.map((l) => (
                <OpenLoopCard key={l.id} loop={l} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
