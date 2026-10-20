"use client";

import Link from "next/link";
import { ChevronRight, CircleCheck, Unplug } from "lucide-react";
import { Shell, TopBar } from "@/components/layout/shell";
import { AskBar } from "@/components/orbit/ask-bar";
import { PriorityRow } from "@/components/orbit/priority-row";
import { WeekCalendar } from "@/components/orbit/week-calendar";
import { ButtonLink, TextLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { money, plural } from "@/lib/domain/format";
import { calendarEvents } from "@/lib/intelligence/calendar";
import { buildPriorities, potentialReturnValue } from "@/lib/intelligence/priorities";
import { retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

function greeting(name: string) {
  const h = new Date().getHours();
  return `${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}, ${name}`;
}

export default function TodayPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const { data, today, preview, profile } = o;

  const outage = preview.outage === "returns";
  const todos = outage ? [] : buildPriorities(data, today);
  const top = todos.slice(0, 3);
  const potential = potentialReturnValue(todos);
  const inbox = data.connections.find((c) => c.id === "sample_inbox");
  const isEmpty = data.orders.length === 0 && data.wallet.length === 0;
  const inboxProblem = inbox && (inbox.status === "disconnected" || inbox.status === "sync_failed" || inbox.status === "reauth_required");

  return (
    <Shell>
      <TopBar />
      <div className="pb-4 pt-2">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.025em]">{greeting(profile.firstName)}</h1>
        <p className="mt-1 text-[17px] text-muted">
          {isEmpty ? "Let's bring your purchases into Orbit." : todos.length ? `${plural(todos.length, "thing")} ${todos.length === 1 ? "needs" : "need"} your attention.` : "You're all caught up."}
        </p>
      </div>

      <AskBar />

      {inboxProblem && !isEmpty && (
        <Notice
          tone="warning"
          className="mt-4"
          title={inbox.status === "sync_failed" ? "Email sync failed" : inbox.status === "reauth_required" ? "Email needs reconnecting" : "Email disconnected"}
          action={<TextLink href="/settings/#email">{inbox.status === "sync_failed" ? "Retry sync" : "Reconnect"}</TextLink>}
        >
          New orders and refund emails won&apos;t appear until this is fixed.
        </Notice>
      )}

      {isEmpty ? (
        <Card className="mt-6">
          <EmptyState icon={<Unplug aria-hidden />} title="Nothing here yet" action={<ButtonLink href="/add/">Add a Purchase</ButtonLink>}>
            Forward an order confirmation or upload a receipt, and Orbit will track the return window for you.
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
          {potential.count > 0 && (
            <Link href="/attention/" className="mt-5 block rounded-[20px] bg-ivory-deep px-4 py-3.5 hover:bg-[#ebe8e1]">
              <span className="block text-[14px] font-semibold text-muted">Potential return value</span>
              <span className="flex items-end justify-between gap-3">
                <span className="tabular text-[30px] font-semibold leading-tight tracking-[-0.03em]">{money(potential.amount)}</span>
                <ChevronRight aria-hidden className="mb-1.5 size-5 text-muted" />
              </span>
              <span className="block text-[14px] text-muted">
                From {plural(potential.count, "purchase")} with return deadlines in the next 2 weeks.
              </span>
            </Link>
          )}

          <section aria-labelledby="attention" className="mt-6">
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 id="attention" className="text-[17px] font-semibold">
                Needs attention
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

          <div className="mt-8">
            <WeekCalendar events={calendarEvents(data, today)} today={today} data={data} />
          </div>
        </>
      )}

      {!isEmpty && (
        <Link href="/settings/" className="mt-8 flex min-h-16 items-center gap-3 border-t border-line pt-4 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-[16px] font-semibold">Your shopping overview</span>
            <span className="block text-[14px] text-muted">Spending, credits, and things you&apos;ve saved</span>
          </span>
          <ChevronRight aria-hidden className="size-5 text-muted" />
        </Link>
      )}
    </Shell>
  );
}
