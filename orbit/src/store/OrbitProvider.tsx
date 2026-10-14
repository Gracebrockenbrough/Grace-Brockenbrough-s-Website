"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { computeDerived, type OrbitDerived } from "@/services/orbitEngine";
import { configureClock, now } from "@/lib/clock";
import { setDraftSigner } from "@/lib/drafts";
import { createLiveState, migrateState, type OrbitState } from "./state";
import type { Backend } from "./backend";

export type SyncStatus = "saved" | "saving" | "error";
import { orbitReducer, type OrbitAction } from "./reducer";


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
  // Passive signals and display tweaks aren't user edits, so they don't create an undo step.
  if (action.type === "SIGNAL" || action.type === "SET_DEMO_TIME") return { present: next, past: h.past };
  return { present: next, past: [h.present, ...h.past].slice(0, 20) };
}

interface OrbitContextValue {
  state: OrbitState;
  derived: OrbitDerived;
  dispatch: (action: OrbitAction) => void;
  undo: () => void;
  canUndo: boolean;
  hydrated: boolean;
  /** Whether the latest changes reached the backend. */
  sync: SyncStatus;
}

const OrbitContext = createContext<OrbitContextValue | null>(null);

/**
 * Holds one person's Orbit. Loads it from their backend (an account, or this
 * device), keeps it in memory with undo, and saves changes back a moment after
 * they happen — one write at a time.
 */
export function OrbitProvider({ backend, children }: { backend: Backend | null; children: ReactNode }) {
  const [history, dispatchHistory] = useReducer(historyReducer, undefined, () => ({ present: createLiveState(), past: [] }));
  const [hydrated, setHydrated] = useState(false);
  const [sync, setSync] = useState<SyncStatus>("saved");
  const loadedFor = useRef<Backend | null>(null);
  const pending = useRef<OrbitState | null>(null);
  const writing = useRef(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!backend) return;
    let cancelled = false;
    loadedFor.current = null;
    setHydrated(false);
    backend
      .load()
      .then((raw) => {
        if (cancelled) return;
        const saved = migrateState(raw);
        const account = backend.account;
        dispatchHistory({ type: "HYDRATE", state: saved ?? createLiveState(account.kind === "local" ? undefined : { name: account.name, email: account.email }) });
        loadedFor.current = backend;
        setHydrated(true);
      })
      .catch(() => {
        if (cancelled) return;
        setSync("error");
        dispatchHistory({ type: "HYDRATE", state: createLiveState({ name: backend.account.name, email: backend.account.email }) });
        setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [backend]);

  const flush = useCallback(async () => {
    const b = loadedFor.current;
    if (!b || writing.current || !pending.current) return;
    writing.current = true;
    const state = pending.current;
    pending.current = null;
    setSync("saving");
    try {
      await b.save(state);
      setSync(pending.current ? "saving" : "saved");
    } catch {
      setSync("error");
    } finally {
      writing.current = false;
      if (pending.current) void flush();
    }
  }, []);

  // Save a moment after each change; bursts of edits become one write.
  const first = useRef(true);
  useEffect(() => {
    if (!hydrated || !loadedFor.current) return;
    if (first.current) {
      first.current = false;
      return;
    }
    pending.current = history.present;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), 900);
  }, [history.present, hydrated, flush]);

  // Don't lose the last edit when the tab closes.
  useEffect(() => {
    const onHide = () => {
      if (pending.current) void flush();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [flush]);

  // Real accounts run on the real clock, so the screen refreshes every minute.
  const [tick, setTick] = useState(0);
  const live = history.present.mode === "live";
  useEffect(() => {
    if (!live) return;
    const t = window.setInterval(() => setTick((n) => n + 1), 60_000);
    return () => window.clearInterval(t);
  }, [live]);

  configureClock(live, history.present.demoTime);
  setDraftSigner(history.present.user.name, history.present.user.fullName);
  const dispatch = useCallback((action: OrbitAction) => dispatchHistory(action), []);
  const undo = useCallback(() => dispatchHistory({ type: "UNDO" }), []);
  const derived = useMemo(() => {
    configureClock(history.present.mode === "live", history.present.demoTime);
    return computeDerived(history.present, now());
    // `tick` re-runs this once a minute in live mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.present, tick]);

  const value = useMemo(
    () => ({ state: history.present, derived, dispatch, undo, canUndo: history.past.length > 0, hydrated, sync }),
    [history.present, history.past.length, derived, dispatch, undo, hydrated, sync],
  );

  return <OrbitContext.Provider value={value}>{children}</OrbitContext.Provider>;
}

export function useOrbit(): OrbitContextValue {
  const ctx = useContext(OrbitContext);
  if (!ctx) throw new Error("useOrbit must be used inside <OrbitProvider>");
  return ctx;
}
