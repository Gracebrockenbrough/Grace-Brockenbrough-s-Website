import { Check } from "lucide-react";
import { Tag } from "@/components/ui/notice";
import { formatDate } from "@/lib/domain/dates";
import type { DateOnly } from "@/lib/domain/types";
import type { ReturnDeadlines, StepDeadline } from "@/lib/intelligence/returns";
import { capabilityRows, supportText, type RetailerCapabilities } from "@/lib/retailers/capabilities";
import { cn } from "../ui/cn";

const STEPS: { key: keyof ReturnDeadlines; label: string }[] = [
  { key: "start", label: "Start the return" },
  { key: "label", label: "Get approval or label" },
  { key: "ship", label: "Ship or drop off" },
];

function value(d: StepDeadline, today: DateOnly) {
  if (d.kind === "confirmed" || d.kind === "estimated") return `By ${formatDate(d.date, today)}`;
  if (d.kind === "done") return "Done";
  if (d.kind === "pending") return "After the step before";
  return "No separate deadline";
}

/** The three dates a return can have, never merged into one "due date". */
export function ReturnDates({ dates, today }: { dates: ReturnDeadlines; today: DateOnly }) {
  return (
    <ol className="divide-y divide-line">
      {STEPS.map(({ key, label }, i) => {
        const d = dates[key];
        const late = (d.kind === "confirmed" || d.kind === "estimated") && d.daysLeft < 0;
        return (
          <li key={key} className="flex items-start gap-3 py-2.5">
            <span aria-hidden className={cn("mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold", d.kind === "done" ? "bg-sage text-sage-ink" : "bg-ivory-deep text-muted")}>
              {d.kind === "done" ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold">{label}</span>
              <span className="block text-[13px] text-muted">{d.basis}</span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-1 text-right">
              <span className={cn("text-[15px] font-semibold", late && "text-terracotta", d.kind === "none" || d.kind === "pending" ? "font-normal text-muted" : "")}>{value(d, today)}</span>
              {d.kind === "estimated" && <Tag tone="warning">Estimated</Tag>}
              {d.kind === "confirmed" && <Tag tone="success">From retailer</Tag>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** What Penny can and can't do with this store, straight from the compatibility registry. */
export function CapabilityList({ caps, retailerName }: { caps: RetailerCapabilities; retailerName: string }) {
  return (
    <>
      <ul className="divide-y divide-line">
        {capabilityRows.map((row) => {
          const v = caps[row.key] as "yes" | "partial" | "no";
          return (
            <li key={row.key} className="flex items-start justify-between gap-3 py-2 text-[15px]">
              <span>{row.label}</span>
              <span className={cn("text-right font-medium", v === "yes" ? "text-sage-ink" : v === "no" ? "text-muted" : "text-sand-ink")}>{supportText(row, v)}</span>
            </li>
          );
        })}
      </ul>
      {caps.limitations.length > 0 && (
        <ul className="mt-2 space-y-1 text-[14px] text-muted">
          {caps.limitations.map((l) => (
            <li key={l}>• {l}</li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-[13px] text-muted">Penny has no partnership with {retailerName}. Everything above works from your own emails and receipts.</p>
    </>
  );
}
