"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Lock, Search, UserPlus, UsersRound } from "lucide-react";
import { PageHeader, Shell } from "@/components/layout/shell";
import { RetailerMark } from "@/components/orbit/retail";
import { SaveStoreButton } from "@/components/orbit/save-store";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FilterChips } from "@/components/ui/chips";
import { cn } from "@/components/ui/cn";
import { Input } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { plural } from "@/lib/domain/format";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { headlineFacts, matchesStoreFilter, storeCategoryLabel, storeFilterLabel, type StoreFilter } from "@/lib/retailers/storeFacts";
import { policyOf, retailerOf } from "@/lib/store/selectors";
import { useOrbit } from "@/lib/store/store";

type Section = "friends" | "discover" | "lists";

function Segments({ value, onChange }: { value: Section; onChange: (v: Section) => void }) {
  const items: { v: Section; label: string }[] = [
    { v: "friends", label: "Friends" },
    { v: "discover", label: "Discover" },
    { v: "lists", label: "Lists" },
  ];
  return (
    <div role="tablist" aria-label="Circle sections" className="grid grid-cols-3 gap-1 rounded-full bg-circle-soft p-1">
      {items.map((i) => (
        <button
          key={i.v}
          type="button"
          role="tab"
          aria-selected={value === i.v}
          onClick={() => onChange(i.v)}
          className={cn("h-10 rounded-full text-[15px] font-semibold transition-colors", value === i.v ? "bg-card text-navy shadow-[var(--shadow-card)]" : "text-circle hover:bg-white/50")}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

function Discover() {
  const o = useOrbit()!;
  const [q, setQ] = useSessionState("circle-q", "");
  const [filter, setFilter] = useSessionState<StoreFilter>("circle-filter", "all");
  const favs = new Set((o.data.favoriteStores ?? []).map((f) => f.retailerId));
  // Only stores in Tote's directory with a known website. No paid placement, no ranking by commission.
  const stores = o.data.retailers
    .filter((r) => r.websiteUrl)
    .filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((r) => matchesStoreFilter(r, policyOf(o.data, r.id), filter))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <div className="relative mt-4">
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <label htmlFor="store-q" className="sr-only">
          Find a store or boutique
        </label>
        <Input id="store-q" type="search" className="pl-11" placeholder="Find a store or boutique" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="mt-3">
        <FilterChips label="Filter stores" value={filter} onChange={setFilter} options={(Object.keys(storeFilterLabel) as StoreFilter[]).map((f) => ({ value: f, label: storeFilterLabel[f] }))} />
      </div>
      <div className="mt-4 space-y-2.5">
        {stores.length === 0 && <p className="rounded-[18px] bg-card px-4 py-3.5 text-[15px] text-muted">No stores match. Try another filter.</p>}
        {stores.map((r) => {
          const facts = headlineFacts(policyOf(o.data, r.id));
          return (
            <Card key={r.id} as="article" className="flex items-center gap-3 p-3">
              <Link href={`/stores/?id=${r.id}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl">
                <RetailerMark retailer={r} className="size-12 rounded-2xl text-[15px]" />
                <span className="min-w-0">
                  <span className="block font-semibold">{r.name}</span>
                  <span className="block truncate text-[14px] text-muted">
                    {storeCategoryLabel[r.category]} · {facts.join(" · ")}
                  </span>
                </span>
              </Link>
              <SaveStoreButton retailerId={r.id} name={r.name} saved={favs.has(r.id)} />
            </Card>
          );
        })}
      </div>
      <p className="mt-3 px-1 text-[13px] text-muted">Return facts come from each store&apos;s policy record. Policies here are samples, not verified with the stores.</p>
    </>
  );
}

function Friends({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mt-5 space-y-4">
      <Card>
        <EmptyState icon={<UsersRound aria-hidden />} title="Your Circle is just getting started" action={<Button size="md" icon={<UserPlus aria-hidden className="size-4" />} onClick={onAdd}>Add Friends</Button>}>
          When friends join, you&apos;ll see the stores and collections they choose to share here.
        </EmptyState>
      </Card>
      <Notice tone="info" title="Nothing is shared automatically">
        Tote never posts what you buy or return. Friends only see favorites, collections and reviews you decide to share.
      </Notice>
    </div>
  );
}

function Lists() {
  const o = useOrbit()!;
  const favs = o.data.favoriteStores ?? [];
  const saved = o.data.wishlist.filter((w) => w.status === "active").length;
  const vis = { private: "Only you", friends: "Friends", public: "Everyone" } as const;
  return (
    <div className="mt-5 space-y-3">
      <Card className="divide-y divide-line overflow-hidden">
        <Link href="/you/#favorites" className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ivory-deep">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Favorite stores</span>
            <span className="block truncate text-[14px] text-muted">{favs.length ? favs.map((f) => `${retailerOf(o.data, f.retailerId).name} (${vis[f.visibility]})`).join(", ") : "Tap the heart on any store to save it"}</span>
          </span>
          <ChevronRight aria-hidden className="size-5 text-muted/60" />
        </Link>
        <Link href="/saved/" className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ivory-deep">
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 font-semibold">
              Saved for Later <Lock aria-hidden className="size-3.5 text-muted" />
            </span>
            <span className="block text-[14px] text-muted">{plural(saved, "item")} · private</span>
          </span>
          <ChevronRight aria-hidden className="size-5 text-muted/60" />
        </Link>
      </Card>
      <p className="px-1 text-[14px] text-muted">Shared collections, like a birthday list, come next.</p>
    </div>
  );
}

export default function CirclePage() {
  const o = useOrbit();
  const [section, setSection] = useSessionState<Section>("circle-section", "discover");
  const [invite, setInvite] = useState(false);
  if (!o) return <Shell loading />;
  return (
    <Shell>
      <PageHeader
        accent="circle"
        title="Your Circle"
        subtitle="Good finds from people you trust."
        action={
          <IconButton label="Add friends" onClick={() => setInvite(true)}>
            <UserPlus aria-hidden className="size-[22px]" />
          </IconButton>
        }
      />
      <Segments value={section} onChange={setSection} />
      {section === "friends" ? <Friends onAdd={() => setInvite(true)} /> : section === "discover" ? <Discover /> : <Lists />}

      <Sheet open={invite} onOpenChange={setInvite} title="Add friends" description="Friends need their own Tote account, which comes with sign-in.">
        <div className="space-y-3 text-[15px]">
          <p>
            <Tag>Coming soon</Tag>
          </p>
          <p className="text-muted">This preview runs in your browser only, so there&apos;s nobody to connect to yet. We won&apos;t show made-up friends.</p>
        </div>
      </Sheet>
    </Shell>
  );
}
