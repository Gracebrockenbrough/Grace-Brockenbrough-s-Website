import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { money } from "@/lib/domain/format";
import type { ReturnTask } from "@/lib/store/selectors";
import { DuePill, KindBadge } from "./task-row";

/** Compact, one-glance return: type, store, item, money, countdown. */
export function ReturnRow({ t, showAction = true }: { t: ReturnTask; showAction?: boolean }) {
  const { order, retailer } = t.view;
  const title = t.title;
  return (
    <Link
      href={showAction ? t.href : `/returns/purchase/?id=${order.id}`}
      className="animate-in flex items-center gap-3 rounded-[18px] border border-line bg-card px-3.5 py-3 shadow-[var(--shadow-card)] transition-[transform,box-shadow] hover:shadow-[var(--shadow-lift)] active:scale-[0.99]"
    >
      <KindBadge emoji={t.emoji} urgent={t.daysLeft != null && t.daysLeft <= 3} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold text-muted">
          {retailer.name} · {t.label}
        </span>
        <span className="block truncate text-[16px] font-semibold leading-snug">{title}</span>
        {showAction && (
          <span className="mt-0.5 flex items-center gap-0.5 text-[14px] font-semibold text-navy">
            {t.actionLabel}
            <ChevronRight aria-hidden className="size-4" />
          </span>
        )}
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="tabular text-[17px] font-semibold">{t.amount != null ? money(t.amount) : "—"}</span>
        {(t.group === "move" || t.daysLeft != null) && <DuePill daysLeft={t.daysLeft} estimated={t.estimated} />}
      </span>
    </Link>
  );
}
