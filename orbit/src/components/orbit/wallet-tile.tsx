import Link from "next/link";
import { creditTypeLabel, money } from "@/lib/domain/format";
import type { DateOnly, Retailer, WalletItem } from "@/lib/domain/types";
import { cn } from "../ui/cn";
import { balanceStatusText } from "./balance";
import { CategoryIcon } from "./category-icon";
import { tones } from "./retail";

const short: Record<WalletItem["type"], string> = {
  purchased_gift_card: "Gift card",
  gift_received: "Gift",
  return_credit: "Return credit",
  promotional_credit: "Promo",
};

/** Compact wallet card: every retailer and balance visible at once, nothing overlapping. */
export function WalletTile({ item, retailer, today }: { item: WalletItem; retailer: Retailer; today: DateOnly }) {
  const t = tones[retailer.tone];
  const status = balanceStatusText(item, today);
  return (
    <Link
      href={`/wallet/card/?id=${item.id}`}
      aria-label={`${retailer.name} ${creditTypeLabel[item.type]}, ${item.balance != null ? `${money(item.balance)} ${item.balanceStatus.kind === "verified" ? "" : "last known"}` : "balance unknown"}`}
      className={cn("relative flex aspect-[1.45] flex-col justify-between overflow-hidden rounded-[18px] p-3.5 shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5", t.face, t.ink)}
    >
      <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -right-14 -top-16 size-44 opacity-[0.12]">
        <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className="relative flex items-center gap-1.5">
        <CategoryIcon category={retailer.category} className="size-4 shrink-0 opacity-80" />
        <span className="truncate text-[15px] font-semibold">{retailer.name}</span>
      </span>
      <span className="relative">
        <span className="tabular block text-[22px] font-semibold leading-tight tracking-[-0.02em]">{money(item.balance)}</span>
        <span className="block truncate text-[12px] opacity-80">
          {short[item.type]} · {status.trusted ? "Verified" : "Not verified"}
        </span>
      </span>
    </Link>
  );
}
