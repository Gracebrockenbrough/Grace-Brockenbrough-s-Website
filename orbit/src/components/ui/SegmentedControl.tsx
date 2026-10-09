"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  return (
    <div role="tablist" aria-label={label} className={cn("inline-flex rounded-xl bg-sunken p-1", className)}>
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              e.preventDefault();
              const next = (i + (e.key === "ArrowRight" ? 1 : -1) + options.length) % options.length;
              onChange(options[next].value);
              refs.current[next]?.focus();
            }}
            className={cn(
              "min-h-9 rounded-lg px-3.5 text-[14.5px] font-medium transition-colors",
              selected ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:text-ink",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className={cn("ml-1.5", selected ? "text-ink-3" : "text-ink-3")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Lightweight filter chips (not tabs) — for Open Loops filters. */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-9 shrink-0 rounded-full border px-3.5 text-[14.5px] font-medium transition-colors",
              selected ? "border-ink bg-ink text-white" : "border-line-strong bg-surface text-ink-2 hover:text-ink",
            )}
          >
            {o.label}
            {o.count !== undefined && <span className={cn("ml-1.5", selected ? "text-white/70" : "text-ink-3")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
