"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Undo2, WalletCards } from "lucide-react";
import { cn } from "../ui/cn";

const tabs = [
  { href: "/", label: "Today", icon: Sun, match: (p: string) => p === "/" || p.startsWith("/attention") },
  { href: "/returns/", label: "Returns", icon: Undo2, match: (p: string) => p.startsWith("/returns") || p.startsWith("/add") },
  { href: "/wallet/", label: "Wallet", icon: WalletCards, match: (p: string) => p.startsWith("/wallet") || p.startsWith("/gift") },
];

export function BottomNav() {
  const path = usePathname() ?? "/";
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-line/80 bg-ivory/85 pb-safe backdrop-blur-xl">
      <ul className="mx-auto grid h-[64px] max-w-[560px] grid-cols-3">
        {tabs.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn("flex h-full flex-col items-center justify-center gap-1 text-[12px] font-semibold transition-colors", active ? "text-navy" : "text-muted hover:text-navy")}
              >
                <Icon aria-hidden className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
