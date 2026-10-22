"use client";

import Link from "next/link";
import { ChevronRight, Eye, Unplug, Compass, WalletCards, X } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { TabBanner } from "@/components/layout/tab-banner";
import { AskBar } from "@/components/orbit/ask-bar";
import { PriorityRow } from "@/components/orbit/priority-row";
import { BagsSketch } from "@/components/orbit/art";
import { AgendaRow, NextUpCard, WeekStrip } from "@/components/orbit/timeline";
import { ButtonLink, TextLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { DoneCheck } from "@/components/ui/done-check";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { money, plural } from "@/lib/domain/format";
import { calendarEvents } from "@/lib/intelligence/calendar";
import { todayPlan } from "@/lib/intelligence/today";
import { connectionProblems, retailerOf, walletTotals } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

function greeting(name: string) {
  const h = new Date().getHours();
  return `${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}, ${name}`;
}

/**
 * Today: one clear next action, the week at a glance, a short agenda, and everything Penny
 * is quietly tracking folded away. Counts come from one plan so they always agree.
 */
export default function TodayPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const { data, today, preview, profile } = o;

  const outage = preview.outage === "returns";
  const plan = outage ? { now: [], later: [], watching: [], agenda: [] } : todayPlan(data, today);
  const [hero, second] = plan.now;
  const wallet = walletTotals(data, today);
  const problems = connectionProblems(data);
  const review = data.jobs.filter((j) => j.status === "needs_review").length;
  const isEmpty = data.orders.length === 0 && data.wallet.length === 0;
  const events = calendarEvents(data, today);
  const sharedCount = (data.collections ?? []).filter((c) => c.sharedWithMe).length;

  const summary = isEmpty
    ? "Let's bring your purchases into Penny."
    : plan.now.length
      ? null
      : plan.watching.length
        ? `Nothing needs you this week. Penny is watching ${plural(plan.watching.length, "order")}.`
        : "Nothing needs you this week.";

  return (
    <Shell>
      <TabBanner
        tab="today"
        title={greeting(profile.firstName)}
        subtitle={
          summary ?? (
            <>
              <span className="font-semibold text-navy">
                {plural(plan.now.length, "thing")} {plan.now.length === 1 ? "needs" : "need"} you this week.
              </span>{" "}
              {plan.watching.length ? `Penny is watching ${plan.watching.length} more.` : ""}
            </>
          )
        }
        right={<span className="text-[13px] font-medium text-muted">{new Date(`${today}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}</span>}
      />
      <div className="h-4" />

      <AskBar />

      {problems.length > 0 && !isEmpty && (
        <Notice
          tone="warning"
          className="mt-4"
          title={problems.length === 1 ? `${problems[0].label}: ${problems[0].status === "sync_failed" ? "sync failed" : "needs reconnecting"}` : `${problems.length} inboxes need attention`}
          action={<TextLink href={problems.length === 1 ? `/settings/account/?id=${problems[0].id}` : "/settings/#email"}>{problems[0].status === "sync_failed" ? "Retry" : "Reconnect"}</TextLink>}
        >
          New orders and refund emails from {problems.length === 1 ? "it" : "them"} won&apos;t appear until this is fixed.
        </Notice>
      )}
      {review > 0 && !isEmpty && (
        <Notice tone="info" className="mt-3" title={`${plural(review, "email")} need a quick check`} action={<TextLink href="/settings/history/">Review</TextLink>}>
          We couldn&apos;t read every detail, so we didn&apos;t guess.
        </Notice>
      )}

      {isEmpty ? (
        <Card className="mt-6">
          <EmptyState icon={<Unplug aria-hidden />} title="Nothing here yet" action={<ButtonLink href="/add/">Add a Purchase</ButtonLink>}>
            Connect an inbox, forward an order email, or upload a receipt, and Penny will track the return window for you.
          </EmptyState>
        </Card>
      ) : outage ? (
        <div className="mt-6">
          <ErrorState title="Your to-dos are temporarily unavailable" onRetry={() => actions.setPreview({ outage: "none" })}>
            Your wallet still works. We&apos;ll bring deadlines back as soon as we reconnect.
          </ErrorState>
        </div>
      ) : (
        <>
          {/* 1. The next action */}
          <section aria-label="Next up" className="mt-5">
            {hero ? (
              <>
                <NextUpCard p={hero} data={data} today={today} />
                {second && (
                  <div className="mt-2.5">
                    <PriorityRow p={second} retailer={retailerOf(data, second.retailerId)} today={today} />
                  </div>
                )}
                {plan.now.length > 2 && (
                  <Link href="/attention/" className="mt-1 flex min-h-11 items-center justify-between px-1 text-[15px] font-semibold">
                    {plural(plan.now.length - 2, "more thing")} this week
                    <ChevronRight aria-hidden className="size-5 text-muted" />
                  </Link>
                )}
              </>
            ) : (
              <Card className="flex items-center gap-4 p-5">
                <DoneCheck className="size-12" />
                <span>
                  <span className="font-display block text-[24px] leading-tight">All taken care of.</span>
                  <span className="block text-[15px] text-muted">{plan.later.length ? `Next decision: ${plan.later[0].title}, ${plan.later[0].dueDate ? `in ${plan.later[0].daysLeft} days` : "later"}.` : "No deadlines, labels or refunds need you."}</span>
                </span>
              </Card>
            )}
          </section>

          {/* 2. The week at a glance */}
          <div className="mt-8">
            <WeekStrip events={events} today={today} data={data} />
          </div>

          {/* 3. Coming up, in order */}
          {plan.agenda.length > 0 && (
            <section aria-labelledby="agenda" className="mt-6">
              <h2 id="agenda" className="font-display text-[22px] leading-none">
                Coming up
              </h2>
              <ul className="mt-1 divide-y divide-line">
                {plan.agenda.map((e) => (
                  <AgendaRow key={e.id} e={e} data={data} today={today} />
                ))}
              </ul>
            </section>
          )}

          {/* 4. What Penny is tracking for you */}
          {plan.watching.length > 0 && (
            <Card className="mt-6 overflow-hidden">
              <Disclosure title="Penny is watching" summary={`${plural(plan.watching.length, "order")} on the way, in transit or waiting on a store`} icon={<Eye aria-hidden className="size-5" />}>
                <ul className="divide-y divide-line">
                  {plan.watching.map((w) => (
                    <li key={w.orderId}>
                      <Link href={w.href} className="flex min-h-12 items-center gap-3 py-2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{w.title}</span>
                          <span className="block truncate text-[13px] text-muted">
                            {retailerOf(data, w.retailerId).name} · {w.label}
                          </span>
                        </span>
                        <ChevronRight aria-hidden className="size-4 text-muted/60" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </Disclosure>
            </Card>
          )}

          {/* 5. Discover stays below anything urgent, and can be hidden. */}
          {(data.prefs.circlePreview ?? true) && sharedCount > 0 && (
            <section aria-label="From Discover" className="relative mt-6 overflow-hidden rounded-[22px] border border-line bg-[#FAF8F4] px-4 py-4">
              <BagsSketch className="pointer-events-none absolute -right-2 bottom-0 h-16 opacity-80" />
              <div className="relative flex items-center gap-3">
                <Compass aria-hidden className="size-5 shrink-0 text-circle" />
                <Link href="/discover/" className="min-w-0 flex-1 pr-20">
                  <span className="block text-[15px] font-semibold">{sharedCount === 1 ? "A list was" : `${sharedCount} lists were`} shared with you</span>
                </Link>
                <button type="button" aria-label="Hide Discover on Today" onClick={() => actions.setPrefs({ circlePreview: false })} className="relative -mr-2 inline-flex size-11 items-center justify-center rounded-full bg-white/80 text-muted hover:bg-white">
                  <X aria-hidden className="size-4" />
                </button>
              </div>
            </section>
          )}
        </>
      )}

      {data.wallet.length > 0 && preview.outage !== "wallet" && (
        <Link href="/wallet/" className="mt-6 flex min-h-16 items-center gap-3 border-t border-line pt-4 text-left">
          <span className="flex size-10 items-center justify-center rounded-xl bg-wallet-soft text-wallet">
            <WalletCards aria-hidden className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold">{money(wallet.total)} in your wallet</span>
            <span className="block text-[14px] text-muted">
              {plural(wallet.count, "card")} at {plural(wallet.retailers, "store")}
              {wallet.unverified.length ? ` · ${wallet.unverified.length} to confirm` : ""}
            </span>
          </span>
          <ChevronRight aria-hidden className="size-5 text-muted" />
        </Link>
      )}
    </Shell>
  );
}
