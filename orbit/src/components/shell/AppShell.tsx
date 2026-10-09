"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Plus, Settings } from "lucide-react";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
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
  const { state, hydrated } = useOrbit();
  const { open, overlay } = useUI();

  // First-time users start with onboarding.
  useEffect(() => {
    if (hydrated && !state.onboarded) router.replace("/onboarding");
  }, [hydrated, state.onboarded, router]);

  // The Morning Brief appears the first time ORBIT is opened in the morning.
  useEffect(() => {
    if (hydrated && state.onboarded && !state.briefSeen && state.notificationSettings.morningBrief && pathname === "/today" && !overlay) {
      open({ type: "brief" });
    }
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
      <div className="flex min-h-screen items-center justify-center text-ink-3" aria-busy="true">
        <OrbitMark size={36} spinning className="text-ink" />
        <span className="sr-only">Loading ORBIT</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-xl focus:bg-surface focus:px-4 focus:py-2 focus:shadow-raised">
        Skip to content
      </a>

      {/* Desktop navigation rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[232px] flex-col border-r border-line bg-canvas px-4 py-6 md:flex">
        <Link href="/today" className="mb-8 px-2" aria-label="ORBIT home">
          <Logo />
        </Link>
        <button
          type="button"
          onClick={() => open({ type: "capture" })}
          className="mb-6 flex min-h-11 items-center gap-2 rounded-xl bg-ink px-4 text-[15px] font-medium text-white shadow-card transition-colors hover:bg-ink/90"
        >
          <Plus size={18} aria-hidden />
          Add anything
          <kbd className="ml-auto rounded-md bg-white/15 px-1.5 py-0.5 text-[12px] font-medium text-white/80">⌘K</kbd>
        </button>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                  active ? "bg-surface text-ink shadow-card" : "text-ink-2 hover:bg-sunken hover:text-ink",
                )}
              >
                <Icon size={19} aria-hidden className={active ? "text-accent" : undefined} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <Link
            href="/settings"
            aria-current={isActive(pathname, "/settings") ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center gap-3 rounded-xl px-3 transition-colors",
              isActive(pathname, "/settings") ? "bg-surface shadow-card" : "hover:bg-sunken",
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-[14px] font-semibold text-accent-strong" aria-hidden>
              {state.user.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14.5px] font-medium text-ink">{state.user.fullName}</span>
              <span className="block text-[13px] text-ink-3">Profile &amp; connections</span>
            </span>
            <Settings size={17} className="text-ink-3" aria-hidden />
          </Link>
        </div>
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-canvas/90 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/today" aria-label="ORBIT home">
          <Logo />
        </Link>
        <Link href="/settings" aria-label="Profile" className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-[14px] font-semibold text-accent-strong">
          {state.user.name[0]}
        </Link>
      </header>

      <main id="main" className="md:pl-[232px]">
        <div className="mx-auto w-full max-w-[1080px] px-4 pb-32 pt-5 md:px-10 md:pb-16 md:pt-10">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {NAV_ITEMS.map(({ href, short, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-medium", active ? "text-accent" : "text-ink-3")}
                >
                  <Icon size={21} aria-hidden />
                  {short}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Persistent capture button on mobile */}
      <button
        type="button"
        onClick={() => open({ type: "capture" })}
        aria-label="Add anything"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white shadow-raised transition-transform active:scale-95 md:hidden"
      >
        <Plus size={26} aria-hidden />
      </button>

      <OverlayHost />
      <Toaster />
    </div>
  );
}
