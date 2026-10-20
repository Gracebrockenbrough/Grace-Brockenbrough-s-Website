import { formatDate } from "@/lib/domain/dates";
import type { DateOnly, Retailer } from "@/lib/domain/types";
import { kindMeta, type Priority } from "@/lib/intelligence/priorities";
import { RecordRow } from "./task-row";

/** A to-do from the Notification Service, rendered with the shared row. */
export function PriorityRow({ p, retailer, today, prominent }: { p: Priority; retailer: Retailer; today: DateOnly; prominent?: boolean }) {
  const meta = kindMeta[p.kind];
  const due = p.dueDate ? `${meta.due} ${formatDate(p.dueDate, today)}${p.estimated && p.kind !== "refund_check" ? " (est.)" : ""}` : null;
  return (
    <RecordRow
      indicator={meta.indicator}
      eyebrow={retailer.name}
      title={p.title}
      sub={
        <>
          <span className="font-semibold text-navy">{meta.label}</span>
          {due ? ` · ${due}` : ""}
          {prominent ? <span className="block">{p.status}.</span> : null}
        </>
      }
      amount={p.amount}
      daysLeft={p.daysLeft}
      estimated={p.estimated && p.kind !== "refund_check"}
      kind={p.kind}
      href={p.detailHref}
      action={p.action}
      prominent={prominent}
    />
  );
}
