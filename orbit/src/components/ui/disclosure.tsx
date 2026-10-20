"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "./cn";

/** Collapsed section for secondary details (progressive disclosure). */
export function Disclosure({ title, summary, children, defaultOpen = false, icon }: { title: string; summary?: ReactNode; children: ReactNode; defaultOpen?: boolean; icon?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left"
      >
        {icon && <span className="text-muted">{icon}</span>}
        <span className="flex-1">
          <span className="block text-[16px] font-semibold">{title}</span>
          {summary && !open && <span className="mt-0.5 block text-[14px] text-muted">{summary}</span>}
        </span>
        <ChevronDown aria-hidden className={cn("size-5 text-muted transition-transform", open && "rotate-180")} />
      </button>
      <div id={id} hidden={!open} className="px-4 pb-4">
        {children}
      </div>
    </div>
  );
}
