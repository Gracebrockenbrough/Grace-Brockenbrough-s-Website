"use client";

import { Archive } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { OrderRow } from "@/components/orbit/order-row";
import { EmptyState } from "@/components/ui/states";
import { orderViews } from "@/lib/store/selectors";
import { useOrbit } from "@/lib/store/store";

export default function HistoryPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const done = orderViews(o.data, o.today)
    .filter((v) => v.current.group === "history")
    .sort((a, b) => (b.order.purchasedAt ?? "").localeCompare(a.order.purchasedAt ?? ""));
  return (
    <Shell>
      <BackBar fallback="/returns/" title="Completed" />
      <p className="pb-5 pt-1 text-[16px] text-muted">Finished returns, things you kept, and return windows that closed.</p>
      {done.length ? (
        <div className="space-y-2.5">
          {done.map((v) => (
            <OrderRow key={v.order.id} v={v} showAction={false} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Archive aria-hidden />} title="Nothing here yet">
          Completed returns will show up here.
        </EmptyState>
      )}
    </Shell>
  );
}
