import { BadgeCheck, CircleQuestionMark, ClockArrowUp, UserRoundPen } from "lucide-react";
import { ago, daysBetween } from "@/lib/domain/dates";
import type { DateOnly, WalletItem } from "@/lib/domain/types";
import { BALANCE_FRESH_DAYS } from "@/lib/services/balances";
import { cn } from "../ui/cn";

/** Says exactly how much to trust a balance. */
export function balanceStatusText(w: WalletItem, today: DateOnly): { text: string; trusted: boolean } {
  const s = w.balanceStatus;
  switch (s.kind) {
    case "verified": {
      const fresh = daysBetween(s.at.slice(0, 10), today) <= BALANCE_FRESH_DAYS;
      return fresh ? { text: `Verified ${ago(s.at, today)}`, trusted: true } : { text: `Last verified ${ago(s.at, today)}`, trusted: false };
    }
    case "last_known":
      return { text: `Not verified · last known ${ago(s.at, today)}`, trusted: false };
    case "user_reported":
      return { text: `Updated by you ${ago(s.at, today)}`, trusted: false };
    case "unknown":
      return { text: "Balance unknown", trusted: false };
  }
}

export function BalanceStatus({ item, today, className, onFace }: { item: WalletItem; today: DateOnly; className?: string; onFace?: boolean }) {
  const { text, trusted } = balanceStatusText(item, today);
  const Icon = item.balanceStatus.kind === "user_reported" ? UserRoundPen : item.balanceStatus.kind === "unknown" ? CircleQuestionMark : trusted ? BadgeCheck : ClockArrowUp;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[14px]", onFace ? "opacity-85" : trusted ? "text-sage-ink" : "text-sand-ink", className)}>
      <Icon aria-hidden className="size-4 shrink-0" />
      {text}
    </span>
  );
}
