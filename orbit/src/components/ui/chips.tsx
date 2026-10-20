"use client";

import { cn } from "./cn";

/** Single-select filter chips. */
export function FilterChips<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string; count?: number }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[15px] font-semibold transition-colors",
              active ? "border-navy bg-navy text-white" : "border-line bg-card text-navy hover:bg-ivory-deep",
            )}
          >
            {o.label}
            {o.count != null && o.count > 0 && <span className={cn("tabular text-[13px]", active ? "text-white/70" : "text-muted")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
