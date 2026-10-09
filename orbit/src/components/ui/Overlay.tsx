"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

function useDialogBehavior(onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>("button, [href], input, textarea, select");
    first?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
      }
      if (e.key === "Tab" && panel) {
        // Keep focus inside the dialog.
        const focusables = Array.from(panel.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'));
        if (!focusables.length) return;
        const firstEl = focusables[0];
        const lastEl = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, []);

  return panelRef;
}

interface DialogProps {
  title: string;
  /** Hide the visual title but keep it for screen readers. */
  hideTitle?: boolean;
  eyebrow?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/** Side drawer on desktop, bottom sheet on mobile. Used for details. */
export function Drawer({ title, hideTitle, eyebrow, onClose, children, footer, className }: DialogProps) {
  const panelRef = useDialogBehavior(onClose);
  const titleId = useId();
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 animate-fade-in bg-ink/25" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "absolute flex flex-col bg-surface shadow-raised",
          "inset-x-0 bottom-0 max-h-[88vh] animate-sheet-in rounded-t-3xl",
          "md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[440px] md:animate-drawer-in md:rounded-none md:rounded-l-3xl",
          className,
        )}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong md:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3 px-6 pb-2 pt-4 md:pt-6">
          <div className="min-w-0">
            {eyebrow && <div className="mb-1">{eyebrow}</div>}
            <h2 id={titleId} className={cn("text-[22px] font-semibold leading-snug tracking-tight", hideTitle && "sr-only")}>
              {title}
            </h2>
          </div>
          <button onClick={onClose} className="-mr-2 rounded-full p-2 text-ink-3 hover:bg-sunken hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</div>
        {footer && <div className="border-t border-line px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

/** Centered dialog for decisions (changes, conflicts, capture, brief). */
export function Modal({ title, hideTitle, eyebrow, onClose, children, footer, className }: DialogProps) {
  const panelRef = useDialogBehavior(onClose);
  const titleId = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
      <div className="absolute inset-0 animate-fade-in bg-ink/30" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cn(
          "relative flex max-h-[92vh] w-full animate-sheet-in flex-col rounded-t-3xl bg-surface shadow-raised md:max-w-lg md:rounded-3xl",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 px-6 pb-2 pt-6">
          <div className="min-w-0">
            {eyebrow && <div className="mb-1">{eyebrow}</div>}
            <h2 id={titleId} className={cn("text-[22px] font-semibold leading-snug tracking-tight", hideTitle && "sr-only")}>
              {title}
            </h2>
          </div>
          <button onClick={onClose} className="-mr-2 rounded-full p-2 text-ink-3 hover:bg-sunken hover:text-ink" aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-6">{children}</div>
        {footer && <div className="border-t border-line px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-4 border-b border-line py-3 last:border-b-0">
      <dt className="w-28 shrink-0 text-[14px] text-ink-3">{label}</dt>
      <dd className="min-w-0 flex-1 text-[15px] text-ink">{children}</dd>
    </div>
  );
}
