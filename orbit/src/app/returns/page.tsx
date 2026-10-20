"use client";

import { useMemo, useState } from "react";
import { PackageOpen, Plus, Search, X } from "lucide-react";
import { PageHeader, Shell } from "@/components/layout/shell";
import { PurchaseCard } from "@/components/orbit/purchase-card";
import { ButtonLink, IconButton, IconLink } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/chips";
import { Input } from "@/components/ui/form";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { orderViews, type OrderView } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

type Filter = "all" | "to_decide" | "returning" | "completed";

const matches = (v: OrderView, f: Filter) =>
  f === "all" || (f === "to_decide" && v.stage === "to_decide") || (f === "returning" && v.stage === "returning") || (f === "completed" && (v.stage === "completed" || v.stage === "kept"));

const emptyCopy: Record<Filter, { title: string; body: string }> = {
  all: { title: "No purchases yet", body: "Add an order confirmation and Orbit will keep track of the return window." },
  to_decide: { title: "Nothing to decide", body: "Items you can still return will appear here." },
  returning: { title: "No returns in progress", body: "When you start a return, you'll see every step here." },
  completed: { title: "No completed returns yet", body: "Finished returns and confirmed refunds will appear here." },
};

export default function ReturnsPage() {
  const o = useOrbit();
  const [filter, setFilter] = useState<Filter>("all");
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState("");

  const views = useMemo(() => (o ? orderViews(o.data, o.today) : []), [o]);
  if (!o) return <Shell loading />;

  const query = q.trim().toLowerCase();
  const searched = query
    ? views.filter((v) => [v.retailer.name, v.order.orderNumber ?? "", ...v.order.items.map((i) => i.name)].some((s) => s.toLowerCase().includes(query)))
    : views;
  const list = searched.filter((v) => matches(v, filter));
  const count = (f: Filter) => searched.filter((v) => matches(v, f)).length;

  return (
    <Shell>
      <PageHeader
        title="Your Purchases"
        subtitle="Everything you've ordered, organized."
        action={
          <>
            <IconButton label={searching ? "Close search" : "Search purchases"} onClick={() => { setSearching((s) => !s); setQ(""); }}>
              {searching ? <X aria-hidden className="size-[22px]" /> : <Search aria-hidden className="size-[22px]" />}
            </IconButton>
            <IconLink href="/add/" label="Add a purchase">
              <Plus aria-hidden className="size-[22px]" />
            </IconLink>
          </>
        }
      />

      {searching && (
        <div className="animate-in mb-4">
          <label htmlFor="search" className="sr-only">Search by retailer, item or order number</label>
          <Input id="search" autoFocus type="search" placeholder="Retailer, item or order number" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      )}

      <FilterChips
        label="Filter purchases"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "All" },
          { value: "to_decide", label: "To Decide", count: count("to_decide") },
          { value: "returning", label: "Returning", count: count("returning") },
          { value: "completed", label: "Completed" },
        ]}
      />

      <div className="mt-5 space-y-3">
        {o.preview.outage === "returns" ? (
          <ErrorState title="We couldn't load your purchases" onRetry={() => actions.setPreview({ outage: "none" })}>
            Your wallet and saved labels are unaffected.
          </ErrorState>
        ) : list.length ? (
          list.map((v) => <PurchaseCard key={v.order.id} view={v} today={o.today} />)
        ) : query ? (
          <EmptyState icon={<Search aria-hidden />} title={`No results for "${q}"`}>Try a retailer name or order number.</EmptyState>
        ) : (
          <EmptyState
            icon={<PackageOpen aria-hidden />}
            title={emptyCopy[filter].title}
            action={filter === "all" ? <ButtonLink href="/add/">Add a Purchase</ButtonLink> : undefined}
          >
            {emptyCopy[filter].body}
          </EmptyState>
        )}
      </div>
    </Shell>
  );
}
