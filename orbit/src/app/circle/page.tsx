"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, ChevronRight, Lock, Plus, Search, UserPlus } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { CollectionTile, FeedPost, StoreTile, visibilityLabel } from "@/components/orbit/circle";
import { Button, ButtonLink, IconButton } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/chips";
import { cn } from "@/components/ui/cn";
import { Field, Input } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { plural } from "@/lib/domain/format";
import type { Visibility } from "@/lib/domain/types";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { itemKind } from "@/lib/intelligence/buckets";
import { matchesStoreFilter, storeFilterLabel, type StoreFilter } from "@/lib/retailers/storeFacts";
import { policyOf } from "@/lib/store/selectors";
import type { OrbitData } from "@/lib/store/state";
import { actions, useOrbit } from "@/lib/store/store";

type Section = "feed" | "stores" | "lists";
type FeedTab = "friends" | "following";

function Segments<T extends string>({ value, onChange, items, label, small }: { value: T; onChange: (v: T) => void; items: { v: T; label: string }[]; label: string; small?: boolean }) {
  return (
    <div role="tablist" aria-label={label} className={cn("grid gap-1 rounded-full p-1", small ? "bg-white/70" : "bg-circle-soft")} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((i) => (
        <button
          key={i.v}
          type="button"
          role="tab"
          aria-selected={value === i.v}
          onClick={() => onChange(i.v)}
          className={cn("min-h-11 rounded-full font-semibold transition-colors", small ? "text-[14px]" : "text-[15px]", value === i.v ? "bg-navy text-white" : "text-circle hover:bg-white/60")}
        >
          {i.label}
        </button>
      ))}
    </div>
  );
}

const me = (d: OrbitData) => ({ id: "me", name: d.publicProfile?.displayName ?? "You", handle: "you", palette: "orchid", relation: "me" as const, demo: false as const });

function Feed() {
  const o = useOrbit()!;
  const [tab, setTab] = useSessionState<FeedTab>("circle-feed", "friends");
  const [shown, setShown] = useState(6);
  const authors = o.data.authors ?? [];
  const following = new Set(o.data.following ?? []);
  const posts = (o.data.posts ?? [])
    .filter((p) => {
      if (p.authorId === "me") return tab === "friends";
      const a = authors.find((x) => x.id === p.authorId);
      if (!a) return false;
      return tab === "friends" ? a.relation === "friend" : following.has(a.id);
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const suggestions = authors.filter((a) => a.relation === "creator" && !following.has(a.id));

  return (
    <>
      <div className="mt-4">
        <Segments
          small
          label="Whose posts"
          value={tab}
          onChange={setTab}
          items={[
            { v: "friends", label: "Friends" },
            { v: "following", label: "Following" },
          ]}
        />
      </div>
      <Notice tone="demo" className="mt-3">
        Demo posts and people are fictional, to show how Circle works. Nothing here came from anyone&apos;s purchases.
      </Notice>
      <div className="mt-4 space-y-6">
        {posts.length === 0 && (
          <p className="rounded-[20px] bg-card px-4 py-4 text-[15px] text-muted">{tab === "following" ? "Follow creators to see their posts here." : "No posts from friends yet."}</p>
        )}
        {posts.slice(0, shown).map((p, n) => {
          const author = p.authorId === "me" ? me(o.data) : authors.find((a) => a.id === p.authorId)!;
          return (
            <div key={p.id}>
              <FeedPost post={p} author={author} data={o.data} following={following.has(p.authorId)} />
              {/* An occasional editorial break keeps the rhythm varied. */}
              {n === 1 && tab === "friends" && suggestions.length > 0 && (
                <section aria-label="Creators to follow" className="mt-6 rounded-[24px] bg-navy p-4 text-white">
                  <p className="font-display text-[20px]">Creators worth following</p>
                  <ul className="mt-2 space-y-1">
                    {suggestions.map((a) => (
                      <li key={a.id} className="flex items-center gap-2">
                        <span className="flex-1 text-[15px]">
                          <span className="font-semibold">{a.name}</span> <span className="text-white/60">@{a.handle} · Demo</span>
                        </span>
                        <button type="button" onClick={() => actions.toggleFollow(a.id)} className="h-9 rounded-full bg-white px-3.5 text-[13px] font-bold text-navy">
                          Follow
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          );
        })}
        {posts.length > shown && (
          <Button variant="secondary" size="md" className="w-full" onClick={() => setShown(shown + 6)}>
            Show More
          </Button>
        )}
      </div>
    </>
  );
}

function Stores() {
  const o = useOrbit()!;
  const [q, setQ] = useSessionState("circle-q", "");
  const [filter, setFilter] = useSessionState<StoreFilter>("circle-filter", "all");
  const favs = new Set((o.data.favoriteStores ?? []).map((f) => f.retailerId));
  const friendIds = new Set((o.data.authors ?? []).filter((a) => a.relation === "friend").map((a) => a.id));
  const recs = (id: string) => new Set((o.data.posts ?? []).filter((p) => friendIds.has(p.authorId) && p.retailerIds.includes(id) && (p.type === "store_favorite" || p.notes.returnEase === "easy")).map((p) => p.authorId)).size;
  const stores = o.data.retailers
    .filter((r) => r.websiteUrl)
    .filter((r) => !q.trim() || r.name.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((r) => matchesStoreFilter(r, policyOf(o.data, r.id), filter))
    .sort((a, b) => recs(b.id) - recs(a.id) || a.name.localeCompare(b.name));

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
      {stores.length === 0 ? (
        <p className="mt-4 rounded-[18px] bg-card px-4 py-3.5 text-[15px] text-muted">No stores match. Try another filter.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {stores.map((r) => (
            <StoreTile key={r.id} r={r} policy={policyOf(o.data, r.id)} friends={recs(r.id)} saved={favs.has(r.id)} data={o.data} />
          ))}
        </div>
      )}
      <p className="mt-3 px-1 text-[13px] text-muted">Facts come from each store&apos;s policy record (samples in this preview). Friend counts come from demo posts.</p>
    </>
  );
}

function Lists() {
  const o = useOrbit()!;
  const [create, setCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [vis, setVis] = useState<Visibility>("private");
  const cols = o.data.collections ?? [];
  const savedPosts = (o.data.posts ?? []).filter((p) => p.saved).length;
  const saved = o.data.wishlist.filter((w) => w.status === "active");

  return (
    <>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5">
        <button type="button" onClick={() => setCreate(true)} className="block text-left">
          <span className="flex aspect-square flex-col items-center justify-center rounded-[22px] border-2 border-dashed border-circle/40 bg-circle-soft/50 text-circle">
            <Plus aria-hidden className="size-7" />
            <span className="mt-1 text-[15px] font-bold">New collection</span>
          </span>
          <span className="mt-2 block px-1 text-[13px] text-muted">Moodboards, trips, wishlists</span>
        </button>
        <CollectionTile
          c={{ id: "saved", title: "Saved for Later", visibility: "private", palette: "apricot", createdAt: "", items: saved.map((w) => ({ id: w.id, name: w.text, kind: itemKind({ name: `${w.text} ${w.tags.join(" ")}`, category: w.tags.some((t) => /sneaker|boot|shoe|heel/.test(t)) ? "shoes" : "clothing" }), image: w.image, url: w.url, retailerId: w.retailerId, addedAt: w.addedAt })) }}
          href="/saved/"
        />
        {cols.map((c) => (
          <CollectionTile key={c.id} c={c} href={`/circle/list/?id=${c.id}`} />
        ))}
      </div>

      <div className="mt-6 rounded-[20px] bg-card px-4 py-3 shadow-[var(--shadow-card)]">
        <p className="flex items-center gap-2 text-[15px] font-semibold">
          <Bookmark aria-hidden className="size-4 text-circle" /> {plural(savedPosts, "saved post")}
        </p>
        <p className="text-[13px] text-muted">Posts you bookmark in the feed are kept here, privately.</p>
        {savedPosts > 0 && (
          <ul className="mt-2 divide-y divide-line">
            {(o.data.posts ?? [])
              .filter((p) => p.saved)
              .map((p) => (
                <li key={p.id} className="flex min-h-11 items-center gap-2 py-1.5 text-[14px]">
                  <span className="min-w-0 flex-1 truncate">{p.caption}</span>
                  <button type="button" onClick={() => actions.toggleSavePost(p.id)} className="min-h-11 shrink-0 px-2 text-[13px] font-semibold text-muted">
                    Remove
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      <Sheet
        open={create}
        onOpenChange={setCreate}
        title="New collection"
        description="Private until you choose to share it. Works even if no friends are on Tote yet."
        footer={
          <Button
            disabled={!title.trim()}
            onClick={() => {
              actions.createCollection(title, vis);
              toast(`${title.trim()} created`, vis === "private" ? "Only you can see it." : `Visible to: ${visibilityLabel[vis]}.`);
              setTitle("");
              setCreate(false);
            }}
          >
            Create Collection
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Name" htmlFor="col-title">
            <Input id="col-title" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Summer trip" />
          </Field>
          <div>
            <p className="mb-2 text-[15px] font-semibold">Who can see it</p>
            <div className="grid grid-cols-3 gap-2">
              {(["private", "friends", "public"] as Visibility[]).map((v) => (
                <button key={v} type="button" aria-pressed={vis === v} onClick={() => setVis(v)} className={cn("min-h-11 rounded-full border text-[14px] font-semibold", vis === v ? "border-navy bg-navy text-white" : "border-line bg-card")}>
                  {v === "private" && <Lock aria-hidden className="mr-1 inline size-3.5" />}
                  {visibilityLabel[v]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Sheet>
    </>
  );
}

export default function CirclePage() {
  const o = useOrbit();
  const [section, setSection] = useSessionState<Section>("circle-section2", "feed");
  const [invite, setInvite] = useState(false);
  if (!o) return <Shell loading />;
  return (
    <div className="wash-circle min-h-dvh">
      <Shell>
        <header className="flex items-end justify-between gap-3 pb-4 pt-7">
          <div>
            <h1 className="font-display text-[44px] leading-[0.92]">
              Your
              <br />
              Circle
            </h1>
            <p className="mt-2 text-[16px] text-muted">Good finds from people you trust.</p>
          </div>
          <div className="flex gap-1">
            <IconButton label="Add friends" onClick={() => setInvite(true)} className="bg-white/70">
              <UserPlus aria-hidden className="size-5" />
            </IconButton>
            <ButtonLink href="/circle/new/" size="sm" icon={<Plus aria-hidden className="size-4" />} className="bg-circle hover:bg-[#8a4d10]">
              Post
            </ButtonLink>
          </div>
        </header>
        <Segments
          label="Circle sections"
          value={section}
          onChange={setSection}
          items={[
            { v: "feed", label: "Feed" },
            { v: "stores", label: "Stores" },
            { v: "lists", label: "Lists" },
          ]}
        />
        {section === "feed" ? <Feed /> : section === "stores" ? <Stores /> : <Lists />}

        <Sheet open={invite} onOpenChange={setInvite} title="Add friends" description="Friends need their own Tote account, which comes with sign-in.">
          <div className="space-y-3 text-[15px]">
            <p>
              <Tag>Coming soon</Tag>
            </p>
            <p className="text-muted">This preview runs only in your browser, so there&apos;s nobody real to connect to yet. The friends in your feed are labeled demos.</p>
            <Link href="/you/" className="inline-flex min-h-11 items-center gap-1 font-semibold">
              See what friends would see of you <ChevronRight aria-hidden className="size-4" />
            </Link>
          </div>
        </Sheet>
      </Shell>
    </div>
  );
}
