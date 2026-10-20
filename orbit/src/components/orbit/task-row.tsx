import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { money } from "@/lib/domain/format";
import type { DateOnly, Retailer } from "@/lib/domain/types";
import { dueDateText, dueText, kindMeta, type Priority } from "@/lib/intelligence/priorities";
import { cn } from "../ui/cn";

/** Countdown pill. Overdue is solid, the next 3 days are tinted, later is quiet. */
export function DuePill({ daysLeft, estimated, className }: { daysLeft: number | null; estimated?: boolean; className?: string }) {
  const style =
    daysLeft == null
      ? "bg-sand text-sand-ink"
      : daysLeft < 0
        ? "bg-terracotta text-white"
        : daysLeft <= 3
          ? "bg-terracotta-soft text-terracotta"
          : "bg-ivory-deep text-muted";
  return <span className={cn("tabular inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold", style, className)}>{dueText({ daysLeft })}{estimated && daysLeft != null && daysLeft >= 0 ? " · est." : ""}</span>;
}

/** Emoji type marker in a soft tile. */
export function KindBadge({ emoji, urgent, className }: { emoji: string; urgent?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px] text-[21px]", urgent ? "bg-terracotta-soft" : "bg-ivory-deep", className)}>
      {emoji}
    </span>
  );
}

/** One to-do: what kind of need, which store, what's at stake, when it's due, what to do. */
export function TaskRow({ p, retailer, today }: { p: Priority; retailer: Retailer; today: DateOnly }) {
  const meta = kindMeta[p.kind];
  const date = dueDateText(p, today);
  const label = p.kind === "refund_late" || p.kind === "missing_info" || p.kind === "finish_return" ? meta.label : `${meta.label} ${date ?? ""}`.trim();
  return (
    <Link
      href={p.action.href}
      className="animate-in flex items-center gap-3 rounded-[18px] border border-line bg-card px-3.5 py-3 shadow-[var(--shadow-card)] transition-[transform,box-shadow] hover:shadow-[var(--shadow-lift)] active:scale-[0.99]"
    >
      <KindBadge emoji={meta.emoji} urgent={p.urgent} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-muted">
          {retailer.name} · {label}
        </span>
        <span className="block truncate text-[16px] font-semibold leading-snug">{p.title}</span>
        <span className="mt-0.5 flex items-center gap-0.5 text-[14px] font-semibold text-navy">
          {p.action.label}
          <ChevronRight aria-hidden className="size-4" />
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="tabular text-[17px] font-semibold">{p.amount != null ? money(p.amount) : "—"}</span>
        <DuePill daysLeft={p.daysLeft} estimated={p.estimated && p.kind !== "refund_late"} />
      </span>
    </Link>
  );
}
