"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/domain/dates";
import type { DateOnly } from "@/lib/domain/types";
import type { Milestone } from "@/lib/intelligence/journey";
import { cn } from "../ui/cn";

/**
 * Compact order journey. Solid dots are recorded facts, dashed rings are estimates,
 * hollow dots are still to come. Tap a step to see how Tote knows it.
 */
export function Journey({ steps, today }: { steps: Milestone[]; today: DateOnly }) {
  const [open, setOpen] = useState<string | null>(null);
  const lastDone = steps.map((s) => s.state).lastIndexOf("done");
  return (
    <ol aria-label="Order journey">
      {steps.map((s, i) => {
        const isOpen = open === s.key;
        const next = i === lastDone + 1;
        return (
          <li key={s.key} className="relative pl-8">
            {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-[10px] top-[22px] h-[calc(100%-6px)] w-0.5", i < lastDone ? "bg-navy" : "bg-line")} />}
            <span
              aria-hidden
              className={cn(
                "absolute left-0 top-[9px] flex size-[22px] items-center justify-center rounded-full",
                s.state === "done" ? "bg-navy text-white" : s.state === "estimated" ? "border-2 border-dashed border-navy/50 bg-card" : "border-2 border-line bg-card",
                next && s.state !== "done" && "ring-4 ring-progress-soft",
              )}
            >
              {s.state === "done" && <Check className="size-3" strokeWidth={3} />}
            </span>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : s.key)} className="flex min-h-11 w-full items-center gap-2 py-1.5 text-left">
              <span className={cn("flex-1 text-[15px]", s.state === "done" ? "font-semibold" : next ? "font-semibold" : "text-muted")}>
                {s.label}
                <span className="sr-only">{s.state === "done" ? " (done)" : s.state === "estimated" ? " (estimated)" : " (not yet)"}</span>
              </span>
              <span className={cn("tabular shrink-0 text-[14px]", s.state === "done" ? "text-navy" : "text-muted")}>
                {s.date ? formatDate(s.date, today) : s.state === "done" ? "" : "—"}
                {s.state === "estimated" && s.date ? " · est." : ""}
              </span>
            </button>
            {isOpen && (
              <div className="animate-in -mt-1 mb-2 rounded-xl bg-ivory-deep px-3 py-2 text-[14px]">
                <p className="text-muted">{s.source}</p>
                {s.href && (
                  <Link href={s.href} className="mt-1 inline-flex min-h-9 items-center gap-0.5 font-semibold">
                    Open <ChevronRight aria-hidden className="size-4" />
                  </Link>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
