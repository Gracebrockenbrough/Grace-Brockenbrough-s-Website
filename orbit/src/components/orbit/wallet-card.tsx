import { creditTypeLabel, money } from "@/lib/domain/format";
import type { DateOnly, Retailer, WalletItem } from "@/lib/domain/types";
import { cn } from "../ui/cn";
import { balanceStatusText } from "./balance";
import { tones } from "./retail";
import { CategoryIcon } from "./category-icon";
import { daysBetween, formatDate } from "@/lib/domain/dates";

/** Wallet card face. Codes are never printed here; only the last four characters. */
export function WalletCardFace({ item, retailer, today, className, size = "full" }: { item: WalletItem; retailer: Retailer; today: DateOnly; className?: string; size?: "full" | "compact" }) {
  const t = tones[retailer.tone];
  const status = balanceStatusText(item, today);
  const last4 = item.secret?.code.replace(/\s/g, "").slice(-4);
  const expiringSoon = item.expiration.kind === "date" && daysBetween(today, item.expiration.date) <= 14;
  const expired = item.expiration.kind === "date" && daysBetween(today, item.expiration.date) < 0;

  return (
    <div className={cn("relative overflow-hidden rounded-[20px] p-5 shadow-[var(--shadow-lift)]", t.face, t.ink, size === "full" ? "aspect-[1.586]" : "", className)}>
      {/* Subtle orbit motif */}
      <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -right-16 -top-20 size-64 opacity-[0.12]">
        <circle cx="100" cy="100" r="70" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="100" cy="100" r="95" fill="none" stroke="currentColor" strokeWidth="1" />
      </svg>
      <div className="relative flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <p className="flex min-w-0 items-center gap-2 text-[20px] font-semibold tracking-[-0.02em]">
            <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-full bg-current/10">
              <CategoryIcon category={retailer.category} className="size-4" />
            </span>
            <span className="truncate">{retailer.name}</span>
          </p>
          <p className="tabular text-[22px] font-semibold tracking-[-0.02em]">{expired ? "Expired" : money(item.balance)}</p>
        </div>
        <div className="mt-0.5 flex items-start justify-between gap-3 text-[14px] opacity-85">
          <p>{creditTypeLabel[item.type]}</p>
          <p className="text-right">{status.trusted ? status.text : status.text.split(" · ")[0]}</p>
        </div>
        {size === "full" && (
          <div className="mt-auto flex items-end justify-between gap-3 text-[14px]">
            <p className="tabular tracking-[0.18em] opacity-80">{last4 ? `•••• ${last4}` : "No code saved"}</p>
            {item.expiration.kind === "date" && !expired && (
              <p className={cn("rounded-full px-2.5 py-0.5 font-semibold", expiringSoon ? "bg-white/90 text-terracotta" : "opacity-80")}>Expires {formatDate(item.expiration.date, today)}</p>
            )}
            {item.demo && item.expiration.kind !== "date" && <p className="text-[12px] font-semibold uppercase tracking-[0.1em] opacity-60">Demo</p>}
          </div>
        )}
      </div>
    </div>
  );
}
