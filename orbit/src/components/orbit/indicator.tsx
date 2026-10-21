import { Banknote, CalendarClock, CircleCheck, CircleQuestionMark, Gift, Heart, Hourglass, MapPin, PackageCheck, PenLine, Tag, Target, Truck, Undo2 } from "lucide-react";
import type { Indicator } from "@/lib/store/selectors";
import { cn } from "../ui/cn";

const icons: Record<Indicator, typeof Truck> = {
  decide: CalendarClock,
  initiate: PenLine,
  approval: Hourglass,
  drop_off: MapPin,
  transit: Truck,
  refund: Banknote,
  refund_check: Banknote,
  done: CircleCheck,
  unknown: CircleQuestionMark,
  not_delivered: Truck,
  credit: Gift,
  delivered: PackageCheck,
  started: Undo2,
  arriving: Truck,
  sale: Tag,
  wish: Heart,
  goal: Target,
};

export type Tone = "urgent" | "caution" | "progress" | "success" | "neutral";

/**
 * Status tone: urgent (coral), needs verification (amber), in progress (blue),
 * complete (sage), neutral. Tone is about status, never decoration, and every
 * tone is shown alongside words.
 */
export function toneFor(indicator: Indicator, daysLeft: number | null): Tone {
  if (indicator === "done") return "success";
  if (indicator === "unknown" || indicator === "refund_check" || indicator === "goal") return "caution";
  if (indicator === "sale" || indicator === "wish") return "neutral";
  if (daysLeft != null && daysLeft <= 3 && indicator !== "delivered" && indicator !== "started") return "urgent";
  // Underway: the return, shipment or refund is moving and nothing is due from you yet.
  if (indicator === "transit" || indicator === "approval" || indicator === "refund" || indicator === "started" || indicator === "arriving" || indicator === "not_delivered") return "progress";
  return "neutral";
}

const tile: Record<Tone, string> = {
  urgent: "bg-terracotta-soft text-terracotta",
  caution: "bg-sand text-sand-ink",
  progress: "bg-progress-soft text-progress",
  success: "bg-sage text-sage-ink",
  neutral: "bg-ivory-deep text-navy",
};

export const dotTone: Record<Tone, string> = {
  urgent: "bg-terracotta",
  caution: "bg-sand-ink",
  progress: "bg-progress",
  success: "bg-sage-ink",
  neutral: "bg-navy/60",
};

export function IndicatorIcon({ indicator, className }: { indicator: Indicator; className?: string }) {
  const Icon = icons[indicator];
  return <Icon aria-hidden className={className} strokeWidth={1.9} />;
}

/** Icon in a soft tile. The same need always gets the same icon. */
export function IndicatorBadge({ indicator, tone, className }: { indicator: Indicator; tone: Tone; className?: string }) {
  return (
    <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-[14px]", tile[tone], className)}>
      <IndicatorIcon indicator={indicator} className="size-5" />
    </span>
  );
}
