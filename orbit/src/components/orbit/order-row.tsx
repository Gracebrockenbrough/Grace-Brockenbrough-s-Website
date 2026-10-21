import Link from "next/link";
import { ChevronRight, QrCode } from "lucide-react";
import { formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import type { DateOnly } from "@/lib/domain/types";
import type { OrderView } from "@/lib/store/selectors";
import { orderHref } from "@/lib/store/selectors";
import { cn } from "../ui/cn";
import { dotTone, toneFor } from "./indicator";
import { ProductThumb } from "./retail";
import { DuePill } from "./task-row";

/**
 * A compact purchase row: thumbnail, store, product, status with its deadline, amount.
 * The whole row opens the order. A drop-off gets one small shortcut to its QR code.
 */
export function OrderRow({ v, today }: { v: OrderView; today?: DateOnly; showAction?: boolean }) {
  const c = v.current;
  const tone = toneFor(c.indicator, c.daysLeft);
  const qr = c.key === "drop_off" ? c.action.href : null;
  return (
    <li className="relative">
      <Link href={orderHref(v.order.id)} className={cn("flex min-h-[68px] items-center gap-3 px-3.5 py-2.5 hover:bg-ivory/70", qr && "pr-14")}>
        <ProductThumb category={v.order.items[0]?.category ?? "other"} name={v.order.items[0]?.name} tone={v.retailer.tone} className="size-11 rounded-[12px]" count={v.order.items.length} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold uppercase tracking-[0.05em] text-muted">{v.retailer.name}</span>
          <span className="block truncate text-[15px] font-semibold leading-snug">{v.title}</span>
          <span className="flex items-center gap-1.5 text-[13px] text-muted">
            <span aria-hidden className={cn("size-2 shrink-0 rounded-full", dotTone[tone])} />
            <span className="truncate">
              <span className="font-semibold text-navy">{c.dueLabel ?? c.label}</span>
              {c.dueLabel && c.estimated ? " (est.)" : !c.dueLabel && c.dueDate && today ? ` · ${formatDate(c.dueDate, today)}` : ""}
            </span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <span className="tabular text-[15px] font-semibold">{v.amount != null ? money(v.amount) : ""}</span>
          {c.daysLeft != null && c.group === "action" ? <DuePill daysLeft={c.daysLeft} kind={c.indicator === "refund_check" ? "refund_check" : undefined} className="h-5 px-2 text-[12px]" /> : !qr && <ChevronRight aria-hidden className="size-4 text-muted/60" />}
        </span>
      </Link>
      {qr && (
        <Link href={qr} aria-label={`Show return QR code for ${v.title}`} className="absolute right-2 top-1/2 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-navy text-white">
          <QrCode aria-hidden className="size-5" />
        </Link>
      )}
    </li>
  );
}

/** A group of rows in one card, divided, so a long list stays light. */
export function OrderList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn("divide-y divide-line overflow-hidden rounded-[20px] bg-card shadow-[var(--shadow-card)]", className)}>{children}</ul>;
}
