"use client";

import Link from "next/link";
import { ChevronRight, CircleCheck, Unplug } from "lucide-react";
import { Shell, TopBar } from "@/components/layout/shell";
import { AskBar } from "@/components/orbit/ask-bar";
import { FocusCard } from "@/components/orbit/focus-card";
import { TaskRow } from "@/components/orbit/task-row";
import { WeekStrip } from "@/components/orbit/week-strip";
import { ButtonLink, TextLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MoreList } from "@/components/ui/more-list";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { money, plural } from "@/lib/domain/format";
import type { DateOnly } from "@/lib/domain/types";
import { amountAtStake, bucketMeta, buildPriorities, groupByBucket, kindMeta } from "@/lib/intelligence/priorities";
import { retailerOf, walletTotals } from "@/lib/store/selectors";
import type { OrbitData } from "@/lib/store/state";
import { actions, useOrbit } from "@/lib/store/store";

function greeting(name: string) {
  const h = new Date().getHours();
  return `${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}, ${name}`;
}

export default function TodayPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const { data, today, preview, profile } = o;

  const todos = preview.outage === "returns" ? [] : buildPriorities(data, today);
  const [first, ...rest] = todos;
  const week = todos.filter((p) => p.daysLeft != null && p.daysLeft <= 7);
  const atStake = amountAtStake(todos);
  const weekStake = amountAtStake(week);
  const inbox = data.connections.find((c) => c.id === "sample_inbox");
  const isEmpty = data.orders.length === 0 && data.wallet.length === 0;

  return (
    <Shell>
      <TopBar />
      <div className="pb-5 pt-3">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.025em]">{greeting(profile.firstName)}</h1>
        <p className="mt-1 text-[17px] text-muted">
          {isEmpty
            ? "Let's bring your purchases into Orbit."
            : week.length
              ? `${plural(week.length, "thing")} to do this week.`
              : todos.length
                ? "Nothing due this week."
                : "You're all caught up."}
        </p>
      </div>

      <AskBar />

      {inbox?.status === "disconnected" && !isEmpty && (
        <Notice tone="warning" className="mt-4" title="Email disconnected" action={<TextLink href="/settings/#email">Reconnect</TextLink>}>
          New orders and refunds won&apos;t appear automatically.
        </Notice>
      )}

      {isEmpty ? (
        <Card className="mt-6">
          <EmptyState icon={<Unplug aria-hidden />} title="Nothing here yet" action={<ButtonLink href="/add/">Add a Purchase</ButtonLink>}>
            Forward an order confirmation or upload a receipt, and Orbit will track the return window for you.
          </EmptyState>
        </Card>
      ) : preview.outage === "returns" ? (
        <div className="mt-6">
          <ErrorState title="Your to-do list is temporarily unavailable" onRetry={() => actions.setPreview({ outage: "none" })}>
            Your wallet still works. We&apos;ll bring deadlines back as soon as we reconnect.
          </ErrorState>
        </div>
      ) : todos.length === 0 ? (
        <Card className="mt-6 flex items-center gap-3 p-4">
          <span className="flex size-11 items-center justify-center rounded-full bg-sage text-sage-ink">
            <CircleCheck aria-hidden className="size-5" />
          </span>
          <div>
            <p className="font-semibold">You&apos;re all caught up</p>
            <p className="text-[15px] text-muted">No deadlines, labels or late refunds. We&apos;ll tell you when something needs you.</p>
          </div>
        </Card>
      ) : (
        <>
          {/* Money on the line + the week ahead */}
          <section aria-labelledby="stake" className="mt-6 rounded-[22px] bg-ivory-deep p-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p id="stake" className="text-[14px] font-semibold text-muted">Money on the line</p>
                <p className="tabular text-[34px] font-semibold leading-none tracking-[-0.03em]">{money(atStake)}</p>
              </div>
              <p className="pb-0.5 text-right text-[14px] text-muted">
                <span className="tabular font-semibold text-navy">{money(weekStake)}</span> due in 7 days
                <br />
                across {plural(todos.length, "to-do")}
              </p>
            </div>
            <div className="mt-4">
              <WeekStrip items={todos} today={today} />
            </div>
          </section>

          {/* The single most urgent thing */}
          <div className="mt-6">
            <FocusCard
              emoji={kindMeta[first.kind].emoji}
              retailer={retailerOf(data, first.retailerId)}
              label={kindMeta[first.kind].label.replace(/ by$/, "")}
              title={first.title}
              why={first.status}
              amount={first.amount}
              daysLeft={first.daysLeft}
              estimated={first.estimated && first.kind !== "refund_late"}
              action={first.action}
            />
          </div>

          {/* Everything else, by urgency */}
          {groupByBucket(rest).map(({ bucket, items }) => (
            <section key={bucket} aria-labelledby={`b-${bucket}`} className="mt-7">
              <div className="mb-2.5 flex items-baseline justify-between gap-3">
                <h2 id={`b-${bucket}`} className="text-[17px] font-semibold">
                  {bucketMeta[bucket].title} <span className="tabular font-normal text-muted">· {items.length}</span>
                </h2>
                <span className="tabular text-[14px] text-muted">{money(amountAtStake(items))}</span>
              </div>
              <MoreList limit={3}>
                {items.map((p) => (
                  <TaskRow key={p.key} p={p} retailer={retailerOf(data, p.retailerId)} today={today} />
                ))}
              </MoreList>
            </section>
          ))}
        </>
      )}

      {!isEmpty && <WalletPeek data={data} today={today} outage={preview.outage === "wallet"} />}
    </Shell>
  );
}

function WalletPeek({ data, today, outage }: { data: OrbitData; today: DateOnly; outage: boolean }) {
  const t = walletTotals(data, today);
  if (outage)
    return (
      <div className="mt-8">
        <ErrorState title="Wallet is temporarily unavailable" onRetry={() => actions.setPreview({ outage: "none" })}>
          Your returns still work. Your cards are safe.
        </ErrorState>
      </div>
    );
  return (
    <Link href="/wallet/" className="mt-8 flex min-h-16 items-center gap-4 rounded-[18px] border border-line bg-card px-4 py-3 shadow-[var(--shadow-card)] hover:bg-ivory-deep">
      <span aria-hidden className="flex size-11 items-center justify-center rounded-[14px] bg-terracotta-soft text-[21px]">
        💳
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-muted">Wallet</span>
        <span className="block text-[16px] font-semibold">
          <span className="tabular">{money(t.total)}</span> to spend at {plural(t.retailers, "store")}
        </span>
        {t.unverified.length > 0 && <span className="block text-[13px] text-sand-ink">{t.unverified.length} balance not verified recently</span>}
      </span>
      <ChevronRight aria-hidden className="size-5 text-muted/60" />
    </Link>
  );
}
