"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock, CalendarX2, FileQuestion, GitCompareArrows, Layers, MessageCircle, NotebookPen } from "lucide-react";
import type { NoticedItem } from "@/services/attention";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";

const ICON: Record<NoticedItem["kind"], typeof GitCompareArrows> = {
  change: GitCompareArrows,
  possible_change: GitCompareArrows,
  conflict: CalendarX2,
  deadline: CalendarClock,
  prep: NotebookPen,
  missing_info: FileQuestion,
  workload: Layers,
  reply: MessageCircle,
};

function useNoticedAction() {
  const { dispatch } = useOrbit();
  const { open } = useUI();
  const router = useRouter();
  return (item: NoticedItem) => {
    dispatch({ type: "SIGNAL", signal: { itemType: "today", action: "open", context: { area: "noticed", kind: item.kind } } });
    if (item.kind === "workload") {
      const date = item.id.split(":")[1] ?? "";
      router.push(`/calendar?view=week${date ? `&date=${date}` : ""}`);
      return;
    }
    open(item.target);
  };
}

/** The one card-worthy item: something changed or collides. */
function NoticedCard({ item }: { item: NoticedItem }) {
  const act = useNoticedAction();
  const Icon = ICON[item.kind];
  const tone = item.kind === "conflict" ? "border-critical/20 bg-critical-soft/60" : "border-attention-line bg-attention-soft/70";
  return (
    <li className={cn("flex items-center gap-3.5 rounded-2xl border p-4", tone)}>
      <Icon size={20} className={item.kind === "conflict" ? "shrink-0 text-critical" : "shrink-0 text-attention"} aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold text-ink">{item.title}</p>
        <p className="truncate text-[14.5px] text-ink-2">{item.detail}</p>
      </div>
      <button type="button" onClick={() => act(item)} className="min-h-10 shrink-0 rounded-xl bg-ink px-4 text-[14.5px] font-medium text-white hover:bg-ink/85">
        {item.action}
      </button>
    </li>
  );
}

function NoticedRow({ item }: { item: NoticedItem }) {
  const act = useNoticedAction();
  return (
    <li>
      <button type="button" onClick={() => act(item)} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15.5px] font-medium text-ink">{item.title}</span>
          {item.detail && <span className="block truncate text-[14px] text-ink-3">{item.detail}</span>}
        </span>
        <span className="shrink-0 rounded-lg px-2 py-1 text-[14px] font-semibold text-accent group-hover:bg-accent-soft">{item.action}</span>
      </button>
    </li>
  );
}

/** Everything that isn't a normal task, ranked by ORBIT. Shows a few; the rest is one tap away. */
export function Noticed({ items, limit }: { items: NoticedItem[]; limit: number }) {
  const { dispatch } = useOrbit();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, limit);
  const hidden = items.length - shown.length;

  if (!items.length) {
    return <p className="rounded-2xl border border-dashed border-line-strong px-4 py-4 text-[15px] text-ink-2">Nothing unusual. ORBIT will tell you if something changes.</p>;
  }

  return (
    <div>
      <ul className="space-y-1.5">
        {shown.map((item) => (item.prominent ? <NoticedCard key={item.id} item={item} /> : <NoticedRow key={item.id} item={item} />))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => {
            setExpanded(true);
            dispatch({ type: "SIGNAL", signal: { itemType: "today", action: "expand", context: { area: "noticed" } } });
          }}
          className="mt-1 inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[14.5px] font-medium text-ink-2 hover:text-ink"
        >
          See {hidden} more <ArrowRight size={15} aria-hidden />
        </button>
      )}
    </div>
  );
}
