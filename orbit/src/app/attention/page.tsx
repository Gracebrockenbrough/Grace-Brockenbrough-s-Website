"use client";

import { CircleCheck } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { PriorityRow } from "@/components/orbit/priority-row";
import { EmptyState } from "@/components/ui/states";
import { money } from "@/lib/domain/format";
import { amountAtStake, bucketMeta, buildPriorities, groupByBucket } from "@/lib/intelligence/priorities";
import { retailerOf } from "@/lib/store/selectors";
import { useOrbit } from "@/lib/store/store";

export default function AttentionPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const list = buildPriorities(o.data, o.today);
  return (
    <Shell>
      <BackBar fallback="/" title="Needs attention" />
      <p className="pb-2 pt-1 text-[16px] text-muted">Everything with a deadline or a next step, soonest first. Amounts are purchase prices, not money owed.</p>
      {list.length === 0 ? (
        <EmptyState icon={<CircleCheck aria-hidden />} title="You're all caught up" />
      ) : (
        groupByBucket(list).map(({ bucket, items }) => (
          <section key={bucket} className="mt-6" aria-labelledby={`b-${bucket}`}>
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 id={`b-${bucket}`} className="text-[17px] font-semibold">
                {bucketMeta[bucket].title} <span className="tabular font-normal text-muted">· {items.length}</span>
              </h2>
              <span className="tabular text-[14px] text-muted">{money(amountAtStake(items))}</span>
            </div>
            <div className="space-y-2.5">
              {items.map((p) => (
                <PriorityRow key={p.key} p={p} retailer={retailerOf(o.data, p.retailerId)} today={o.today} />
              ))}
            </div>
          </section>
        ))
      )}
    </Shell>
  );
}
