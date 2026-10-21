"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { PriorityRow } from "@/components/orbit/priority-row";
import { DoneCheck } from "@/components/ui/done-check";
import { plural } from "@/lib/domain/format";
import { sumMoney } from "@/lib/domain/money";
import { money } from "@/lib/domain/format";
import { todayPlan } from "@/lib/intelligence/today";
import { retailerOf } from "@/lib/store/selectors";
import { useOrbit } from "@/lib/store/store";

/** The full list behind Today, split the same way: needs you, later, and tracked. */
export default function AttentionPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const { now, later, watching } = todayPlan(o.data, o.today);
  const group = (title: string, list: typeof now, hint: string) =>
    list.length > 0 && (
      <section className="mt-6" aria-label={title}>
        <div className="mb-2.5 flex items-baseline justify-between">
          <h2 className="font-display text-[22px] leading-none">
            {title} <span className="tabular font-sans text-[15px] font-medium tracking-normal text-muted">· {list.length}</span>
          </h2>
          <span className="tabular text-[14px] text-muted">{money(sumMoney(list.map((p) => p.amount)))}</span>
        </div>
        <p className="-mt-1 mb-2.5 text-[14px] text-muted">{hint}</p>
        <div className="space-y-2.5">
          {list.map((p, i) => (
            <PriorityRow key={p.key} p={p} retailer={retailerOf(o.data, p.retailerId)} today={o.today} prominent={i === 0 && title.startsWith("Needs")} />
          ))}
        </div>
      </section>
    );
  return (
    <Shell>
      <BackBar fallback="/" title="Everything ahead" />
      <p className="pb-1 pt-1 text-[15px] text-muted">Soonest first. Amounts are purchase prices, not money owed.</p>
      {now.length === 0 && later.length === 0 && (
        <div className="mt-6 flex items-center gap-4">
          <DoneCheck className="size-12" />
          <p className="font-display text-[24px]">All taken care of.</p>
        </div>
      )}
      {group("Needs you this week", now, "Overdue, due within 7 days, or waiting on your answer.")}
      {group("Later", later, "Deadlines more than a week away.")}
      {watching.length > 0 && (
        <section className="mt-6" aria-label="Tote is watching">
          <h2 className="font-display text-[22px] leading-none">
            Tote is watching <span className="tabular font-sans text-[15px] font-medium tracking-normal text-muted">· {watching.length}</span>
          </h2>
          <p className="mb-2 mt-1 text-[14px] text-muted">Nothing to do. We&apos;ll tell you if {plural(watching.length, "order") === "1 order" ? "it changes" : "anything changes"}.</p>
          <ul className="divide-y divide-line rounded-[18px] bg-card px-4 shadow-[var(--shadow-card)]">
            {watching.map((w) => (
              <li key={w.orderId}>
                <Link href={w.href} className="flex min-h-14 items-center gap-3 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{w.title}</span>
                    <span className="block truncate text-[13px] text-muted">
                      {retailerOf(o.data, w.retailerId).name} · {w.label}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="size-4 text-muted/60" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}
