"use client";

import Link from "next/link";
import { CircleCheck, Unplug } from "lucide-react";
import { Shell, TopBar } from "@/components/layout/shell";
import { PriorityCard } from "@/components/orbit/priority-card";
import { ButtonLink, TextLink } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { ago } from "@/lib/domain/dates";
import { money, plural } from "@/lib/domain/format";
import { buildPriorities } from "@/lib/intelligence/priorities";
import { retailerOf, walletTotals } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";
import type { OrbitData } from "@/lib/store/state";
import type { DateOnly } from "@/lib/domain/types";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning!";
  if (h < 18) return "Good afternoon!";
  return "Good evening!";
}

function latestActivity(data: OrbitData) {
  const confirmed = data.refunds
    .filter((f) => f.confirmed)
    .sort((a, b) => (b.confirmed!.at > a.confirmed!.at ? 1 : -1))[0];
  if (!confirmed) return null;
  const order = data.orders.find((o) => o.id === confirmed.orderId);
  const retailer = order ? retailerOf(data, order.retailerId) : null;
  return { refund: confirmed, retailer };
}

export default function TodayPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const { data, today, preview } = o;

  const priorities = preview.outage === "returns" ? [] : buildPriorities(data, today);
  const shown = priorities.slice(0, 3);
  const inbox = data.connections.find((c) => c.id === "sample_inbox");
  const isEmpty = data.orders.length === 0 && data.wallet.length === 0;

  return (
    <Shell>
      <TopBar />
      <div className="pb-6 pt-4">
        <h1 className="text-[32px] font-semibold leading-tight tracking-[-0.025em]">{greeting()}</h1>
        <p className="mt-1 text-[17px] text-muted">{isEmpty ? "Let's bring your purchases into Orbit." : "Here's what needs your attention."}</p>
      </div>

      {inbox?.status === "disconnected" && !isEmpty && (
        <Notice
          tone="warning"
          className="mb-5"
          title="Email disconnected"
          action={<TextLink href="/settings/#email">Reconnect</TextLink>}
        >
          New orders and refunds won't appear automatically.
        </Notice>
      )}

      {isEmpty ? (
        <Card className="mb-8">
          <EmptyState
            icon={<Unplug aria-hidden />}
            title="Nothing here yet"
            action={<ButtonLink href="/add/">Add a Purchase</ButtonLink>}
          >
            Forward an order confirmation or upload a receipt, and Orbit will track the return window for you.
          </EmptyState>
        </Card>
      ) : (
        <section aria-labelledby="attention" className="mb-8">
          <SectionTitle action={priorities.length > 3 ? <TextLink href="/attention/">View all {priorities.length}</TextLink> : undefined}>
            <span id="attention">Needs attention</span>
          </SectionTitle>
          {preview.outage === "returns" ? (
            <ErrorState title="Returns are temporarily unavailable" onRetry={() => actions.setPreview({ outage: "none" })}>
              Your wallet still works. We'll bring deadlines back as soon as we reconnect.
            </ErrorState>
          ) : shown.length ? (
            <div className="space-y-3">
              {shown.map((p) => (
                <PriorityCard key={p.key} priority={p} retailer={retailerOf(data, p.retailerId)} />
              ))}
            </div>
          ) : (
            <Card className="flex items-center gap-3 p-4">
              <span className="flex size-10 items-center justify-center rounded-full bg-sage text-sage-ink">
                <CircleCheck aria-hidden className="size-5" />
              </span>
              <div>
                <p className="font-semibold">You're all caught up</p>
                <p className="text-[15px] text-muted">We'll let you know when something needs you.</p>
              </div>
            </Card>
          )}
        </section>
      )}

      {!isEmpty && <WalletPreview data={data} today={today} outage={preview.outage === "wallet"} />}
      {!isEmpty && <RecentActivity data={data} today={today} />}
    </Shell>
  );
}

function WalletPreview({ data, today, outage }: { data: OrbitData; today: DateOnly; outage: boolean }) {
  const t = walletTotals(data, today);
  return (
    <section aria-labelledby="wallet-preview" className="mb-8">
      <SectionTitle>
        <span id="wallet-preview">Wallet</span>
      </SectionTitle>
      {outage ? (
        <ErrorState title="Wallet is temporarily unavailable" onRetry={() => actions.setPreview({ outage: "none" })}>
          Your returns still work. Your cards are safe.
        </ErrorState>
      ) : (
        <Card className="p-5">
          <p className="text-[15px] text-muted">Known gift card & credit balances</p>
          <p className="tabular mt-1 text-[36px] font-semibold leading-none tracking-[-0.03em]">{money(t.total)}</p>
          <p className="mt-2 text-[15px] text-muted">
            Across {plural(t.retailers, "retailer")}. Each balance can only be used at its store.
          </p>
          {t.unverified.length > 0 && (
            <Notice tone="warning" className="mt-4">
              {t.unverified.length === 1 ? "1 balance hasn't" : `${t.unverified.length} balances haven't`} been verified recently.
            </Notice>
          )}
          <ButtonLink href="/wallet/" variant="secondary" size="md" className="mt-4 w-full">
            Open Wallet
          </ButtonLink>
        </Card>
      )}
    </section>
  );
}

function RecentActivity({ data, today }: { data: OrbitData; today: DateOnly }) {
  const a = latestActivity(data);
  if (!a) return null;
  return (
    <section aria-labelledby="recent">
      <SectionTitle>
        <span id="recent">Recent</span>
      </SectionTitle>
      <Link href={`/returns/refund/?id=${a.refund.id}`} className="flex min-h-14 items-center gap-3 rounded-2xl px-1 py-2 hover:bg-ivory-deep">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-sage text-sage-ink">
          <CircleCheck aria-hidden className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-medium">
            {a.retailer?.name} {a.refund.destination === "store_credit" ? "store credit issued" : "refund received"}
          </span>
          <span className="block text-[14px] text-muted">
            {money(a.refund.confirmed!.amount)} · confirmed {ago(a.refund.confirmed!.at, today)}
          </span>
        </span>
      </Link>
    </section>
  );
}
