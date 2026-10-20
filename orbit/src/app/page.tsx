"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, CircleCheck, Clock3, Heart, SlidersHorizontal, Star, Tag, Ticket, Unplug, WalletCards } from "lucide-react";
import { Shell, TopBar } from "@/components/layout/shell";
import { AskBar } from "@/components/orbit/ask-bar";
import { DiscoverRow, DiscoverTile } from "@/components/orbit/discover-tile";
import { IndicatorBadge, toneFor } from "@/components/orbit/indicator";
import { DuePill } from "@/components/orbit/task-row";
import { ButtonLink, TextLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Notice } from "@/components/ui/notice";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { BRAND } from "@/lib/brand";
import { money, plural } from "@/lib/domain/format";
import { activeWishes, buildFeed, codeTrust, salesForWish } from "@/lib/intelligence/discover";
import { buildPriorities, kindMeta } from "@/lib/intelligence/priorities";
import { retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

function greeting(name: string) {
  const h = new Date().getHours();
  return `${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}, ${name}`;
}

function Discover() {
  const o = useOrbit();
  const router = useRouter();
  const needsOnboarding = o && !o.data.shopping.onboarded && !o.preview.emptyAccount;
  useEffect(() => {
    if (needsOnboarding) router.replace("/welcome/");
  }, [needsOnboarding, router]);

  if (!o || needsOnboarding) return <Shell loading />;
  const { data, today, preview, profile } = o;

  const outage = preview.outage === "returns";
  const needs = outage ? [] : buildPriorities(data, today).filter((p) => p.bucket !== "updates");
  const top = needs[0];
  const feed = buildFeed(data, today);
  const favs = buildFeed(data, today, "favorites");
  const credit = buildFeed(data, today, "credit");
  const ending = buildFeed(data, today, "ending");
  const codes = buildFeed(data, today, "codes");
  const wishes = activeWishes(data, today);
  const wishOnSale = wishes.filter((w) => salesForWish(data, w, today).length > 0).length;
  const creditTotal = [...new Set(credit.map((c) => c.promo.retailerId))].reduce((s, id) => s + (credit.find((c) => c.promo.retailerId === id)?.credit ?? 0), 0);
  const verified = codes.filter((c) => codeTrust(c.promo).tone === "verified").length;
  const inbox = data.connections.find((c) => c.id === "sample_inbox");
  const isEmpty = data.orders.length === 0 && data.wallet.length === 0;
  const inboxProblem = inbox && (inbox.status === "disconnected" || inbox.status === "sync_failed" || inbox.status === "reauth_required");

  return (
    <Shell>
      <TopBar />
      <div className="pb-4 pt-2">
        <h1 className="text-[30px] font-semibold leading-tight tracking-[-0.025em]">{greeting(profile.firstName)}</h1>
        <p className="mt-1 text-[17px] text-muted">{BRAND.tagline}</p>
      </div>

      <AskBar />

      {inboxProblem && !isEmpty && (
        <Notice
          tone="warning"
          className="mt-4"
          title={inbox.status === "sync_failed" ? "Email sync failed" : inbox.status === "reauth_required" ? "Email needs reconnecting" : "Email disconnected"}
          action={<TextLink href="/settings/#email">{inbox.status === "sync_failed" ? "Retry sync" : "Reconnect"}</TextLink>}
        >
          New orders, sales and refund emails won&apos;t appear until this is fixed.
        </Notice>
      )}

      {/* Needs you: one box, the single most urgent thing, tap for the rest */}
      <section aria-label="Needs you" className="mt-6">
        {isEmpty ? (
          <Card>
            <EmptyState icon={<Unplug aria-hidden />} title="Nothing here yet" action={<ButtonLink href="/add/">Add a Purchase</ButtonLink>}>
              Forward an order confirmation or upload a receipt, and Tote will keep track of it.
            </EmptyState>
          </Card>
        ) : outage ? (
          <ErrorState title="Your reminders are temporarily unavailable" onRetry={() => actions.setPreview({ outage: "none" })}>
            Sales, your wallet and your wishlist still work.
          </ErrorState>
        ) : top ? (
          <Link href="/attention/" className="block rounded-[22px] border border-line bg-card p-4 shadow-[var(--shadow-lift)] hover:bg-ivory/60">
            <span className="flex items-center justify-between">
              <span className="text-[13px] font-semibold uppercase tracking-[0.08em] text-terracotta">Needs you · {needs.length}</span>
              <span className="flex items-center gap-0.5 text-[14px] font-semibold text-navy">
                See all <ChevronRight aria-hidden className="size-4" />
              </span>
            </span>
            <span className="mt-3 flex items-center gap-3">
              <IndicatorBadge indicator={kindMeta[top.kind].indicator} tone={toneFor(kindMeta[top.kind].indicator, top.daysLeft)} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-muted">
                  {retailerOf(data, top.retailerId).name} · {kindMeta[top.kind].label}
                </span>
                <span className="block truncate text-[17px] font-semibold">{top.title}</span>
              </span>
              <span className="flex flex-col items-end gap-1">
                {top.amount != null && <span className="tabular text-[17px] font-semibold">{money(top.amount)}</span>}
                <DuePill daysLeft={top.daysLeft} kind={top.kind} />
              </span>
            </span>
          </Link>
        ) : (
          <Card className="flex items-center gap-3 p-4">
            <span className="flex size-11 items-center justify-center rounded-full bg-sage text-sage-ink">
              <CircleCheck aria-hidden className="size-5" />
            </span>
            <p className="text-[15px] text-muted">Nothing needs you right now.</p>
          </Card>
        )}
      </section>

      {/* Discover boxes */}
      <section aria-labelledby="discover" className="mt-7">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="discover" className="text-[17px] font-semibold">
            Discover
          </h2>
          <Link href="/preferences/" className="inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold text-muted hover:text-navy">
            <SlidersHorizontal aria-hidden className="size-4" /> Preferences
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DiscoverTile
            href="/sales/"
            icon={<Tag />}
            tone="terracotta"
            value={String(feed.length)}
            label="Sales for you"
            sub={favs.length ? `${favs.length} from favorite brands` : "From your emails"}
            marks={[...new Map(feed.map((f) => [f.retailer.id, f.retailer])).values()]}
          />
          <DiscoverTile
            href="/wishlist/"
            icon={<Heart />}
            tone="terracotta"
            value={String(wishes.length)}
            label="Wishlist"
            sub={wishOnSale ? `${wishOnSale} on sale now` : "Nothing on sale yet"}
          />
          <DiscoverTile
            href="/sales/?filter=credit"
            icon={<WalletCards />}
            tone="sage"
            value={money(creditTotal)}
            label="Use your credit"
            sub={credit.length ? `${plural(credit.length, "sale")} where you have credit` : "No sales where you have credit"}
          />
          <DiscoverTile
            href="/sales/?filter=ending"
            icon={<Clock3 />}
            tone="sand"
            value={String(ending.length)}
            label="Ending soon"
            sub="Sales ending in 3 days"
          />
        </div>
        <Card className="mt-3 divide-y divide-line overflow-hidden">
          <DiscoverRow href="/sales/?filter=codes" icon={<Ticket />} label="Codes" sub={`${plural(codes.length, "code")}${verified ? ` · ${verified} verified by shoppers` : ""}`} />
          <DiscoverRow href="/sales/?filter=favorites" icon={<Star />} label="Favorite brands" sub={`${plural(new Set(favs.map((f) => f.promo.retailerId)).size, "brand")} with sales`} />
        </Card>
      </section>
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading />}>
      <Discover />
    </Suspense>
  );
}
