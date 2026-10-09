"use client";

import { useState } from "react";
import { AlertTriangle, ArrowRight, CalendarClock, CalendarX2, FileQuestion, GitCompareArrows, Layers, NotebookPen } from "lucide-react";
import type { AttentionItem, AttentionKind } from "@/types";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Menu } from "@/components/ui/Menu";
import { WhyThisPopover } from "@/components/ui/WhyThisPopover";
import { Button } from "@/components/ui/Button";

const KIND_META: Record<AttentionKind, { icon: typeof AlertTriangle; tone: string; primary: string }> = {
  change: { icon: GitCompareArrows, tone: "bg-attention-soft text-attention", primary: "Review change" },
  possible_change: { icon: GitCompareArrows, tone: "bg-sunken text-ink-2", primary: "Review" },
  conflict: { icon: CalendarX2, tone: "bg-attention-soft text-attention", primary: "Review options" },
  deadline: { icon: CalendarClock, tone: "bg-sunken text-ink-2", primary: "Open" },
  prep: { icon: NotebookPen, tone: "bg-accent-soft text-accent", primary: "Find time" },
  missing_info: { icon: FileQuestion, tone: "bg-sunken text-ink-2", primary: "Add date" },
  workload: { icon: Layers, tone: "bg-sunken text-ink-2", primary: "See week" },
};

export function NeedsAttentionCard({ item }: { item: AttentionItem }) {
  const { dispatch } = useOrbit();
  const { open, notify } = useUI();
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;

  const primary = () => {
    if (item.kind === "change" || item.kind === "possible_change") open({ type: "change", id: item.refId });
    else if (item.kind === "conflict") open({ type: "conflict", id: item.refId });
    else if (item.kind === "deadline") open({ type: "loop", id: item.refId });
    else open({ type: "attention", id: item.id });
  };

  const dismiss = () => {
    dispatch({ type: "DISMISS", id: item.id });
    notify("Dismissed.", { undoable: true });
  };

  return (
    <li className="animate-rise-in rounded-2xl border border-line bg-surface p-4 shadow-card md:p-5">
      <div className="flex items-start gap-3.5">
        <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", meta.tone)} aria-hidden>
          <Icon size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-ink-3">{item.label}</p>
          <p className="mt-0.5 text-[16px] font-semibold leading-snug text-ink">{item.title}</p>
          {item.body && <p className="mt-1 text-[14.5px] text-ink-2">{item.body}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant={item.kind === "change" || item.kind === "conflict" ? "primary" : "secondary"} onClick={primary}>
              {meta.primary}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              {item.kind === "possible_change" ? "Ignore" : "Dismiss"}
            </Button>
          </div>
          <WhyThisPopover why={item.why} className="mt-1" />
        </div>
        <Menu
          label={`More options for ${item.label}`}
          items={[
            {
              label: "Less like this",
              onSelect: () => {
                dispatch({ type: "ADJUST_RECOMMENDATION", key: `attention:${item.kind}`, delta: -20 });
                dispatch({ type: "DISMISS", id: item.id });
                notify("Got it. ORBIT will show fewer alerts like this.", { undoable: true });
              },
            },
            {
              label: "More like this",
              onSelect: () => {
                dispatch({ type: "ADJUST_RECOMMENDATION", key: `attention:${item.kind}`, delta: 15 });
                notify("Got it. ORBIT will flag more things like this.", { undoable: true });
              },
            },
          ]}
        />
      </div>
    </li>
  );
}

/** Exceptions only. Shows the most important few, with the rest one tap away. */
export function NeedsAttention({ items, limit = 3 }: { items: AttentionItem[]; limit?: number }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? items : items.slice(0, limit);
  const hidden = items.length - shown.length;
  return (
    <>
      <ul className="space-y-3">
        {shown.map((item) => (
          <NeedsAttentionCard key={item.id} item={item} />
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-xl px-2 text-[14.5px] font-medium text-ink-2 hover:text-ink"
        >
          Show {hidden} smaller {hidden === 1 ? "thing" : "things"}
          <ArrowRight size={15} aria-hidden />
        </button>
      )}
    </>
  );
}
