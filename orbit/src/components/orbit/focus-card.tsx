import { money } from "@/lib/domain/format";
import type { Retailer } from "@/lib/domain/types";
import { ButtonLink } from "../ui/button";
import { DuePill, KindBadge } from "./task-row";

/** The one thing to do first. Everything else on the screen is quieter. */
export function FocusCard({
  emoji,
  retailer,
  label,
  title,
  why,
  amount,
  daysLeft,
  estimated,
  action,
}: {
  emoji: string;
  retailer: Retailer;
  label: string;
  title: string;
  why: string;
  amount: number | null;
  daysLeft: number | null;
  estimated?: boolean;
  action: { label: string; href: string };
}) {
  return (
    <article className="animate-in rounded-[22px] border border-line bg-card p-4 shadow-[var(--shadow-lift)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-terracotta">Do this first</p>
        <DuePill daysLeft={daysLeft} estimated={estimated} />
      </div>
      <div className="mt-3 flex items-start gap-3">
        <KindBadge emoji={emoji} urgent className="size-12 text-[24px]" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-muted">
            {retailer.name} · {label}
          </p>
          <h2 className="text-[20px] font-semibold leading-snug tracking-[-0.01em]">{title}</h2>
          <p className="mt-0.5 text-[15px] text-muted">{why}</p>
        </div>
        {amount != null && <p className="tabular text-[22px] font-semibold tracking-[-0.02em]">{money(amount)}</p>}
      </div>
      <ButtonLink href={action.href} className="mt-4">
        {action.label}
      </ButtonLink>
    </article>
  );
}
