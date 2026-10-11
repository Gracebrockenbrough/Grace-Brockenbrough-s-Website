"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Category } from "@/types";
import type { NoticedItem } from "@/services/attention";
import { cn } from "@/lib/cn";
import { areaLabel, areaStyle, BUILTIN_AREAS } from "@/lib/areas";
import { useOrbit } from "@/store/OrbitProvider";
import { usePlanBlock } from "@/store/useActions";
import { useUI } from "@/store/UIProvider";

const KIND_LABEL: Record<NoticedItem["kind"], string> = {
  change: "Changed",
  possible_change: "Might change",
  conflict: "Conflict",
  deadline: "Deadline",
  prep: "Coming up",
  missing_info: "Missing info",
  workload: "Busy week",
  reply: "Waiting on you",
  opening: "Open time",
};

function areaOf(item: NoticedItem): Category | undefined {
  const label = item.eyebrow?.split(" · ")[1];
  return BUILTIN_AREAS.find((a) => areaLabel(a) === label);
}

function useNoticedAction() {
  const { dispatch } = useOrbit();
  const { open } = useUI();
  const router = useRouter();
  const plan = usePlanBlock();
  return (item: NoticedItem) => {
    dispatch({ type: "SIGNAL", signal: { itemType: "today", action: "open", context: { area: "noticed", kind: item.kind } } });
    if (item.kind === "workload") {
      const date = item.id.split(":")[1] ?? "";
      router.push(`/calendar?view=week${date ? `&date=${date}` : ""}`);
      return;
    }
    const t = item.target;
    if (t.type === "plan") {
      plan({ title: t.title, date: t.date, start: t.start, end: t.end, category: "personal" });
      return;
    }
    open(t);
  };
}

/** One thing Orbit noticed: what happened, what it affects, and the next step. */
function NoticedRow({ item }: { item: NoticedItem }) {
  const act = useNoticedAction();
  const area = areaOf(item);
  const urgent = item.kind === "change" || item.kind === "conflict";
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[13px]">
          <span className={cn("h-2 w-2 shrink-0 rounded-full", area ? areaStyle(area).dot : "bg-ink-3")} aria-hidden />
          <span className={cn("font-medium", item.kind === "conflict" ? "text-critical" : urgent ? "text-attention" : "text-ink-3")}>{KIND_LABEL[item.kind]}</span>
        </p>
        <p className="mt-0.5 text-[16px] font-semibold leading-snug text-ink">{item.title}</p>
        {item.detail && <p className="text-[14px] leading-snug text-ink-2">{item.detail}</p>}
      </div>
      <button
        type="button"
        onClick={() => act(item)}
        className={cn("min-h-9 shrink-0 rounded-full px-4 text-[14px] font-medium", urgent ? "bg-primary text-on-primary hover:bg-primary-hover" : "bg-sunken text-ink hover:bg-line")}
      >
        {item.action}
      </button>
    </li>
  );
}

/** Everything that isn't a normal task, ranked. Shows a few; the rest is one tap away. */
export function Noticed({ items, limit }: { items: NoticedItem[]; limit: number }) {
  const { dispatch } = useOrbit();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, limit);
  const hidden = items.length - shown.length;

  if (!items.length) {
    return <p className="rounded-2xl bg-surface px-4 py-4 text-[15px] text-ink-2 shadow-card">Nothing unusual. Orbit will tell you if something changes.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface shadow-card">
        {shown.map((item) => (
          <NoticedRow key={item.id} item={item} />
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            dispatch({ type: "SIGNAL", signal: { itemType: "today", action: "expand", context: { area: "noticed" } } });
          }}
          className="mt-1.5 inline-flex min-h-9 items-center rounded-lg px-1 text-[14.5px] font-medium text-accent"
        >
          See everything ({hidden} more)
        </button>
      )}
    </div>
  );
}
