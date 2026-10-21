"use client";

import { useState } from "react";
import { CalendarDays, PackageOpen, Plus, Search, SlidersHorizontal } from "lucide-react";
import { PageHeader, Shell } from "@/components/layout/shell";
import { OrderList, OrderRow } from "@/components/orbit/order-row";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Sheet } from "@/components/ui/sheet";
import { ButtonLink, IconLink } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/chips";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { money } from "@/lib/domain/format";
import { sumMoney } from "@/lib/domain/money";
import type { ItemCategory } from "@/lib/domain/types";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { bucketFor, bucketMeta, type Bucket } from "@/lib/intelligence/priorities";
import { categoryLabel } from "@/lib/intelligence/insights";
import { orderViews, purchaseFilter, type OrderView, type PurchaseFilter } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

type Filter = "all" | PurchaseFilter;
const BUCKETS: Bucket[] = ["overdue", "soon", "week", "later", "missing"];
const sum = (list: OrderView[]) => sumMoney(list.map((v) => v.amount));

const hints: Record<Filter, string> = {
  all: "Everything you've bought, newest first.",
  deliveries: "On the way. Return windows start when these arrive.",
  returns: "Items you can still return, soonest deadline first.",
  refunds: "Returns on their way back, and refunds to confirm.",
};

export default function ReturnsPage() {
  const o = useOrbit();
  const [filter, setFilter] = useSessionState<Filter>("purchases-filter", "returns");
  const [q, setQ] = useSessionState("purchases-q", "");
  const [store, setStore] = useSessionState("purchases-store", "");
  const [cat, setCat] = useSessionState<"" | ItemCategory>("purchases-cat", "");
  const [filterSheet, setFilterSheet] = useState(false);
  if (!o) return <Shell loading />;

  const header = (
    <PageHeader
      accent="returns"
      title="Returns"
      subtitle="Send back, track, and get your money."
      action={
        <>
          <IconLink href="/calendar/" label="Calendar of dates">
            <CalendarDays aria-hidden className="size-[22px]" />
          </IconLink>
          <IconLink href="/add/" label="Add a purchase or receipt">
            <Plus aria-hidden className="size-[22px]" />
          </IconLink>
        </>
      }
    />
  );

  if (o.preview.outage === "returns")
    return (
      <Shell>
        {header}
        <ErrorState title="We couldn't load your returns" onRetry={() => actions.setPreview({ outage: "none" })}>
          Your wallet and saved labels are unaffected.
        </ErrorState>
      </Shell>
    );

  const views = orderViews(o.data, o.today);
  if (views.length === 0)
    return (
      <Shell>
        {header}
        <EmptyState icon={<PackageOpen aria-hidden />} title="No purchases yet" action={<ButtonLink href="/add/">Add a Purchase</ButtonLink>}>
          Forward an order email, upload a receipt, or add one yourself.
        </EmptyState>
      </Shell>
    );

  const query = q.trim().toLowerCase();
  const narrowed = views.filter(
    (v) =>
      (!store || v.order.retailerId === store) &&
      (!cat || v.order.items.some((i) => i.category === cat)) &&
      (!query || [v.retailer.name, v.order.orderNumber ?? "", ...v.order.items.map((i) => `${i.name} ${i.variant ?? ""}`)].some((s) => s.toLowerCase().includes(query))),
  );
  const count = (f: PurchaseFilter) => narrowed.filter((v) => purchaseFilter(v) === f).length;
  const list =
    filter === "all"
      ? [...narrowed].sort((a, b) => (b.order.purchasedAt ?? b.order.createdAt).localeCompare(a.order.purchasedAt ?? a.order.createdAt))
      : narrowed.filter((v) => purchaseFilter(v) === filter);
  const stores = [...new Map(views.map((v) => [v.retailer.id, v.retailer.name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const cats = [...new Set(views.flatMap((v) => v.order.items.map((i) => i.category)))];

  return (
    <Shell>
      {header}

      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <label htmlFor="p-search" className="sr-only">
          Search returns and purchases
        </label>
        <Input id="p-search" type="search" className="pl-11" placeholder="Store, item or order number" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
        <FilterChips
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "returns", label: "To return", count: count("returns") },
            { value: "refunds", label: "Refunds", count: count("refunds") },
            { value: "deliveries", label: "Arriving", count: count("deliveries") },
            { value: "all", label: "All", count: narrowed.length },
          ]}
        />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setFilterSheet(true)}
        className={cn("mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-[14px] font-semibold", store || cat ? "text-returns" : "text-muted")}
      >
        <SlidersHorizontal aria-hidden className="size-4" />
        {store || cat ? `Filtered: ${[store && stores.find(([id]) => id === store)?.[1], cat && categoryLabel[cat]].filter(Boolean).join(", ")}` : "Store and category"}
      </button>
      <Sheet
        open={filterSheet}
        onOpenChange={setFilterSheet}
        title="Filter"
        footer={
          <>
            <Button onClick={() => setFilterSheet(false)}>Show Results</Button>
            {(store || cat) && (
              <Button variant="ghost" size="md" className="w-full" onClick={() => { setStore(""); setCat(""); }}>
                Clear Filters
              </Button>
            )}
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Store" htmlFor="p-store">
            <Select id="p-store" value={store} onChange={(e) => setStore(e.target.value)}>
              <option value="">All stores</option>
              {stores.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Category" htmlFor="p-cat">
            <Select id="p-cat" value={cat} onChange={(e) => setCat(e.target.value as "" | ItemCategory)}>
              <option value="">All categories</option>
              {cats.map((c) => (
                <option key={c} value={c}>
                  {categoryLabel[c]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Sheet>

      <p className="mt-1 text-[14px] text-muted">{hints[filter]}</p>

      {list.length === 0 ? (
        <p className="mt-3 rounded-[18px] bg-sage px-4 py-3.5 text-[15px] font-medium text-sage-ink">{query || store || cat ? "Nothing matches these filters." : "Nothing here right now."}</p>
      ) : filter === "returns" ? (
        BUCKETS.map((b) => {
          const group = list.filter((v) => bucketFor(v.current.daysLeft) === b);
          if (!group.length) return null;
          return (
            <section key={b} className="mt-5" aria-labelledby={`pb-${b}`}>
              <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
                <h2 id={`pb-${b}`} className="text-[13px] font-bold uppercase tracking-[0.07em] text-muted">
                  {bucketMeta[b].title} <span className="tabular font-medium">· {group.length}</span>
                </h2>
                <span className="tabular text-[13px] font-semibold text-muted">{money(sum(group))}</span>
              </div>
              <OrderList>
                {group.map((v) => (
                  <OrderRow key={v.order.id} v={v} today={o.today} />
                ))}
              </OrderList>
            </section>
          );
        })
      ) : (
        <OrderList className="mt-3">
          {list.map((v) => (
            <OrderRow key={v.order.id} v={v} today={o.today} />
          ))}
        </OrderList>
      )}
    </Shell>
  );
}
