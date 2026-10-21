"use client";

import Link from "next/link";
import { ChevronRight, CircleCheck, Unplug, WalletCards } from "lucide-react";
import { Shell, TopBar } from "@/components/layout/shell";
import { AskBar } from "@/components/orbit/ask-bar";
import { PriorityRow } from "@/components/orbit/priority-row";
import { WeekCalendar } from "@/components/orbit/week-calendar";
import { ButtonLink, TextLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { money, plural } from "@/lib/domain/format";
import { sumMoney } from "@/lib/domain/money";
import { presetSession } from "@/lib/hooks/useSessionState";
import { calendarEvents } from "@/lib/intelligence/calendar";
import { buildPriorities, potentialReturnValue } from "@/lib/intelligence/priorities";
import { connectionProblems, retailerOf, walletTotals } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

function greeting(name: string) {
  const h = new Date().getHours();
  return `${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}, ${name}`;
}

/** Today: the few things that need you, the week ahead, and a way into the wallet. */
export default function TodayPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const { data, today, preview, profile } = o;

  const outage = preview.outage === "returns";
  const todos = outage ? [] : buildPriorities(data, today);
  const needs = todos.filter((p) => p.bucket !== "updates");
  const top = (needs.length ? needs : todos).slice(0, 3);
  const potential = potentialReturnValue(todos);
  const pendingRefunds = data.refunds.filter((f) => !f.arrivedAt && (f.expected || (f.confirmed && f.confirmed.by === "retailer_email" && f.destination !== "store_credit")));
  const refundAmount = sumMoney(pendingRefunds.map((f) => f.confirmed?.amount ?? f.expected?.amount));
  const wallet = walletTotals(data, today);
  const problems = connectionProblems(data);
  const review = data.jobs.filter((j) => j.status === "needs_review").length;
  const isEmpty = data.orders.length === 0 && data.wallet.length === 0;

  return (
    <Shell>
      <TopBar />
      <div className="pb-4 pt-2">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.025em]">{greeting(profile.firstName)}</h1>
        <p className="mt-1 text-[17px] text-muted">
          {isEmpty ? "Let's bring your purchases into Tote." : needs.length ? `${plural(needs.length, "thing")} ${needs.length === 1 ? "needs" : "need"} you.` : "You're all caught up."}
        </p>
      </div>

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
            Connect an inbox, forward an order email, or upload a receipt, and Tote will track the return window for you.
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
          <section aria-labelledby="attention" className="mt-6">
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 id="attention" className="text-[17px] font-semibold">
                Needs you
              </h2>
              {todos.length > top.length && <TextLink href="/attention/">See all {todos.length}</TextLink>}
            </div>
            {top.length ? (
              <div className="space-y-2.5">
                {top.map((p, i) => (
                  <PriorityRow key={p.key} p={p} retailer={retailerOf(data, p.retailerId)} today={today} prominent={i === 0} />
                ))}
              </div>
            ) : (
              <Card className="flex items-center gap-3 p-4">
                <span className="flex size-11 items-center justify-center rounded-full bg-sage text-sage-ink">
                  <CircleCheck aria-hidden className="size-5" />
                </span>
                <p className="text-[15px] text-muted">No deadlines, labels or refunds need you right now.</p>
              </Card>
            )}
          </section>

          {/* Only the money tied to what's above: what could come back, and what's on its way. */}
          {(potential.count > 0 || pendingRefunds.length > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {potential.count > 0 && (
                <Link href="/attention/" className="rounded-[20px] bg-ivory-deep px-4 py-3 hover:bg-[#ebe8e1]">
                  <span className="block text-[13px] font-semibold text-muted">Could come back</span>
                  <span className="tabular block text-[22px] font-semibold tracking-[-0.02em]">{money(potential.amount)}</span>
                  <span className="block text-[13px] text-muted">{plural(potential.count, "return")} due in 2 weeks</span>
                </Link>
              )}
              {pendingRefunds.length > 0 && (
                <Link href="/returns/" onClick={() => presetSession("purchases-filter", "refunds")} className="rounded-[20px] bg-ivory-deep px-4 py-3 hover:bg-[#ebe8e1]">
                  <span className="block text-[13px] font-semibold text-muted">Refunds on the way</span>
                  <span className="tabular block text-[22px] font-semibold tracking-[-0.02em]">{money(refundAmount)}</span>
                  <span className="block text-[13px] text-muted">{plural(pendingRefunds.length, "refund")}, not confirmed yet</span>
                </Link>
              )}
            </div>
          )}

          <div className="mt-8">
            <WeekCalendar events={calendarEvents(data, today)} today={today} data={data} />
          </div>
        </>
      )}

      {data.wallet.length > 0 && preview.outage !== "wallet" && (
        <Link href="/wallet/" className="mt-8 flex min-h-16 items-center gap-3 border-t border-line pt-4 text-left">
          <span className="flex size-10 items-center justify-center rounded-xl bg-ivory-deep">
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
