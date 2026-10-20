import { CalendarClock, CircleQuestionMark, Truck } from "lucide-react";
import { formatDate } from "@/lib/domain/dates";
import type { DateOnly } from "@/lib/domain/types";
import type { Deadline } from "@/lib/intelligence/returns";
import { cn } from "../ui/cn";

function daysLeftText(n: number) {
  if (n < 0) return "Window closed";
  if (n === 0) return "Last day today";
  if (n === 1) return "1 day left";
  return `${n} days left`;
}

/**
 * One-line deadline. Confirmed and estimated deadlines read differently on purpose,
 * and a missing deadline is always stated, never hidden.
 */
export function DeadlineLine({ deadline, today, className }: { deadline: Deadline | null; today: DateOnly; className?: string }) {
  if (!deadline) return null;
  if (deadline.kind === "unknown")
    return (
      <p className={cn("flex items-start gap-1.5 text-[15px] font-medium text-sand-ink", className)}>
        <CircleQuestionMark aria-hidden className="mt-[3px] size-4 shrink-0" />
        Return deadline not confirmed
      </p>
    );
  if (deadline.kind === "not_started")
    return (
      <p className={cn("flex items-center gap-1.5 text-[15px] text-muted", className)}>
        <Truck aria-hidden className="size-4 shrink-0" />
        Return window starts at delivery
      </p>
    );
  const urgent = deadline.daysLeft >= 0 && deadline.daysLeft <= 3;
  const closed = deadline.daysLeft < 0;
  return (
    <p className={cn("flex items-start gap-1.5 text-[15px] font-medium", urgent ? "text-terracotta" : closed ? "text-muted" : "text-navy", className)}>
      <CalendarClock aria-hidden className="mt-[3px] size-4 shrink-0" />
      <span>
        {closed ? `Return window closed ${formatDate(deadline.date, today)}` : `Return by ${formatDate(deadline.date, today)}`}
        {!closed && <span className="font-normal"> · {daysLeftText(deadline.daysLeft)}</span>}
        {deadline.kind === "estimated" && !closed && <span className="font-normal text-muted"> · Estimated</span>}
      </span>
    </p>
  );
}
