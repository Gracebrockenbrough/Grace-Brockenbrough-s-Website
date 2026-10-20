"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import type { DateOnly } from "@/lib/domain/types";
import { KIND_LABEL, buildBuckets, itemKind, type Bucket, type ItemKind } from "@/lib/intelligence/buckets";
import type { Insights } from "@/lib/intelligence/insights";
import { orderHref, retailerOf } from "@/lib/store/selectors";
import type { OrbitData } from "@/lib/store/state";
import { actions } from "@/lib/store/store";
import { Button } from "../ui/button";
import { Field, Input, Toggle } from "../ui/form";
import { Sheet } from "../ui/sheet";
import { ItemArt, KIND_COLOR } from "./item-art";

function BucketCard({ b, onOpen }: { b: Bucket; onOpen: () => void }) {
  const c = KIND_COLOR[b.kind];
  const over = b.goal != null && b.amount > b.goal;
  const pct = Math.round(b.fill * 100);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${b.label}: ${money(b.amount)}${b.goal ? ` of a ${money(b.goal)} goal` : ""}, ${b.count} ${b.count === 1 ? "item" : "items"}. Show items`}
      className="relative flex h-[168px] w-full flex-col overflow-hidden rounded-[20px] border border-line bg-card p-3.5 text-left shadow-[var(--shadow-card)] transition-transform hover:-translate-y-0.5"
    >
      {/* The bucket fills from the bottom in the item's own color. */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 transition-[height] duration-700 ease-out"
        style={{ height: `${Math.max(pct, b.amount > 0 ? 8 : 0)}%`, background: c.tint }}
      />
      <span className="relative flex items-start justify-between gap-2">
        <ItemArt kind={b.kind} className="size-12" />
        <span className="tabular rounded-full bg-card/80 px-2 py-0.5 text-[12px] font-semibold text-muted">
          {b.count} {b.count === 1 ? "item" : "items"}
        </span>
      </span>
      <span className="relative mt-auto">
        <span className="block text-[14px] font-semibold">{b.label}</span>
        <span className="tabular block text-[22px] font-semibold leading-tight tracking-[-0.02em]">{money(b.amount)}</span>
        {b.goal != null && (
          <span className={`block text-[12px] font-medium ${over ? "text-sand-ink" : "text-muted"}`}>
            {over ? `${money(b.amount - b.goal)} over your ${money(b.goal)} goal` : `of ${money(b.goal)} goal`}
          </span>
        )}
      </span>
    </button>
  );
}

/**
 * "What you've bought", as buckets that fill up. Goals are optional and monthly;
 * they never block anything and never turn red.
 */
export function SpendBuckets({ data, r, monthly, today }: { data: OrbitData; r: Insights; monthly: boolean; today: DateOnly }) {
  const goals = data.goals ?? { enabled: false, monthly: {} };
  const useGoals = goals.enabled && monthly;
  const buckets = buildBuckets(
    r.purchases.map((p) => p.item),
    useGoals ? goals.monthly : null,
  );
  const [open, setOpen] = useState<ItemKind | null>(null);
  const [goalInput, setGoalInput] = useState("");
  const openBucket = buckets.find((b) => b.kind === open) ?? null;
  const inBucket = open ? r.purchases.filter((p) => itemKind(p.item) === open) : [];

  return (
    <section aria-labelledby="buckets" className="mt-7">
      <h2 id="buckets" className="text-[17px] font-semibold">
        What you&apos;ve bought
      </h2>
      <p className="mt-0.5 text-[14px] text-muted">
        {useGoals ? "Each bucket fills toward your monthly goal." : "Each bucket fills as you buy. Fuller buckets are where most of your shopping goes."}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-3">
        {buckets.map((b) => (
          <BucketCard
            key={b.kind}
            b={b}
            onOpen={() => {
              setOpen(b.kind);
              setGoalInput(goals.monthly[b.kind] ? String(goals.monthly[b.kind]) : "");
            }}
          />
        ))}
      </div>

      <div className="mt-4 rounded-[18px] border border-line bg-card px-4">
        <Toggle
          label="Monthly goals (optional)"
          description={goals.enabled ? (monthly ? "Tap a bucket to set or change its goal." : "Goals are monthly. Switch to This month to see them.") : "Set a soft goal for any bucket. Nothing is blocked."}
          checked={goals.enabled}
          onChange={(v) => actions.setGoalsEnabled(v)}
        />
      </div>

      <Sheet
        open={openBucket != null}
        onOpenChange={(v) => !v && setOpen(null)}
        title={openBucket ? openBucket.label : ""}
        description={openBucket ? `${money(openBucket.amount)} across ${openBucket.count} ${openBucket.count === 1 ? "item" : "items"} in this period` : undefined}
        footer={
          goals.enabled && openBucket ? (
            <Button
              variant="secondary"
              onClick={() => {
                actions.setGoal(openBucket.kind, goalInput ? Number(goalInput) : null);
                setOpen(null);
              }}
            >
              {goalInput ? "Save Monthly Goal" : "Remove Goal"}
            </Button>
          ) : undefined
        }
      >
        {openBucket && (
          <div className="space-y-4">
            <div className="flex justify-center rounded-2xl py-3" style={{ background: KIND_COLOR[openBucket.kind].tint }}>
              <ItemArt kind={openBucket.kind} className="size-16" />
            </div>
            {inBucket.length === 0 ? (
              <p className="text-[15px] text-muted">Nothing bought in this bucket during this period.</p>
            ) : (
              <ul className="divide-y divide-line rounded-2xl border border-line bg-card">
                {inBucket.map((p) => (
                  <li key={p.item.id}>
                    <Link href={orderHref(p.orderId)} className="flex min-h-14 items-center gap-3 px-3.5 py-2.5 hover:bg-ivory-deep">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{p.item.name}</span>
                        <span className="block text-[13px] text-muted">
                          {retailerOf(data, p.retailerId).name} · {formatDate(p.date, today)}
                        </span>
                      </span>
                      <span className="tabular font-semibold">{money((p.item.unitPrice ?? 0) * p.item.quantity)}</span>
                      <ChevronRight aria-hidden className="size-4 text-muted/60" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {goals.enabled && (
              <Field label={`Monthly goal for ${KIND_LABEL[openBucket.kind].toLowerCase()}`} htmlFor="goal" hint="Leave blank for no goal. It's a guide, not a limit.">
                <Input id="goal" inputMode="decimal" placeholder="$" value={goalInput} onChange={(e) => setGoalInput(e.target.value.replace(/[^0-9.]/g, ""))} />
              </Field>
            )}
          </div>
        )}
      </Sheet>
    </section>
  );
}
