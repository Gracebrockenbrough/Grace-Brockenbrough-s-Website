"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/cn";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  tone?: "default" | "danger";
  /** Optional heading rendered above this item. */
  section?: string;
}

/** Accessible overflow menu (keyboard: arrows, Enter, Escape). */
export function Menu({ items, label = "More options", trigger, align = "right" }: { items: MenuItem[]; label?: string; trigger?: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const idx = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      itemRefs.current[(idx + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      itemRefs.current[(idx - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-xl text-ink-3 hover:bg-sunken hover:text-ink"
      >
        {trigger ?? <MoreHorizontal size={18} />}
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          onKeyDown={onKeyDown}
          className={cn(
            "absolute z-40 mt-1 w-60 animate-rise-in overflow-hidden rounded-2xl border border-line bg-surface py-1.5 shadow-raised",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) => (
            <div key={item.label}>
              {item.section && <div className="px-4 pb-1 pt-2 text-[12.5px] font-medium uppercase tracking-wide text-ink-3">{item.section}</div>}
              <button
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                role="menuitem"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[15px] hover:bg-sunken focus:bg-sunken focus:outline-none",
                  item.tone === "danger" ? "text-critical" : "text-ink",
                )}
              >
                {item.icon && <span className="text-ink-3">{item.icon}</span>}
                {item.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
