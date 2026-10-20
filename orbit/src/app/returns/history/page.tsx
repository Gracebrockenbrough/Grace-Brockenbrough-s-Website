"use client";

import { Archive } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { ReturnRow } from "@/components/orbit/return-row";
import { EmptyState } from "@/components/ui/states";
import { returnTasks } from "@/lib/store/selectors";
import { useOrbit } from "@/lib/store/store";

export default function HistoryPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const done = returnTasks(o.data, o.today)
    .filter((t) => t.group === "history")
    .sort((a, b) => (b.view.order.purchasedAt ?? "").localeCompare(a.view.order.purchasedAt ?? ""));
  return (
    <Shell>
      <BackBar fallback="/returns/" />
      <h1 className="pb-1 pt-2 text-[28px] font-semibold tracking-[-0.02em]">History</h1>
      <p className="pb-5 text-[16px] text-muted">Finished returns, things you kept, and windows that closed.</p>
      {done.length ? (
        <div className="space-y-2">
          {done.map((t) => (
            <ReturnRow key={t.view.order.id} t={t} showAction={false} />
          ))}
        </div>
      ) : (
        <EmptyState icon={<Archive aria-hidden />} title="Nothing here yet">Completed returns will show up here.</EmptyState>
      )}
    </Shell>
  );
}
