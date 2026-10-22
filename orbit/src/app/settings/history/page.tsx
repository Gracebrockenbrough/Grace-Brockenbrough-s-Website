"use client";

import { useState } from "react";
import { ClockArrowUp } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { FilterChips } from "@/components/ui/chips";
import { Field, Input } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { ago, formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import { categoryLabel } from "@/lib/ingestion/pipeline";
import type { JobStatus, ProcessingJob } from "@/lib/ingestion/types";
import { connectionOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

const statusText: Record<JobStatus, { label: string; tone: "neutral" | "success" | "warning" | "urgent" }> = {
  saved: { label: "Imported", tone: "success" },
  merged: { label: "Updated an order", tone: "success" },
  duplicate: { label: "Already had it", tone: "neutral" },
  skipped_promotion: { label: "Skipped: promotion", tone: "neutral" },
  skipped_irrelevant: { label: "Skipped: not shopping", tone: "neutral" },
  skipped_settings: { label: "Skipped by your settings", tone: "neutral" },
  needs_review: { label: "Needs a check", tone: "warning" },
  failed: { label: "Will retry", tone: "warning" },
  dead_letter: { label: "Couldn't process", tone: "urgent" },
};

type Filter = "all" | "imported" | "skipped";

/** One review item: shows only what was read (never the email body) and lets the customer finish it. */
function ReviewCard({ job }: { job: ProcessingJob }) {
  const o = useOrbit()!;
  const d = job.draft;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ retailer: d?.retailerName ?? "", item: d?.items[0]?.name ?? "", price: d?.items[0]?.price != null ? String(d.items[0].price) : d?.total != null ? String(d.total) : "", orderNumber: d?.orderNumber ?? "", date: d?.date ?? "" });
  const conn = connectionOf(o.data, job.connectionId);
  return (
    <Card as="article" className="p-4">
      <p className="text-[13px] font-semibold text-muted">
        {categoryLabel[job.category]} · {conn ? conn.label : "Shared by you"} · {ago(job.processedAt, o.today)}
      </p>
      <h3 className="mt-0.5 text-[16px] font-semibold leading-snug">{job.subject}</h3>
      <p className="mt-1 text-[14px] text-muted">{job.reason}</p>
      {d && (
        <ul className="mt-2 space-y-0.5 text-[14px]">
          {d.retailerName && <li>Store: {d.retailerName}</li>}
          {d.orderNumber && <li>Order: {d.orderNumber}</li>}
          {d.items.map((i, n) => (
            <li key={n}>
              {i.name} {i.price != null ? `· ${money(i.price)}` : ""}
            </li>
          ))}
          {d.total != null && <li>Total: {money(d.total)}</li>}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {job.orderId ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => actions.resolveReview(job.id, "corrected")}>
              Keep the Original
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Add as Purchase
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => actions.resolveReview(job.id, "dismissed")}>
          Not a Purchase
        </Button>
      </div>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Finish this purchase"
        description="We filled in what we could read. Leave anything you don't know blank."
        footer={
          <Button
            disabled={!f.retailer.trim() || !f.item.trim()}
            onClick={() => {
              const id = actions.addManualOrder({ retailerName: f.retailer, itemName: f.item.trim(), price: f.price ? Number(f.price) : null, orderNumber: f.orderNumber.trim() || null, purchasedAt: f.date || null, deliveredAt: null });
              actions.resolveReview(job.id, "corrected", id);
              setOpen(false);
            }}
          >
            Save Purchase
          </Button>
        }
      >
        <div className="space-y-3">
          <Field label="Store" htmlFor={`r-${job.id}`}>
            <Input id={`r-${job.id}`} value={f.retailer} onChange={(e) => setF({ ...f, retailer: e.target.value })} />
          </Field>
          <Field label="Item" htmlFor={`i-${job.id}`}>
            <Input id={`i-${job.id}`} value={f.item} onChange={(e) => setF({ ...f, item: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price" htmlFor={`p-${job.id}`}>
              <Input id={`p-${job.id}`} inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^0-9.]/g, "") })} />
            </Field>
            <Field label="Order number" htmlFor={`o-${job.id}`}>
              <Input id={`o-${job.id}`} value={f.orderNumber} onChange={(e) => setF({ ...f, orderNumber: e.target.value })} />
            </Field>
          </div>
          <Field label="Ordered" htmlFor={`d-${job.id}`}>
            <Input id={`d-${job.id}`} type="date" max={o.today} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
          </Field>
        </div>
      </Sheet>
    </Card>
  );
}

export default function HistoryPage() {
  const o = useOrbit();
  const [filter, setFilter] = useState<Filter>("all");
  if (!o) return <Shell loading nav={false} />;
  const jobs = o.data.jobs;
  const review = jobs.filter((j) => j.status === "needs_review");
  const rest = jobs.filter((j) => j.status !== "needs_review");
  const shown = rest.filter((j) => (filter === "imported" ? j.status === "saved" || j.status === "merged" : filter === "skipped" ? j.status.startsWith("skipped") || j.status === "duplicate" : true));

  return (
    <Shell nav={false}>
      <BackBar fallback="/settings/" title="Import history" />

      {review.length > 0 && (
        <section className="mb-6">
          <SectionTitle>Needs a quick check</SectionTitle>
          <div className="space-y-3">
            {review.map((j) => (
              <ReviewCard key={j.id} job={j} />
            ))}
          </div>
        </section>
      )}

      {jobs.length === 0 ? (
        <EmptyState icon={<ClockArrowUp aria-hidden />} title="Nothing imported yet">
          Sync an inbox in Profile, or add a purchase, and it will show up here.
        </EmptyState>
      ) : (
        <>
          <FilterChips
            label="Show"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "All", count: rest.length },
              { value: "imported", label: "Imported", count: rest.filter((j) => j.status === "saved" || j.status === "merged").length },
              { value: "skipped", label: "Skipped", count: rest.filter((j) => j.status.startsWith("skipped") || j.status === "duplicate").length },
            ]}
          />
          <Card className="mt-3 divide-y divide-line">
            {shown.map((j) => {
              const conn = connectionOf(o.data, j.connectionId);
              return (
                <div key={j.id} className="px-4 py-3">
                  <p className="flex items-start justify-between gap-3">
                    <span className="min-w-0 text-[15px] font-semibold leading-snug">{j.subject}</span>
                    <Tag tone={statusText[j.status].tone} className="shrink-0">
                      {statusText[j.status].label}
                    </Tag>
                  </p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    {categoryLabel[j.category]} · {conn ? conn.label : "Shared by you"} · {formatDate(j.processedAt.slice(0, 10), o.today)}
                    {j.tier === 0 && (j.status === "saved" || j.status === "merged") ? " · Read by rules, no AI" : ""}
                  </p>
                </div>
              );
            })}
            {shown.length === 0 && <p className="px-4 py-3 text-[15px] text-muted">Nothing here.</p>}
          </Card>
        </>
      )}

      <Notice tone="info" className="mt-6">
        Promotions and personal mail are recognized and skipped. They&apos;re listed so you can see Penny didn&apos;t import them.
      </Notice>
    </Shell>
  );
}
