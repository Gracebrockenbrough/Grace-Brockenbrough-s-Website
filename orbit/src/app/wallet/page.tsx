"use client";

import Link from "next/link";
import { Gift, Plus, WalletCards } from "lucide-react";
import { PageHeader, Shell } from "@/components/layout/shell";
import { WalletCardFace } from "@/components/orbit/wallet-card";
import { ButtonLink, IconLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { daysBetween } from "@/lib/domain/dates";
import { money, plural } from "@/lib/domain/format";
import type { WalletItem } from "@/lib/domain/types";
import { isExpired, retailerOf, walletTotals } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";


/** Visible strip of each stacked card, in px. */
const STRIP = 84;
const CARD_H = 212;

export default function WalletPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const { data, today, preview } = o;

  const header = (
    <PageHeader
      title="Your Wallet"
      subtitle="All your shopping credits, together."
      action={
        <IconLink href="/wallet/add/" label="Add a gift card or credit">
          <Plus aria-hidden className="size-[22px]" />
        </IconLink>
      }
    />
  );

  if (preview.outage === "wallet")
    return (
      <Shell>
        {header}
        <ErrorState title="Wallet is temporarily unavailable" onRetry={() => actions.setPreview({ outage: "none" })}>
          Your cards are safe. Returns and labels still work.
        </ErrorState>
      </Shell>
    );

  const sortKey = (w: WalletItem) => (w.expiration.kind === "date" ? daysBetween(today, w.expiration.date) : 10_000) - (w.balance ?? 0) / 1000;
  const active = data.wallet.filter((w) => !isExpired(w, today)).sort((a, b) => sortKey(a) - sortKey(b));
  const expired = data.wallet.filter((w) => isExpired(w, today));
  const t = walletTotals(data, today);

  return (
    <Shell>
      {header}

      {active.length === 0 ? (
        <EmptyState
          icon={<WalletCards aria-hidden />}
          title="Your wallet is empty"
          action={<ButtonLink href="/wallet/add/">Add a Gift Card</ButtonLink>}
        >
          Add gift cards and store credit, and Tote will keep each balance with its store.
        </EmptyState>
      ) : (
        <>
          <section aria-label="Total known balance" className="pb-6">
            <p className="text-[15px] text-muted">Total known balance</p>
            <p className="tabular mt-0.5 text-[40px] font-semibold leading-none tracking-[-0.03em]">{money(t.total)}</p>
            <p className="mt-2 text-[15px] text-muted">Across {plural(t.retailers, "store")}. Each balance can only be spent at its own store, so this isn&apos;t cash.</p>
            {t.unverified.length > 0 && (
              <Notice tone="warning" className="mt-4">
                {t.unverified.map((w) => retailerOf(data, w.retailerId).name).join(", ")} {t.unverified.length === 1 ? "balance hasn't" : "balances haven't"} been verified recently.
              </Notice>
            )}
          </section>

          {/* Apple Wallet-style stack: each card's top strip shows the store, balance, type and status. */}
          <ul aria-label="Cards" className="relative">
            {active.map((w, i) => {
              const r = retailerOf(data, w.retailerId);
              return (
                <li key={w.id} className="relative transition-transform duration-200 hover:-translate-y-1 focus-within:-translate-y-1" style={{ marginTop: i ? -(CARD_H - STRIP) : 0, zIndex: i + 1 }}>
                  <Link href={`/wallet/card/?id=${w.id}`} aria-label={`${r.name}, ${money(w.balance)}`} className="block rounded-[20px]">
                    <WalletCardFace item={w} retailer={r} today={today} className="aspect-auto h-[212px]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Link href="/wallet/gift/" className="mt-6 flex min-h-16 items-center gap-4 rounded-[18px] border border-line bg-card px-4 py-3 shadow-[var(--shadow-card)] hover:bg-ivory-deep">
        <span className="flex size-11 items-center justify-center rounded-full bg-terracotta-soft text-terracotta">
          <Gift aria-hidden className="size-5" />
        </span>
        <span className="flex-1">
          <span className="block text-[16px] font-semibold">Send a Gift</span>
          <span className="block text-[14px] text-muted">A digital gift card from a store they love</span>
        </span>
      </Link>

      {expired.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Expired</h2>
          <ul className="divide-y divide-line rounded-[18px] border border-line bg-card">
            {expired.map((w) => (
              <li key={w.id}>
                <Link href={`/wallet/card/?id=${w.id}`} className="flex min-h-14 items-center justify-between px-4 text-muted">
                  <span>{retailerOf(data, w.retailerId).name}</span>
                  <span className="tabular">{money(w.balance)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}
