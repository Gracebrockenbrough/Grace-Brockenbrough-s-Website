import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { money, orderTotal } from "@/lib/domain/format";
import type { DateOnly } from "@/lib/domain/types";
import type { OrderView } from "@/lib/store/selectors";
import { ButtonLink } from "../ui/button";
import { cn } from "../ui/cn";
import { DeadlineLine } from "./deadline";
import { ProductThumb } from "./retail";

export function PurchaseCard({ view, today }: { view: OrderView; today: DateOnly }) {
  const { order, retailer, action, stage } = view;
  const first = order.items[0];
  const title = first ? first.name + (order.items.length > 1 ? ` + ${order.items.length - 1} more` : "") : "Items not listed";
  const showDeadline = stage === "to_decide" || stage === "on_the_way" || stage === "not_returnable";
  const done = stage === "completed" || stage === "kept";

  return (
    <article className="animate-in rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]">
      <Link href={`/returns/purchase/?id=${order.id}`} className="flex gap-4 rounded-t-[var(--radius-card)] p-4 pb-3">
        <ProductThumb category={first?.category ?? "other"} tone={retailer.tone} count={order.items.length} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[14px] font-semibold uppercase tracking-[0.06em] text-muted">{retailer.name}</p>
            <ChevronRight aria-hidden className="-mr-1 size-5 shrink-0 text-muted/60" />
          </div>
          <h3 className="mt-0.5 truncate text-[17px] font-semibold leading-snug">{title}</h3>
          <p className="mt-0.5 text-[15px] text-muted">
            <span className="tabular">{money(orderTotal(order))}</span> · <span className={cn(done && "text-sage-ink")}>{view.status}</span>
          </p>
          {showDeadline && <DeadlineLine deadline={view.deadline} today={today} className="mt-1.5" />}
        </div>
      </Link>
      {action.primary && (
        <div className="px-4 pb-4">
          <ButtonLink href={action.href} size="md" className="w-full">
            {action.label}
          </ButtonLink>
        </div>
      )}
    </article>
  );
}
