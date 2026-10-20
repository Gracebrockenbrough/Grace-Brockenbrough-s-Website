"use client";

import { ArrowLeft, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { IconButton, IconLink } from "../ui/button";
import { cn } from "../ui/cn";
import { PageSkeleton } from "../ui/states";
import { BottomNav } from "./bottom-nav";
import { OrbitWordmark } from "./logo";
import Link from "next/link";

/**
 * Page frame: a centered, phone-width column on every screen size.
 * `nav` shows the three-tab bar; focused flows (return assistant, gifting) hide it.
 */
export function Shell({ children, nav = true, loading = false, className }: { children?: ReactNode; nav?: boolean; loading?: boolean; className?: string }) {
  return (
    <>
      <main className={cn("mx-auto min-h-dvh w-full max-w-[560px] px-5", nav ? "pb-32" : "pb-10", className)}>{loading ? <PageSkeleton /> : children}</main>
      {nav && <BottomNav />}
    </>
  );
}

/** Today's header: wordmark left, profile right. */
export function TopBar() {
  return (
    <header className="flex h-16 items-center justify-between">
      <Link href="/" aria-label="Orbit home" className="-ml-1 rounded-lg px-1">
        <OrbitWordmark />
      </Link>
      <IconLink href="/settings/" label="Profile and settings" className="-mr-2 border border-line bg-card">
        <UserRound aria-hidden className="size-5" />
      </IconLink>
    </header>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="pb-5 pt-6">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.025em]">{title}</h1>
        {action && <div className="-mr-2 -mt-1 flex items-center">{action}</div>}
      </div>
      {subtitle && <p className="mt-1.5 text-[17px] text-muted">{subtitle}</p>}
    </header>
  );
}

/** Back navigation for detail views and flows. Falls back to `fallback` when there is no history. */
export function BackBar({ fallback, title, action }: { fallback: string; title?: string; action?: ReactNode }) {
  const router = useRouter();
  return (
    <div className="sticky top-0 z-20 -mx-5 flex h-14 items-center gap-1 bg-ivory/90 px-3 backdrop-blur-xl">
      <IconButton
        label="Back"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push(fallback);
        }}
      >
        <ArrowLeft aria-hidden className="size-[22px]" />
      </IconButton>
      {title && <p className="flex-1 truncate text-center text-[16px] font-semibold">{title}</p>}
      {!title && <span className="flex-1" />}
      <div className="flex min-w-11 justify-end">{action}</div>
    </div>
  );
}
