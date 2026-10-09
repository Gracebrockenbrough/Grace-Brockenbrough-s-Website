"use client";

import { useId, useState } from "react";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Optional, short explanation of why ORBIT surfaced something. Hidden by
 * default so the interface stays calm.
 */
export function WhyThisPopover({ why, className }: { why: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={cn("text-[13.5px]", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex min-h-8 items-center gap-1 rounded-lg px-1 font-medium text-ink-3 hover:text-accent"
      >
        <HelpCircle size={14} aria-hidden />
        Why this?
      </button>
      {open && (
        <p id={id} className="mt-1 animate-rise-in rounded-xl bg-accent-soft px-3 py-2 text-[14px] leading-relaxed text-ink" role="note">
          {why}
        </p>
      )}
    </div>
  );
}

/** Split version for tight action rows: the toggle sits inline, the text renders wherever the parent puts it. */
export function WhyThisToggle({ open, onToggle, controls }: { open: boolean; onToggle: () => void; controls: string }) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 text-[14px] font-medium text-ink-3 hover:text-accent"
    >
      <HelpCircle size={14} aria-hidden />
      Why this?
    </button>
  );
}

export function WhyThisText({ id, why, className }: { id: string; why: string; className?: string }) {
  return (
    <p id={id} role="note" className={cn("animate-rise-in rounded-xl bg-accent-soft px-3 py-2 text-[14px] leading-relaxed text-ink", className)}>
      {why}
    </p>
  );
}
