import type { Priority } from "@/lib/intelligence/priorities";
import type { Retailer } from "@/lib/domain/types";
import { ButtonLink } from "../ui/button";
import { Card } from "../ui/card";
import { cn } from "../ui/cn";
import { RetailerMark } from "./retail";

export function PriorityCard({ priority, retailer }: { priority: Priority; retailer: Retailer }) {
  return (
    <Card as="article" className="animate-in p-4">
      <div className="flex items-center gap-2.5">
        <RetailerMark retailer={retailer} />
        <p className="text-[15px] font-semibold">{retailer.name}</p>
      </div>
      <h3 className="mt-3 text-[18px] font-semibold leading-snug tracking-[-0.01em]">{priority.title}</h3>
      <p className={cn("mt-1 flex items-center gap-2 text-[15px]", priority.urgent ? "font-medium text-terracotta" : "text-muted")}>
        {priority.urgent && <span aria-hidden className="size-2 shrink-0 rounded-full bg-terracotta" />}
        {priority.status}
      </p>
      <ButtonLink href={priority.action.href} size="md" className="mt-4 w-full">
        {priority.action.label}
      </ButtonLink>
    </Card>
  );
}
