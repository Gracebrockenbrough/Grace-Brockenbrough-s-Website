import Link from "next/link";
import type React from "react";
import { ChevronRight } from "lucide-react";
import { money } from "@/lib/domain/format";
import { dueText } from "@/lib/intelligence/priorities";
import type { Indicator } from "@/lib/store/selectors";
import { ButtonLink } from "../ui/button";
import { cn } from "../ui/cn";
import { IndicatorBadge, toneFor } from "./indicator";

/** Countdown pill. Overdue is solid, the next 3 days are tinted, later is quiet. */
export function DuePill({ daysLeft, estimated, kind, className }: { daysLeft: number | null; estimated?: boolean; kind?: string; className?: string }) {
  const style =
    daysLeft == null
      ? "bg-sand text-sand-ink"
      : daysLeft < 0
        ? kind === "refund_check"
          ? "bg-sand text-sand-ink"
          : "bg-terracotta text-white"
        : daysLeft <= 3
          ? "bg-terracotta-soft text-terracotta"
          : "bg-ivory-deep text-muted";
  return (
    <span className={cn("tabular inline-flex h-6 items-center whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold", style, className)}>
      {dueText({ daysLeft, kind })}
      {estimated && daysLeft != null && daysLeft >= 0 ? " · est." : ""}
    </span>
  );
}

export interface RecordRowProps {
  indicator: Indicator;
  /** "Reformation · Return decision" */
  eyebrow: string;
  title: string;
  /** Stage and deadline, e.g. "Return decision · Decide by Oct 23" */
  sub?: React.ReactNode;
  amount: number | null;
  daysLeft: number | null;
  showPill?: boolean;
  estimated?: boolean;
  kind?: string;
  /** Opens the underlying record. */
  href: string;
  /** Optional next step, a separate tap target. */
  action?: { label: string; href: string } | null;
  /** Show the next step as a full-width button (the single most important item). */
  prominent?: boolean;
}

/**
 * The one list row used everywhere: retailer, item, amount, deadline or status, next action.
 * Tapping the row opens the record; the action button goes straight to the next step.
 */
export function RecordRow({ indicator, eyebrow, title, sub, amount, daysLeft, showPill = true, estimated, kind, href, action, prominent }: RecordRowProps) {
  const tone = toneFor(indicator, daysLeft);
  return (
    <article className={cn("animate-in rounded-[18px] border border-line bg-card shadow-[var(--shadow-card)]", prominent && "shadow-[var(--shadow-lift)]")}>
      <Link href={href} className="flex items-center gap-3 rounded-[18px] px-3.5 py-3 hover:bg-ivory/60">
        <IndicatorBadge indicator={indicator} tone={tone} />
        <span className="min-w-0 flex-1">
          <span className={cn("block text-[13px] font-semibold text-muted", !prominent && "truncate")}>{eyebrow}</span>
          <span className={cn("block font-semibold leading-snug", prominent ? "text-[18px]" : "truncate text-[16px]")}>{title}</span>
          {sub && <span className="block text-[14px] leading-snug text-muted">{sub}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="tabular text-[17px] font-semibold">{amount != null ? money(amount) : ""}</span>
          {showPill ? <DuePill daysLeft={daysLeft} estimated={estimated} kind={kind} /> : <ChevronRight aria-hidden className="size-5 text-muted/60" />}
        </span>
      </Link>
      {action &&
        (prominent ? (
          <div className="px-3.5 pb-3.5">
            <ButtonLink href={action.href} size="md" className="w-full">
              {action.label}
            </ButtonLink>
          </div>
        ) : (
          <div className="flex justify-end border-t border-line/70 px-2 py-1">
            <Link href={action.href} className="inline-flex min-h-11 items-center gap-0.5 rounded-full px-3 text-[14px] font-semibold text-navy hover:bg-ivory-deep">
              {action.label}
              <ChevronRight aria-hidden className="size-4" />
            </Link>
          </div>
        ))}
    </article>
  );
}
