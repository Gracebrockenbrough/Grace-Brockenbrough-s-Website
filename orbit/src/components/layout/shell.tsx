"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { IconButton } from "../ui/button";
import { Toaster } from "../ui/toast";
import { cn } from "../ui/cn";
import { PageSkeleton } from "../ui/states";
import { BottomNav } from "./bottom-nav";
import { OrbitWordmark } from "./logo";
import Link from "next/link";

/**
 * Page frame: a centered, phone-width column on every screen size.
 * `nav` shows the five-tab bar; focused flows (return assistant, gifting) hide it.
 */
export function Shell({ children, nav = true, loading = false, className }: { children?: ReactNode; nav?: boolean; loading?: boolean; className?: string }) {
  return (
    <>
      <main className={cn("animate-fade mx-auto min-h-dvh w-full max-w-[560px] px-5", nav ? "pb-32" : "pb-10", className)}>{loading ? <PageSkeleton /> : children}</main>
      {nav && <BottomNav />}
      <Toaster />
    </>
  );
}

/** Today's header: wordmark left, a small date right. */
export function TopBar({ date }: { date?: string }) {
  return (
    <header className="flex h-16 items-center justify-between">
      <Link href="/" aria-label="Penny home" className="-ml-1 rounded-lg px-1">
        <OrbitWordmark />
      </Link>
      {date && <p className="text-[14px] font-medium text-muted">{date}</p>}
    </header>
  );
}

/** Top-level page title. `accent` tints a small bar in the section's identity color. */
export function PageHeader({ title, subtitle, action, accent }: { title: string; subtitle?: string; action?: ReactNode; accent?: "returns" | "wallet" | "circle" | "you" }) {
  const bar = { returns: "bg-returns", wallet: "bg-wallet", circle: "bg-circle", you: "bg-you" };
  return (
    <header className="pb-5 pt-6">
      {accent && <span aria-hidden className={cn("mb-3 block h-1 w-8 rounded-full", bar[accent])} />}
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-[34px] leading-[1.05]">{title}</h1>
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
