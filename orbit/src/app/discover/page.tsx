"use client";

import { Search } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { TabBanner } from "@/components/layout/tab-banner";
import { CollectionTile, StoreTile } from "@/components/orbit/circle";
import { FilterChips } from "@/components/ui/chips";
import { Input } from "@/components/ui/form";
import type { CircleAuthor, Collection } from "@/lib/domain/types";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { matchesStoreFilter, storeFilterLabel, type StoreFilter } from "@/lib/retailers/storeFacts";
import { policyOf } from "@/lib/store/selectors";
import { useOrbit } from "@/lib/store/store";

function Row({ title, lists, authorOf }: { title: string; lists: Collection[]; authorOf: (c: Collection) => CircleAuthor | null }) {
  if (!lists.length) return null;
  return (
    <section className="mt-7" aria-label={title}>
      <h2 className="font-display mb-3 text-[22px] leading-none">{title}</h2>
      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {lists.map((c) => (
          <div key={c.id} className="w-[150px] shrink-0">
            <CollectionTile c={c} href={`/discover/list/?id=${c.id}`} owner={authorOf(c)} />
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Discover: lists friends share with you, popular public lists, and stores. No feed and
 * no posting; you look, save what you like, and share your own lists if you choose.
 */
export default function DiscoverPage() {
  const o = useOrbit();
  const [q, setQ] = useSessionState("discover-q", "");
  const [filter, setFilter] = useSessionState<StoreFilter>("circle-filter", "all");
  if (!o) return <Shell loading />;
  const { data } = o;
  const query = q.trim().toLowerCase();
  const authors = data.authors ?? [];
  const authorOf = (c: Collection) => authors.find((a) => a.id === c.ownerId) ?? null;
  const match = (c: Collection) => !query || c.title.toLowerCase().includes(query) || c.items.some((i) => i.name.toLowerCase().includes(query)) || (authorOf(c)?.name.toLowerCase().includes(query) ?? false);
  const others = (data.collections ?? []).filter((c) => c.ownerId && c.visibility !== "private" && match(c));
  const shared = others.filter((c) => c.sharedWithMe);
  const popular = others.filter((c) => !c.sharedWithMe);
  const favs = new Set((data.favoriteStores ?? []).map((f) => f.retailerId));
  const onLists = (id: string) => new Set(shared.filter((c) => c.items.some((i) => i.retailerId === id)).map((c) => c.ownerId)).size;
  const stores = data.retailers
    .filter((r) => r.websiteUrl)
    .filter((r) => !query || r.name.toLowerCase().includes(query))
    .filter((r) => matchesStoreFilter(r, policyOf(data, r.id), filter))
    .sort((a, b) => onLists(b.id) - onLists(a.id) || a.name.localeCompare(b.name));

  return (
    <Shell>
      <TabBanner tab="discover" title="Find your next favorite" />

      <div className="relative mt-4">
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <label htmlFor="discover-q" className="sr-only">
          Search stores and lists
        </label>
        <Input id="discover-q" type="search" className="pl-11" placeholder="Stores, lists or people" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <Row title="Shared with you" lists={shared} authorOf={authorOf} />
      <Row title="Popular lists" lists={popular} authorOf={authorOf} />

      <section className="mt-7" aria-label="Stores">
        <h2 className="font-display mb-3 text-[22px] leading-none">Stores</h2>
        <FilterChips label="Filter stores" value={filter} onChange={setFilter} options={(Object.keys(storeFilterLabel) as StoreFilter[]).map((f) => ({ value: f, label: storeFilterLabel[f] }))} />
        {stores.length === 0 ? (
          <p className="mt-4 rounded-[18px] bg-card px-4 py-3.5 text-[15px] text-muted">No stores match.</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {stores.map((r) => (
              <StoreTile key={r.id} r={r} policy={policyOf(data, r.id)} friends={onLists(r.id)} saved={favs.has(r.id)} />
            ))}
          </div>
        )}
      </section>

      {(shared.length || popular.length) > 0 && <p className="mt-6 px-1 text-[12px] text-muted">People and lists marked Demo are fictional.</p>}
    </Shell>
  );
}
