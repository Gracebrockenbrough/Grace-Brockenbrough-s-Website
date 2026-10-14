"use client";

import type { ReactNode } from "react";
import type { SessionDriver } from "@/store/backend";
import { SessionProvider, useSession } from "@/store/SessionProvider";
import { OrbitProvider } from "@/store/OrbitProvider";
import { UIProvider } from "@/store/UIProvider";
import { DeviceFrame } from "./DeviceFrame";
import { AuthScreen } from "./AuthScreen";
import { OrbitMark } from "./Logo";

function Gate({ children }: { children: ReactNode }) {
  const session = useSession();
  return (
    // A new account gets a fresh provider, so nobody ever sees someone else's data.
    <OrbitProvider key={session.account ? `${session.account.kind}:${session.account.id}` : "none"} backend={session.backend}>
      <UIProvider>
        <DeviceFrame>
          {session.status === "signedOut" ? (
            <AuthScreen />
          ) : session.status === "loading" ? (
            <div className="flex min-h-[var(--app-h)] items-center justify-center" aria-busy="true">
              <OrbitMark size={36} spinning className="text-ink" />
              <span className="sr-only">Loading Orbit</span>
            </div>
          ) : (
            children
          )}
        </DeviceFrame>
      </UIProvider>
    </OrbitProvider>
  );
}

/** Session → one person's Orbit → UI → phone frame. */
export function AppRoot({ driver, children }: { driver: SessionDriver; children: ReactNode }) {
  return (
    <SessionProvider driver={driver}>
      <Gate>{children}</Gate>
    </SessionProvider>
  );
}
