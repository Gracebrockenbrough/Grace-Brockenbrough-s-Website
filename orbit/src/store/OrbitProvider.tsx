"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { computeDerived, type OrbitDerived } from "@/services/orbitEngine";
import { demoNow } from "@/data/demoClock";
import { createInitialState, STATE_VERSION, type OrbitState } from "./state";
import { orbitReducer, type OrbitAction } from "./reducer";

const STORAGE_KEY = "orbit:state";

interface History {
  present: OrbitState;
  past: OrbitState[];
}

type HistoryAction = OrbitAction | { type: "UNDO" };

function historyReducer(h: History, action: HistoryAction): History {
  if (action.type === "UNDO") {
    const [previous, ...rest] = h.past;
    return previous ? { present: previous, past: rest } : h;
  }
  if (action.type === "HYDRATE") return { present: action.state, past: [] };
  const next = orbitReducer(h.present, action);
  if (next === h.present) return h;
  return { present: next, past: [h.present, ...h.past].slice(0, 20) };
}

interface OrbitContextValue {
  state: OrbitState;
  derived: OrbitDerived;
  dispatch: (action: OrbitAction) => void;
  undo: () => void;
  canUndo: boolean;
  hydrated: boolean;
}

const OrbitContext = createContext<OrbitContextValue | null>(null);

function loadState(): OrbitState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OrbitState;
    return parsed.version === STATE_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function OrbitProvider({ children }: { children: ReactNode }) {
  const [history, dispatchHistory] = useReducer(historyReducer, undefined, () => ({ present: createInitialState(), past: [] }));
  const [hydrated, setHydrated] = useState(false);
  const skipSave = useRef(true);

  useEffect(() => {
    const saved = loadState();
    if (saved) dispatchHistory({ type: "HYDRATE", state: saved });
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(history.present));
    } catch {
      // Storage can be unavailable (private mode); the prototype still works in memory.
    }
  }, [history.present, hydrated]);

  const dispatch = useCallback((action: OrbitAction) => dispatchHistory(action), []);
  const undo = useCallback(() => dispatchHistory({ type: "UNDO" }), []);
  const derived = useMemo(() => computeDerived(history.present, demoNow()), [history.present]);

  const value = useMemo(
    () => ({ state: history.present, derived, dispatch, undo, canUndo: history.past.length > 0, hydrated }),
    [history.present, history.past.length, derived, dispatch, undo, hydrated],
  );

  return <OrbitContext.Provider value={value}>{children}</OrbitContext.Provider>;
}

export function useOrbit(): OrbitContextValue {
  const ctx = useContext(OrbitContext);
  if (!ctx) throw new Error("useOrbit must be used inside <OrbitProvider>");
  return ctx;
}
