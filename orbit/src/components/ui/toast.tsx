"use client";

import { useSyncExternalStore } from "react";
import { DoneCheck } from "./done-check";

/**
 * Quiet confirmations for finished actions ("Refund confirmed"). One at a time, announced
 * politely to screen readers, gone after a few seconds. Never used for promotions.
 */
type Toast = { id: number; title: string; body?: string };

let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function toast(title: string, body?: string) {
  current = { id: Date.now(), title, body };
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    current = null;
    emit();
  }, 3600);
  emit();
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function Toaster() {
  const t = useSyncExternalStore(subscribe, () => current, () => null);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 md:bottom-28">
      {t && (
        <div key={t.id} className="animate-toast pointer-events-auto absolute left-1/2 flex w-[min(92vw,420px)] items-center gap-3 rounded-[20px] bg-navy px-4 py-3 text-white shadow-[var(--shadow-lift)]">
          <DoneCheck className="size-8" onDark />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold">{t.title}</span>
            {t.body && <span className="block text-[14px] text-white/75">{t.body}</span>}
          </span>
        </div>
      )}
    </div>
  );
}
