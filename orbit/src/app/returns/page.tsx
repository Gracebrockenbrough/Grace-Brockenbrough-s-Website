"use client";

import Link from "next/link";
import { Archive, ChevronRight, PackageOpen, Plus, Search } from "lucide-react";
import { PageHeader, Shell } from "@/components/layout/shell";
import { OrderRow } from "@/components/orbit/order-row";
import { ButtonLink, IconLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { money } from "@/lib/domain/format";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { bucketFor, bucketMeta, type Bucket } from "@/lib/intelligence/priorities";
import { orderViews, type OrderView, type TaskGroup } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

type Tab = Exclude<TaskGroup, "history">;
const TABS: { id: Tab; label: string; empty: string; hint: string }[] = [
  { id: "action", label: "Needs your action", empty: "Nothing needs you right now.", hint: "Soonest deadline first." },
  { id: "awaiting", label: "Awaiting retailer", empty: "No returns are waiting on a store.", hint: "Nothing to do. We'll flag anything that runs late." },
  { id: "not_delivered", label: "Not delivered yet", empty: "Everything you ordered has arrived.", hint: "Return windows start when these arrive." },
];
const BUCKETS: Bucket[] = ["overdue", "soon", "week", "later", "missing"];
const sum = (list: OrderView[]) => list.reduce((s, v) => s + (v.amount ?? 0), 0);

export default function ReturnsPage() {
  const o = useOrbit();
  const [tab, setTab] = useSessionState<Tab>("returns-tab", "action");
  if (!o) return <Shell loading />;

  const views = orderViews(o.data, o.today);
  const by = (g: TaskGroup) => views.filter((v) => v.current.group === g);
  const history = by("history");
  const list = by(tab);
  const current = TABS.find((t) => t.id === tab)!;

  const header = (
    <PageHeader
      title="Returns"
      subtitle="Unfinished business, most urgent first."
      action={
        <>
          <IconLink href="/ask/" label="Search purchases with Ask Orbit">
            <Search aria-hidden className="size-[22px]" />
          </IconLink>
          <IconLink href="/add/" label="Add a purchase">
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

  if (views.length === 0)
    return (
      <Shell>
        {header}
        <EmptyState icon={<PackageOpen aria-hidden />} title="No purchases yet" action={<ButtonLink href="/add/">Add a Purchase</ButtonLink>}>
          Add an order confirmation and Orbit will keep track of the return window.
        </EmptyState>
      </Shell>
    );

  return (
    <Shell>
      {header}

      <div role="tablist" aria-label="Filter returns" className="grid grid-cols-3 gap-2">
        {TABS.map((t) => {
          const items = by(t.id);
          const sel = t.id === tab;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={sel}
              aria-controls="returns-list"
              onClick={() => setTab(t.id)}
              className={cn("rounded-[18px] px-3 py-3 text-left transition-colors", sel ? "bg-navy text-white" : "border border-line bg-card hover:bg-ivory-deep")}
            >
              <span className={cn("block text-[13px] font-semibold leading-tight", sel ? "text-white/75" : "text-muted")}>{t.label}</span>
              <span className="tabular block pt-1 text-[24px] font-semibold leading-tight">{items.length}</span>
              <span className={cn("tabular block text-[13px]", sel ? "text-white/75" : "text-muted")}>{money(sum(items))}</span>
            </button>
          );
        })}
      </div>

      <div id="returns-list" role="tabpanel" aria-label={current.label} className="mt-5">
        <p className="mb-1 text-[14px] text-muted">{current.hint}</p>
        {list.length === 0 ? (
          <p className="mt-3 rounded-[18px] bg-sage px-4 py-3.5 text-[15px] font-medium text-sage-ink">{current.empty}</p>
        ) : tab === "action" ? (
          BUCKETS.map((b) => {
            const group = list.filter((v) => bucketFor(v.current.daysLeft) === b);
            if (!group.length) return null;
            return (
              <section key={b} className="mt-5" aria-labelledby={`rb-${b}`}>
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <h2 id={`rb-${b}`} className="text-[17px] font-semibold">
                    {bucketMeta[b].title} <span className="tabular font-normal text-muted">· {group.length}</span>
                  </h2>
                  <span className="tabular text-[14px] text-muted">{money(sum(group))}</span>
                </div>
                <div className="space-y-2.5">
                  {group.map((v) => (
                    <OrderRow key={v.order.id} v={v} />
                  ))}
                </div>
              </section>
            );
          })
        ) : (
          <div className="mt-3 space-y-2.5">
            {list.map((v) => (
              <OrderRow key={v.order.id} v={v} />
            ))}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <Link href="/returns/history/" className="mt-8 flex min-h-14 items-center gap-3 border-t border-line pt-3 text-muted hover:text-navy">
          <Archive aria-hidden className="size-5" />
          <span className="flex-1 text-[15px] font-semibold">Completed · {history.length}</span>
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      )}
    </Shell>
  );
}
