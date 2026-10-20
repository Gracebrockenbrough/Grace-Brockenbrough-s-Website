"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, SlidersHorizontal, Tag } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { PromoCard } from "@/components/orbit/promo-card";
import { ShareCode } from "@/components/orbit/share-code";
import { Button, ButtonLink, IconLink } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/chips";
import { EmptyState } from "@/components/ui/states";
import { buildFeed, type FeedFilter } from "@/lib/intelligence/discover";
import { useOrbit } from "@/lib/store/store";

const TITLES: Record<FeedFilter, { title: string; hint: string }> = {
  all: { title: "Sales for you", hint: "From your promotional emails, best matches first." },
  favorites: { title: "Favorite brands", hint: "Sales from brands you starred." },
  wishlist: { title: "On your wishlist", hint: "Sales that match things you're looking for." },
  codes: { title: "Codes", hint: "Copy a code, and tell others if it worked." },
  credit: { title: "Use your credit", hint: "Sales at stores where you already have gift cards or credit." },
  ending: { title: "Ending soon", hint: "Sales that end in the next 3 days." },
};

function Sales() {
  const params = useSearchParams();
  const o = useOrbit();
  const [filter, setFilter] = useState<FeedFilter>((params.get("filter") as FeedFilter) ?? "all");
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    const f = params.get("filter") as FeedFilter | null;
    setFilter(f ?? "all");
  }, [params]);
  if (!o) return <Shell loading />;
  const { data, today } = o;
  const feed = buildFeed(data, today, filter);
  const count = (f: FeedFilter) => buildFeed(data, today, f).length;

  return (
    <Shell>
      <BackBar
        fallback="/"
        title={TITLES[filter].title}
        action={
          <IconLink href="/preferences/" label="Customize what you see">
            <SlidersHorizontal aria-hidden className="size-5" />
          </IconLink>
        }
      />
      <p className="pb-3 pt-1 text-[16px] text-muted">{TITLES[filter].hint}</p>
      <FilterChips
        label="Filter sales"
        value={filter}
        onChange={setFilter}
        options={(["all", "favorites", "wishlist", "credit", "ending", "codes"] as FeedFilter[]).map((f) => ({
          value: f,
          label: f === "all" ? "All" : TITLES[f].title.replace("On your wishlist", "Wishlist").replace("Use your credit", "Your credit"),
          count: count(f),
        }))}
      />

      <div className="mt-4 space-y-3">
        {feed.length === 0 ? (
          <EmptyState icon={<Tag aria-hidden />} title="Nothing here right now" action={<ButtonLink href="/preferences/" variant="secondary">Adjust Preferences</ButtonLink>}>
            We only show sales from your promotional emails that match what you like.
          </EmptyState>
        ) : (
          feed.map((item) => <PromoCard key={item.promo.id} item={item} />)
        )}
      </div>

      {(filter === "codes" || filter === "all") && (
        <div className="mt-5 flex items-center gap-3 rounded-[18px] border border-line bg-card p-4">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">Know a code that works?</p>
            <p className="text-[14px] text-muted">Share it with other shoppers.{data.shopping.points ? ` You have ${data.shopping.points} points.` : ""}</p>
          </div>
          <Button variant="secondary" size="sm" icon={<Plus aria-hidden className="size-4" />} onClick={() => setSharing(true)}>
            Share
          </Button>
        </div>
      )}
      <p className="mt-4 px-1 text-[13px] text-muted">Sponsored sales are always labeled, and you can turn them off in preferences.</p>
      <ShareCode open={sharing} onOpenChange={setSharing} retailers={data.retailers} />
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading />}>
      <Sales />
    </Suspense>
  );
}
