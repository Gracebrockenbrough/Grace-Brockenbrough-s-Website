"use client";

import { ChevronDown } from "lucide-react";
import { Children, useState, type ReactNode } from "react";

/** Shows the first `limit` children and folds the rest behind "Show N more". */
export function MoreList({ children, limit = 4, className = "space-y-2" }: { children: ReactNode; limit?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const all = Children.toArray(children);
  const shown = open ? all : all.slice(0, limit);
  return (
    <div className={className}>
      {shown}
      {all.length > limit && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-h-11 w-full items-center justify-center gap-1 rounded-2xl text-[15px] font-semibold text-navy hover:bg-ivory-deep"
        >
          {open ? "Show less" : `Show ${all.length - limit} more`}
          <ChevronDown aria-hidden className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}
