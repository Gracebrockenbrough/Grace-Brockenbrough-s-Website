"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Account, AIProvider, AuthApi, Backend, SessionDriver } from "./backend";

export interface SessionValue {
  status: "loading" | "signedOut" | "ready";
  account: Account | null;
  backend: Backend | null;
  auth?: AuthApi;
  ai: AIProvider | null;
  storageLabel: string;
}

const SessionContext = createContext<SessionValue | null>(null);

/** Knows who is signed in and where their data lives. One driver per environment. */
export function SessionProvider({ driver, children }: { driver: SessionDriver; children: ReactNode }) {
  const [account, setAccount] = useState<Account | null | undefined>(undefined);
  const [ai, setAI] = useState<AIProvider | null>(null);

  useEffect(() => driver.start((a) => setAccount(a)), [driver]);
  useEffect(() => {
    if (!account || !driver.ai) return;
    let live = true;
    driver.ai().then((p) => live && setAI(p)).catch(() => undefined);
    return () => {
      live = false;
    };
  }, [account, driver]);

  const value = useMemo<SessionValue>(
    () => ({
      status: account === undefined ? "loading" : account ? "ready" : "signedOut",
      account: account ?? null,
      backend: account ? driver.backendFor(account) : null,
      auth: driver.auth,
      ai,
      storageLabel: driver.storageLabel,
    }),
    [account, ai, driver],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
