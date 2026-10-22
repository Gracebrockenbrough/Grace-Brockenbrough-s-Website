"use client";

import Link from "next/link";
import { useState } from "react";
import { CalendarDays, Check, ChevronRight, PackageOpen, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { TabBanner } from "@/components/layout/tab-banner";
import { OrderList, OrderRow } from "@/components/orbit/order-row";
import { ProductThumb } from "@/components/orbit/retail";
import { Button, ButtonLink, IconLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field, Input, Select } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import type { DateOnly, ItemCategory } from "@/lib/domain/types";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { categoryLabel } from "@/lib/intelligence/insights";
import { orderJourney, type Milestone } from "@/lib/intelligence/journey";
import { orderViews, type OrderView } from "@/lib/store/selectors";
import type { OrbitData } from "@/lib/store/state";
import { actions, useOrbit } from "@/lib/store/store";

type Tab = "orders" | "returns";

/** The four return steps shown on a tracking card. Store-credit returns end at "Refund". */
const STEPS: { label: string; keys: string[] }[] = [
  { label: "Started", keys: ["started"] },
  { label: "Label", keys: ["label"] },
  { label: "Dropped off", keys: ["dropped", "received"] },
  { label: "Refund", keys: ["issued", "arrived"] },
];

function stepState(journey: Milestone[], keys: string[]): "done" | "next" | "todo" {
  const hits = journey.filter((m) => keys.includes(m.key));
  if (hits.length && hits.every((m) => m.state === "done")) return "done";
  return "todo";
}

/** One return you chose to make: what it is, a 4-step tracker, and the next date. */
function ReturnCard({ v, data, today }: { v: OrderView; data: OrbitData; today: DateOnly }) {
  const journey = orderJourney(data, v);
  const states = STEPS.map((s) => stepState(journey, s.keys));
  const nextIdx = states.indexOf("todo");
  const next = journey.find((m) => m.state !== "done" && m.key !== "window");
  const c = v.current;
  return (
    <li>
      <Link href={`/returns/purchase/?id=${v.order.id}`} className="block rounded-[22px] bg-card p-4 shadow-[var(--shadow-card)] hover:bg-ivory/60">
        <div className="flex items-center gap-3">
          <ProductThumb category={v.order.items[0]?.category ?? "other"} name={v.order.items[0]?.name} tone={v.retailer.tone} className="size-11 rounded-[12px]" count={v.focusItems.length} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-bold uppercase tracking-[0.06em] text-muted">{v.retailer.name}</span>
            <span className="block truncate text-[16px] font-bold">{v.title}</span>
          </span>
          <span className="tabular text-[15px] font-bold">{v.amount != null ? money(v.amount) : ""}</span>
        </div>
        <ol className="mt-4 grid grid-cols-4" aria-label="Return progress">
          {STEPS.map((s, i) => {
            const st = i === nextIdx ? "next" : states[i];
            return (
              <li key={s.label} className="relative flex flex-col items-center text-center">
                {i < STEPS.length - 1 && <span aria-hidden className={cn("absolute left-1/2 top-[11px] h-0.5 w-full", states[i] === "done" ? "bg-navy" : "bg-line")} />}
                <span className={cn("relative z-10 flex size-[22px] items-center justify-center rounded-full border-2", st === "done" ? "border-navy bg-navy text-white" : st === "next" ? "border-navy bg-card" : "border-line bg-card")}>
                  {st === "done" && <Check aria-hidden className="size-3" strokeWidth={3} />}
                </span>
                <span className={cn("mt-1.5 text-[12px]", st === "todo" ? "text-muted" : "font-bold")}>{s.label}</span>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-[14px]">
          <span className="min-w-0 truncate">
            <span className="font-bold">{c.label}</span>
            {next?.date ? <span className="text-muted"> · {next.label} {formatDate(next.date, today)}{next.state === "estimated" ? " (est.)" : ""}</span> : null}
          </span>
          <ChevronRight aria-hidden className="size-4 shrink-0 text-muted/60" />
        </p>
      </Link>
    </li>
  );
}

export default function ReturnsPage() {
  const o = useOrbit();
  const [tab, setTab] = useSessionState<Tab>("returns-tab", "orders");
  const [q, setQ] = useSessionState("purchases-q", "");
  const [store, setStore] = useSessionState("purchases-store", "");
  const [cat, setCat] = useSessionState<"" | ItemCategory>("purchases-cat", "");
  const [filterSheet, setFilterSheet] = useState(false);
  if (!o) return <Shell loading />;

  const header = (
    <TabBanner
      tab="returns"
      title="Returns made easy"
      right={
        <>
          <IconLink href="/calendar/" label="Calendar of dates">
            <CalendarDays aria-hidden className="size-[22px]" />
          </IconLink>
          <IconLink href="/add/" label="Add a purchase or receipt" className="-mr-2">
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
        <div className="h-4" />
        <ErrorState title="We couldn't load your returns" onRetry={() => actions.setPreview({ outage: "none" })} />
      </Shell>
    );

  const views = orderViews(o.data, o.today);
  if (views.length === 0)
    return (
      <Shell>
        {header}
        <div className="h-4" />
        <EmptyState icon={<PackageOpen aria-hidden />} title="No orders yet" action={<ButtonLink href="/add/">Add a Purchase</ButtonLink>} />
      </Shell>
    );

  const query = q.trim().toLowerCase();
  const matches = (v: OrderView) =>
    (!store || v.order.retailerId === store) &&
    (!cat || v.order.items.some((i) => i.category === cat)) &&
    (!query || [v.retailer.name, v.order.orderNumber ?? "", ...v.order.items.map((i) => `${i.name} ${i.variant ?? ""}`)].some((s) => s.toLowerCase().includes(query)));
  const orders = views.filter(matches).sort((a, b) => (b.order.purchasedAt ?? b.order.createdAt).localeCompare(a.order.purchasedAt ?? a.order.createdAt));
  // Orders you chose to return, newest first. Finished ones drop to the bottom.
  const returning = views.filter((v) => (v.activeReturn || v.latestReturn) && matches(v));
  const active = returning.filter((v) => v.current.group !== "history");
  const done = returning.filter((v) => v.current.group === "history");
  const stores = [...new Map(views.map((v) => [v.retailer.id, v.retailer.name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const cats = [...new Set(views.flatMap((v) => v.order.items.map((i) => i.category)))];

  return (
    <Shell>
      {header}

      <div role="tablist" aria-label="Orders or returns" className="mt-4 grid grid-cols-2 gap-1 rounded-full bg-card p-1 shadow-[var(--shadow-card)]">
        {(
          [
            ["orders", `Orders · ${views.length}`],
            ["returns", `My returns · ${active.length}`],
          ] as [Tab, string][]
        ).map(([v, label]) => (
          <button key={v} type="button" role="tab" aria-selected={tab === v} onClick={() => setTab(v)} className={cn("min-h-11 rounded-full text-[15px] font-bold transition-colors", tab === v ? "bg-navy text-white" : "text-muted hover:text-navy")}>
            {label}
          </button>
        ))}
      </div>

      <div className="relative mt-3">
        <Search aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted" />
        <label htmlFor="p-search" className="sr-only">
          Search orders
        </label>
        <Input id="p-search" type="search" className="pl-11 pr-12" placeholder="Store, item or order number" value={q} onChange={(e) => setQ(e.target.value)} />
        <button type="button" aria-label="Filter by store or category" onClick={() => setFilterSheet(true)} className={cn("absolute right-1.5 top-1/2 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full", store || cat ? "bg-navy text-white" : "text-muted hover:bg-ivory-deep")}>
          <SlidersHorizontal aria-hidden className="size-4" />
        </button>
      </div>

      {tab === "orders" ? (
        orders.length === 0 ? (
          <p className="mt-4 rounded-[18px] bg-card px-4 py-3.5 text-[15px] text-muted">Nothing matches.</p>
        ) : (
          <OrderList className="mt-4">
            {orders.map((v) => (
              <OrderRow key={v.order.id} v={v} today={o.today} />
            ))}
          </OrderList>
        )
      ) : active.length === 0 && done.length === 0 ? (
        <div className="mt-4 rounded-[22px] bg-card px-4 py-5 text-center shadow-[var(--shadow-card)]">
          <p className="font-display text-[20px]">No returns yet</p>
          <button type="button" onClick={() => setTab("orders")} className="mt-2 inline-flex min-h-11 items-center font-bold text-navy underline underline-offset-4">
            Pick something from your orders
          </button>
        </div>
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {active.map((v) => (
              <ReturnCard key={v.order.id} v={v} data={o.data} today={o.today} />
            ))}
          </ul>
          {done.length > 0 && (
            <>
              <h2 className="mb-2 mt-6 px-1 text-[13px] font-bold uppercase tracking-[0.07em] text-muted">Done · {done.length}</h2>
              <OrderList>
                {done.map((v) => (
                  <OrderRow key={v.order.id} v={v} today={o.today} />
                ))}
              </OrderList>
            </>
          )}
        </>
      )}

      <Sheet
        open={filterSheet}
        onOpenChange={setFilterSheet}
        title="Filter"
        footer={
          <>
            <Button onClick={() => setFilterSheet(false)}>Show Results</Button>
            {(store || cat) && (
              <Button
                variant="ghost"
                size="md"
                className="w-full"
                onClick={() => {
                  setStore("");
                  setCat("");
                }}
              >
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
    </Shell>
  );
}
