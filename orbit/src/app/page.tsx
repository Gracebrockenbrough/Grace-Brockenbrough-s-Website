"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, SlidersHorizontal, Tag, Unplug } from "lucide-react";
import { Shell, TopBar } from "@/components/layout/shell";
import { AskBar } from "@/components/orbit/ask-bar";
import { DiscoverTabs } from "@/components/orbit/discover-tabs";
import { PriorityRow } from "@/components/orbit/priority-row";
import { PromoCard } from "@/components/orbit/promo-card";
import { Button, ButtonLink, IconLink, TextLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChips } from "@/components/ui/chips";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { BRAND } from "@/lib/brand";
import { activeWishes, buildFeed, type FeedFilter } from "@/lib/intelligence/discover";
import { buildPriorities } from "@/lib/intelligence/priorities";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

function greeting(name: string) {
  const h = new Date().getHours();
  return `${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}, ${name}`;
}

function ShareCode({ open, onOpenChange, retailers }: { open: boolean; onOpenChange: (v: boolean) => void; retailers: { id: string; name: string }[] }) {
  const [f, setF] = useState({ store: "", code: "", title: "", pct: "" });
  const valid = f.store.trim() && /^[A-Za-z0-9-]{3,24}$/.test(f.code.trim());
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Share a code"
      description="Help other shoppers save. Codes show as unverified until people confirm they work. You earn 10 points."
      footer={
        <Button
          disabled={!valid}
          onClick={() => {
            actions.submitCode({ retailerName: f.store, code: f.code, title: f.title, discountPct: f.pct ? Number(f.pct) : null, endsAt: null });
            setF({ store: "", code: "", title: "", pct: "" });
            onOpenChange(false);
          }}
        >
          Share Code
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Store" htmlFor="sc-store">
          <Input id="sc-store" list="sc-stores" value={f.store} onChange={(e) => setF({ ...f, store: e.target.value })} autoComplete="off" />
          <datalist id="sc-stores">
            {retailers.map((r) => (
              <option key={r.id} value={r.name} />
            ))}
          </datalist>
        </Field>
        <Field label="Code" htmlFor="sc-code" hint={f.code && !/^[A-Za-z0-9-]{3,24}$/.test(f.code.trim()) ? "Letters, numbers and dashes only." : undefined}>
          <Input id="sc-code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="What it gets you (optional)" htmlFor="sc-title">
          <Input id="sc-title" placeholder="e.g. 20% off full-price items" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Percent off (optional)" htmlFor="sc-pct">
          <Input id="sc-pct" inputMode="numeric" value={f.pct} onChange={(e) => setF({ ...f, pct: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })} />
        </Field>
      </div>
    </Sheet>
  );
}

function Discover() {
  const o = useOrbit();
  const router = useRouter();
  const params = useSearchParams();
  const [filter, setFilter] = useSessionState<FeedFilter>("feed-filter", "all");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    const f = params.get("filter") as FeedFilter | null;
    if (f) setFilter(f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const needsOnboarding = o && !o.data.shopping.onboarded && !o.preview.emptyAccount;
  useEffect(() => {
    if (needsOnboarding) router.replace("/welcome/");
  }, [needsOnboarding, router]);

  if (!o || needsOnboarding) return <Shell loading />;
  const { data, today, preview, profile } = o;

  const outage = preview.outage === "returns";
  const todos = outage ? [] : buildPriorities(data, today);
  const top = todos.slice(0, 3);
  const feed = buildFeed(data, today, filter);
  const all = buildFeed(data, today, "all");
  const wishes = activeWishes(data, today);
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

      {/* Heads up: what needs you, from across the app */}
      {isEmpty ? (
        <Card className="mt-6">
          <EmptyState icon={<Unplug aria-hidden />} title="Nothing here yet" action={<ButtonLink href="/add/">Add a Purchase</ButtonLink>}>
            Forward an order confirmation or upload a receipt, and Orbit will keep track of it.
          </EmptyState>
        </Card>
      ) : outage ? (
        <div className="mt-6">
          <ErrorState title="Your reminders are temporarily unavailable" onRetry={() => actions.setPreview({ outage: "none" })}>
            Sales, your wallet and your wishlist still work.
          </ErrorState>
        </div>
      ) : (
        top.length > 0 && (
          <section aria-labelledby="headsup" className="mt-6">
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 id="headsup" className="text-[17px] font-semibold">
                Heads up
              </h2>
              {todos.length > top.length && <TextLink href="/attention/">See all {todos.length}</TextLink>}
            </div>
            <div className="space-y-2.5">
              {top.map((p, i) => (
                <PriorityRow key={p.key} p={p} retailer={retailerOf(data, p.retailerId)} today={today} prominent={i === 0} />
              ))}
            </div>
          </section>
        )
      )}

      {/* Discover */}
      <section aria-labelledby="discover" className="mt-8">
        <h2 id="discover" className="sr-only">
          Discover
        </h2>
        <DiscoverTabs current="sales" wishCount={wishes.length} />
        <div className="mt-4 flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <FilterChips
              label="Filter sales"
              value={filter}
              onChange={setFilter}
              options={[
                { value: "all", label: "All", count: all.length },
                { value: "favorites", label: "Favorites", count: all.filter((i) => i.favorite).length },
                { value: "wishlist", label: "Wishlist", count: all.filter((i) => i.wishes.length).length },
                { value: "codes", label: "Codes", count: all.filter((i) => i.promo.code).length },
              ]}
            />
          </div>
          <IconLink href="/preferences/" label="Customize what you see" className="shrink-0 border border-line bg-card">
            <SlidersHorizontal aria-hidden className="size-5" />
          </IconLink>
        </div>

        <div className="mt-4 space-y-3">
          {feed.length === 0 ? (
            <EmptyState icon={<Tag aria-hidden />} title="No sales here right now" action={<ButtonLink href="/preferences/" variant="secondary">Adjust Preferences</ButtonLink>}>
              We only show sales from your promotional emails that match what you like.
            </EmptyState>
          ) : (
            feed.map((item) => <PromoCard key={item.promo.id} item={item} />)
          )}
        </div>

        <Card className="mt-4 flex items-center gap-3 p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Know a code that works?</p>
            <p className="text-[14px] text-muted">
              Share it with other shoppers.{data.shopping.points ? ` You have ${data.shopping.points} points.` : ""}
            </p>
          </div>
          <Button variant="secondary" size="sm" icon={<Plus aria-hidden className="size-4" />} onClick={() => setSharing(true)}>
            Share
          </Button>
        </Card>
        <p className="mt-3 px-1 text-[13px] text-muted">
          Sales come from your promotional emails. Sponsored sales are always labeled.{" "}
          <Link href="/preferences/" className="font-semibold text-navy underline-offset-4 hover:underline">
            Preferences
          </Link>
        </p>
      </section>

      <ShareCode open={sharing} onOpenChange={setSharing} retailers={data.retailers} />
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
