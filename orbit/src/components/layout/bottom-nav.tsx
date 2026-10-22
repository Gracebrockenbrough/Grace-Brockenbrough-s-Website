"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleUserRound, Compass, PackageOpen, WalletCards } from "lucide-react";
import { cn } from "../ui/cn";
import { OrbitMark } from "./logo";

type Tab = { href: string; label: string; icon: typeof PackageOpen | null; accent: string; match: (p: string) => boolean };

/**
 * Returns | Wallet | Today | Discover | You. Practical tools on the left, the assistant in
 * the center, discovery and identity on the right. Each tab lights up in its section color.
 */
const tabs: Tab[] = [
  { href: "/returns/", label: "Returns", icon: PackageOpen, accent: "text-returns", match: (p) => p.startsWith("/returns") || p.startsWith("/add") },
  { href: "/wallet/", label: "Wallet", icon: WalletCards, accent: "text-wallet", match: (p) => p.startsWith("/wallet") || p.startsWith("/gift") },
  { href: "/", label: "Today", icon: null, accent: "text-today", match: (p) => p === "/" || ["/ask", "/attention", "/calendar"].some((x) => p.startsWith(x)) },
  { href: "/discover/", label: "Discover", icon: Compass, accent: "text-circle", match: (p) => p.startsWith("/discover") || p.startsWith("/stores") },
  { href: "/you/", label: "You", icon: CircleUserRound, accent: "text-you", match: (p) => ["/you", "/settings", "/insights", "/saved", "/dev"].some((x) => p.startsWith(x)) },
];

export function BottomNav() {
  const path = usePathname() ?? "/";
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-ivory/90 pb-safe backdrop-blur-xl md:bottom-4 md:mx-auto md:max-w-[520px] md:rounded-[26px] md:border md:shadow-[var(--shadow-lift)]">
      <ul className="mx-auto grid h-[68px] max-w-[560px] grid-cols-5 px-1">
        {tabs.map(({ href, label, icon: Icon, accent, match }) => {
          const active = match(path);
          const today = Icon == null;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-full min-w-11 flex-col items-center justify-center gap-0.5 text-[12px] font-semibold transition-colors", active ? accent : "text-muted hover:text-navy")}
              >
                {today ? (
                  <span className={cn("flex h-8 w-12 items-center justify-center rounded-[14px] transition-colors", active ? "bg-navy text-white shadow-[0_4px_12px_-4px_rgb(38_35_61/0.6)]" : "bg-navy/[0.06] text-navy")}>
                    <OrbitMark className="size-[22px]" />
                  </span>
                ) : (
                  <span className="flex h-8 items-center justify-center">
                    <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                  </span>
                )}
                <span className={cn(today && active && "text-navy")}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
