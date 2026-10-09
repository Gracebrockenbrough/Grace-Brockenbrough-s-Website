"use client";

import { useUI } from "@/store/UIProvider";
import { useOrbit } from "@/store/OrbitProvider";
import { X } from "lucide-react";

/** Calm confirmations with Undo, so every correction is reversible. */
export function Toaster() {
  const { toasts, dismissToast } = useUI();
  const { undo } = useOrbit();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-6">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex max-w-md animate-rise-in items-center gap-3 rounded-2xl bg-ink px-4 py-3 text-[14.5px] text-white shadow-raised">
          <span className="flex-1">{t.message}</span>
          {t.undoable && (
            <button
              type="button"
              className="rounded-lg px-2 py-1 font-semibold text-[#c9cffa] hover:bg-white/10"
              onClick={() => {
                undo();
                dismissToast(t.id);
              }}
            >
              Undo
            </button>
          )}
          {t.action && (
            <button
              type="button"
              className="rounded-lg px-2 py-1 font-semibold text-[#c9cffa] hover:bg-white/10"
              onClick={() => {
                t.action!.onClick();
                dismissToast(t.id);
              }}
            >
              {t.action.label}
            </button>
          )}
          <button type="button" aria-label="Dismiss" className="rounded-lg p-1 text-white/60 hover:text-white" onClick={() => dismissToast(t.id)}>
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
