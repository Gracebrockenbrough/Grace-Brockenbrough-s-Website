"use client";

import { BackBar, Shell } from "@/components/layout/shell";
import { PriorityCard } from "@/components/orbit/priority-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { buildPriorities } from "@/lib/intelligence/priorities";
import { retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";
import { CircleCheck } from "lucide-react";

export default function AttentionPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const list = buildPriorities(o.data, o.today);
  return (
    <Shell>
      <BackBar fallback="/" />
      <h1 className="pb-1 pt-2 text-[28px] font-semibold tracking-[-0.02em]">Needs attention</h1>
      <p className="pb-5 text-[16px] text-muted">Most urgent first. Hide anything you've already handled.</p>
      {list.length === 0 ? (
        <EmptyState icon={<CircleCheck aria-hidden />} title="You're all caught up" />
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <div key={p.key}>
              <PriorityCard priority={p} retailer={retailerOf(o.data, p.retailerId)} />
              <div className="flex justify-end">
                <Button variant="ghost" size="sm" onClick={() => actions.dismiss(p.key)}>
                  Hide this reminder
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}
