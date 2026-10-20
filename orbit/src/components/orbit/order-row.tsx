import type { OrderView } from "@/lib/store/selectors";
import { orderHref } from "@/lib/store/selectors";
import { RecordRow } from "./task-row";

/** An order in a list: retailer, item, amount, current stage and deadline, next action. */
export function OrderRow({ v, showAction = true }: { v: OrderView; showAction?: boolean }) {
  const c = v.current;
  const dated = c.dueDate != null;
  return (
    <RecordRow
      indicator={c.indicator}
      eyebrow={v.retailer.name}
      title={v.title}
      sub={
        <>
          <span className="font-semibold text-navy">{c.label}</span>
          {c.dueLabel && c.dueLabel !== c.label ? ` · ${c.dueLabel}` : ""}
        </>
      }
      amount={v.amount}
      daysLeft={c.daysLeft}
      showPill={dated || c.group === "action"}
      estimated={c.estimated}
      kind={c.indicator === "refund_check" ? "refund_check" : undefined}
      href={orderHref(v.order.id)}
      action={showAction && c.group !== "history" && c.action.label !== "View Details" ? c.action : null}
    />
  );
}
