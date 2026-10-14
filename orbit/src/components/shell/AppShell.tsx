"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Plus } from "lucide-react";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { useSession } from "@/store/SessionProvider";
import { cn } from "@/lib/cn";
import { Logo, OrbitMark } from "./Logo";
import { NAV_ITEMS } from "./nav";
import { OverlayHost } from "@/components/overlays/OverlayHost";
import { Toaster } from "@/components/ui/Toaster";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { state, derived, hydrated, dispatch, sync } = useOrbit();
  const session = useSession();
  const { open, overlay } = useUI();

  // First-time users start with onboarding.
  useEffect(() => {
    if (hydrated && !state.onboarded) router.replace("/onboarding");
  }, [hydrated, state.onboarded, router]);

  // The Morning Brief appears the first time Orbit is opened in the morning (once a day for real accounts).
  useEffect(() => {
    if (!hydrated || !state.onboarded || !state.notificationSettings.morningBrief || pathname !== "/today" || overlay) return;
    const due =
      state.mode === "live"
        ? state.briefSeenOn !== derived.today && derived.now.getHours() < 12 && (derived.priorities.length > 0 || derived.todayItems.length > 0)
        : !state.briefSeen;
    if (due) open({ type: "brief" });
    // Only on arrival — not every time an overlay closes.
  }, [hydrated, state.onboarded, pathname]);

  // Quick capture: ⌘K / Ctrl+K anywhere, or "c" when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.closest("input, textarea, select, [contenteditable=true]");
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        open({ type: "capture" });
      } else if (!typing && !e.metaKey && !e.ctrlKey && !e.altKey && e.key === "c" && !overlay) {
        e.preventDefault();
        open({ type: "capture" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, overlay]);

  if (!hydrated || !state.onboarded) {
    return (
      <div className="flex min-h-[var(--app-h)] items-center justify-center text-ink-3" aria-busy="true">
        <OrbitMark size={36} spinning className="text-ink" />
        <span className="sr-only">Loading Orbit</span>
      </div>
    );
  }

  const tabs = [NAV_ITEMS[0], NAV_ITEMS[1], null, NAV_ITEMS[2], NAV_ITEMS[3]];

  return (
    <div className="mx-auto min-h-[var(--app-h)] max-w-[560px]">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:shadow-raised">
        Skip to content
      </a>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-canvas/85 px-5 py-2.5 backdrop-blur-lg">
        <Link href="/today" aria-label="Orbit home">
          <Logo />
        </Link>
        <Link
          href="/settings"
          aria-label="Profile and settings"
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-sunken text-[14px] font-semibold text-ink-2"
        >
          {state.user.name?.[0]?.toUpperCase() || "•"}
        </Link>
      </header>

      {sync === "error" && (
        <div role="alert" className="mx-5 mt-1 rounded-xl bg-critical-soft px-3.5 py-2 text-[13.5px] text-critical">
          Orbit couldn&apos;t save your latest changes.{" "}
          {session.account?.kind === "claude"
            ? "If someone shared Orbit with you, ask them for edit access. Your changes stay on this screen until then."
            : "Check your connection. Orbit will try again with your next change."}
        </div>
      )}

      {state.mode === "demo" && (
        <div className="mx-5 mt-1 flex items-center justify-between gap-3 rounded-xl bg-accent-soft px-3.5 py-2 text-[13.5px] text-accent-strong">
          <span>You&apos;re looking at sample data.</span>
          <button
            type="button"
            className="shrink-0 font-semibold underline-offset-2 hover:underline"
            onClick={() => {
              const a = session.account;
              dispatch({ type: "START_LIVE", account: a && a.kind !== "local" ? { name: a.name, email: a.email } : undefined });
              router.push("/onboarding");
            }}
          >
            Start my own
          </button>
        </div>
      )}

      <main id="main" className="px-5 pb-32 pt-3">{children}</main>

      {/* Today · Orbit · Add · Calendar · Ask */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/92 pb-[max(env(safe-area-inset-bottom),0px)] backdrop-blur-lg lg:pb-5">
        <ul className="mx-auto grid max-w-[560px] grid-cols-5 items-center">
          {tabs.map((item) => {
            if (!item) {
              return (
                <li key="add" className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => open({ type: "capture" })}
                    aria-label="Add anything"
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-raised transition-transform active:scale-95"
                  >
                    <Plus size={24} aria-hidden />
                  </button>
                </li>
              );
            }
            const { href, short, icon: Icon } = item;
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[11.5px] font-medium", active ? "text-ink" : "text-ink-3")}
                >
                  <Icon size={21} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                  {short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <OverlayHost />
      <Toaster />
    </div>
  );
}
