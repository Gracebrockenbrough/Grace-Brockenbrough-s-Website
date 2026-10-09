"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

/** Overlays open as drawers/modals on top of the current page, keeping navigation fast. */
export type Overlay =
  | { type: "loop"; id: string }
  | { type: "event"; id: string }
  | { type: "message"; id: string }
  | { type: "change"; id: string }
  | { type: "conflict"; id: string }
  | { type: "attention"; id: string }
  | { type: "capture"; initialMode?: "type" | "speak" | "photo" | "screenshot" | "file" }
  | { type: "brief" }
  | { type: "connect"; id: string }
  | { type: "connection"; id: string };

export interface Toast {
  id: number;
  message: string;
  undoable?: boolean;
  action?: { label: string; onClick: () => void };
}

interface UIContextValue {
  overlay: Overlay | null;
  open: (overlay: Overlay) => void;
  close: () => void;
  toasts: Toast[];
  notify: (message: string, opts?: { undoable?: boolean; action?: Toast["action"] }) => void;
  dismissToast: (id: number) => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [overlay, setOverlay] = useState<Overlay | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const notify = useCallback<UIContextValue["notify"]>(
    (message, opts) => {
      const id = nextId.current++;
      // One toast at a time keeps things calm.
      setToasts([{ id, message, ...opts }]);
      window.setTimeout(() => dismissToast(id), 5000);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({ overlay, open: setOverlay, close: () => setOverlay(null), toasts, notify, dismissToast }),
    [overlay, toasts, notify, dismissToast],
  );
  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside <UIProvider>");
  return ctx;
}
