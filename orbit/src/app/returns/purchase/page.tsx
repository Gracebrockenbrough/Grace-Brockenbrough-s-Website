"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, FileText, Link2, ScrollText, Trash } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { DeadlineLine } from "@/components/orbit/deadline";
import { ProductThumb } from "@/components/orbit/retail";
import { Button, ButtonLink, ExternalButton, TextLink } from "@/components/ui/button";
import { Card, Row, Rows } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Field, Input } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/lib/domain/dates";
import { capabilityLabel, dropOffLabel, money, orderTotal, refundMethodLabel } from "@/lib/domain/format";
import type { DateOnly, Evidence, FieldSource, ReturnPolicy } from "@/lib/domain/types";
import type { Deadline } from "@/lib/intelligence/returns";
import { orderView, type OrderView } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

const evidenceLabel: Record<Evidence["kind"], string> = {
  order_confirmation: "Order confirmation",
  shipping_notice: "Shipping email",
  delivery_update: "Delivery email",
  return_confirmation: "Return confirmation",
  return_label: "Return label email",
  refund_confirmation: "Refund email",
  gift_card_email: "Gift card email",
  receipt_upload: "Uploaded receipt",
  manual_entry: "Added by you",
  retailer_integration: "Retailer",
};

function sourceHint(src: FieldSource | undefined, evidence: Evidence[]) {
  if (!src) return "Not found in your emails";
  if (src.method === "user") return "Added by you";
  const ev = evidence.find((e) => e.id === src.evidenceId);
  const conf = src.confidence === "high" ? "" : ` · ${src.confidence} confidence`;
  return `${ev ? evidenceLabel[ev.kind] : "Email"}${conf}`;
}

function Unknown() {
  return <span className="font-normal text-muted">Unknown</span>;
}

const tri = (v: boolean | null, yes: string, no: string) => (v == null ? <Unknown /> : v ? yes : no);

function DeadlineExplainer({ deadline, view, today }: { deadline: Deadline | null; view: OrderView; today: DateOnly }) {
  if (!deadline) return null;
  const name = view.retailer.name;
  switch (deadline.kind) {
    case "confirmed":
      return <p className="mt-2 text-[15px] text-muted">Confirmed in your order email from {name}.</p>;
    case "estimated":
      return (
        <p className="mt-2 text-[15px] text-muted">
          Estimated from {name}&apos;s standard policy. Your item may have different terms, so confirm on {name}&apos;s site if you&apos;re close to the deadline.
          {deadline.staleAfter && " This policy hasn't been re-checked recently."}
        </p>
      );
    case "not_started":
      return <p className="mt-2 text-[15px] text-muted">{deadline.reason}</p>;
    case "unknown":
      return <p className="mt-2 text-[15px] text-muted">{deadline.reason} We won&apos;t guess a date.</p>;
  }
}

function PolicySection({ policy, retailerName, today }: { policy: ReturnPolicy | null; retailerName: string; today: DateOnly }) {
  if (!policy)
    return (
      <Notice tone="warning" title="No policy on file">
        We don&apos;t have {retailerName}&apos;s return policy yet, so we can&apos;t estimate a deadline. Check the retailer&apos;s site for their terms.
      </Notice>
    );
  const startLabel = { delivery: "Delivery date", purchase: "Purchase date", shipment: "Ship date", unknown: "Unknown" }[policy.windowStartsAt];
  const fee = (n: number | null) => (n == null ? <Unknown /> : n === 0 ? "Free" : money(n));
  return (
    <>
      {policy.verification === "sample" && (
        <Notice tone="demo" className="mb-2">
          Sample policy for this prototype, not verified with {retailerName}.
        </Notice>
      )}
      <Rows>
        <Row label="Return window">{policy.windowDays ? `${policy.windowDays} days` : <Unknown />}</Row>
        <Row label="Window starts">{startLabel}</Row>
        <Row label="Refund">{policy.refundMethods.map((m) => refundMethodLabel[m]).join(" or ")}</Row>
        <Row label="Mail return fee" hint={policy.fees.waivedForStoreCredit ? "Free if you choose store credit" : undefined}>
          {fee(policy.fees.mail)}
        </Row>
        <Row label="In-store return">{fee(policy.fees.inStore)}</Row>
        <Row label="Drop-off">{policy.dropOff.map((d) => dropOffLabel[d]).join(", ")}</Row>
        <Row label="Box needed">{tri(policy.shipping.boxRequired, "Yes", "No")}</Row>
        <Row label="Printer needed">{tri(policy.shipping.qrCodeAvailable ? false : policy.shipping.printingRequired, "Yes", "No")}</Row>
        <Row label="Last checked">{formatDate(policy.lastCheckedAt, today)}</Row>
      </Rows>
      {policy.exceptions.length > 0 && (
        <ul className="mt-2 space-y-1 text-[15px] text-muted">
          {policy.exceptions.map((e) => (
            <li key={e.description}>• {e.description}</li>
          ))}
        </ul>
      )}
      <TextLink href={policy.sourceUrl} external className="mt-1">
        Verify on {retailerName}&apos;s site
      </TextLink>
    </>
  );
}

function PurchaseDetail() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const o = useOrbit();
  const [dateSheet, setDateSheet] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState(false);
  const [date, setDate] = useState("");

  if (!o) return <Shell loading nav={false} />;
  const order = o.data.orders.find((x) => x.id === id);
  if (!order)
    return (
      <Shell>
        <BackBar fallback="/returns/" />
        <EmptyState icon={<FileText aria-hidden />} title="Purchase not found" action={<ButtonLink href="/returns/">Back to Purchases</ButtonLink>}>
          It may have been deleted.
        </EmptyState>
      </Shell>
    );

  const { today, data } = o;
  const view = orderView(data, order, today);
  const { retailer, policy, items, action } = view;
  const evidence = data.evidence.filter((e) => order.evidenceIds.includes(e.id));
  const unknownStart = view.deadline?.kind === "unknown" && view.deadline.missing === "start_date";
  const openItems = items.filter((i) => i.stage === "to_decide");
  const kept = items.filter((i) => i.stage === "kept");
  const title = order.items.length === 1 ? order.items[0].name : `${order.items.length} items`;

  return (
    <Shell>
      <BackBar fallback="/returns/" />

      <header className="flex items-center gap-4 pb-5 pt-2">
        <ProductThumb category={order.items[0]?.category ?? "other"} tone={retailer.tone} className="size-[72px]" />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold uppercase tracking-[0.06em] text-muted">{retailer.name}</p>
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em]">{title}</h1>
          <p className="tabular text-[16px] text-muted">{money(orderTotal(order))}</p>
        </div>
      </header>

      {/* Status & next step */}
      <Card className="p-5">
        <p className="text-[17px] font-semibold">{view.status}</p>
        {view.stage !== "returning" && view.stage !== "completed" && (
          <>
            <DeadlineLine deadline={view.deadline} today={today} className="mt-1" />
            <DeadlineExplainer deadline={view.deadline} view={view} today={today} />
          </>
        )}
        {view.activeReturn && (
          <p className="mt-1 text-[15px] text-muted">
            {capabilityLabel[view.activeReturn.capability].name} return · started {formatDate(view.activeReturn.createdAt.slice(0, 10), today)}
          </p>
        )}

        <div className="mt-4 space-y-2">
          {unknownStart ? (
            <>
              <Button onClick={() => setDateSheet(true)} icon={<CalendarDays aria-hidden className="size-5" />}>
                Add Delivery Date
              </Button>
              <ButtonLink href={`/returns/start/?order=${order.id}`} variant="secondary" size="md" className="w-full">
                Start Return Anyway
              </ButtonLink>
            </>
          ) : action.label !== "View Details" ? (
            <ButtonLink href={action.href} variant={action.primary ? "primary" : "secondary"}>
              {action.label}
            </ButtonLink>
          ) : retailer.websiteUrl ? (
            <ExternalButton href={retailer.supportUrl || retailer.websiteUrl} variant="secondary">
              Contact {retailer.name}
            </ExternalButton>
          ) : null}
          {openItems.length > 0 && (
            <Button variant="ghost" size="md" className="w-full" onClick={() => actions.keepItems(order.id, openItems.map((i) => i.item.id))}>
              I&apos;m Keeping {openItems.length > 1 ? "These" : "It"}
            </Button>
          )}
          {kept.length > 0 && openItems.length === 0 && (
            <Button variant="ghost" size="md" className="w-full" onClick={() => actions.undoKeep(order.id)}>
              Undo “Keeping”
            </Button>
          )}
        </div>
      </Card>

      {/* Items */}
      {order.items.length > 1 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Items</h2>
          <Card as="section" className="divide-y divide-line">
            {items.map((a) => (
              <div key={a.item.id} className="flex items-start gap-3 p-4">
                <ProductThumb category={a.item.category} tone={retailer.tone} className="size-12 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{a.item.name}</p>
                  <p className="text-[14px] text-muted">
                    {[a.item.variant, a.item.quantity > 1 ? `Qty ${a.item.quantity}` : null].filter(Boolean).join(" · ")}
                  </p>
                  {a.stage === "to_decide" && <DeadlineLine deadline={a.deadline} today={today} className="mt-1 text-[14px]" />}
                  {a.stage === "returning" && <p className="mt-1 text-[14px] font-medium">Returning</p>}
                  {a.stage === "kept" && <p className="mt-1 text-[14px] text-muted">Keeping</p>}
                </div>
                <p className="tabular font-medium">{money(a.item.unitPrice)}</p>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Secondary details, collapsed */}
      <Card className="mt-6 overflow-hidden">
        <Disclosure title="Order details" summary={order.orderNumber ? `Order ${order.orderNumber}` : "Order number not found"} icon={<FileText aria-hidden className="size-5" />}>
          <Rows>
            <Row label="Order number" hint={sourceHint(order.fieldSources.orderNumber, evidence)}>
              {order.orderNumber ?? <Unknown />}
            </Row>
            <Row label="Retailer">{retailer.name}</Row>
            <Row label="Purchased" hint={order.purchasedAt ? sourceHint(order.fieldSources.purchasedAt, evidence) : undefined}>
              {order.purchasedAt ? formatDate(order.purchasedAt, today) : <Unknown />}
            </Row>
            <Row label="Shipped" hint={order.shippedAt ? sourceHint(order.fieldSources.shippedAt, evidence) : undefined}>
              {order.shippedAt ? formatDate(order.shippedAt, today) : <Unknown />}
            </Row>
            <Row label="Delivered" hint={order.deliveredAt ? sourceHint(order.fieldSources.deliveredAt, evidence) : undefined}>
              {order.deliveredAt ? formatDate(order.deliveredAt, today) : <Unknown />}
            </Row>
            {order.tracking && (
              <Row label="Tracking">
                {order.tracking.carrier} <span className="tabular block text-[13px] font-normal text-muted">{order.tracking.number}</span>
              </Row>
            )}
            <Row label="Return eligibility">
              {items.some((i) => i.eligibility === "ineligible") ? "Final sale" : items.some((i) => i.eligibility === "window_closed") ? "Window closed" : items.some((i) => i.eligibility === "unknown") ? <Unknown /> : "Eligible"}
            </Row>
          </Rows>
          {!order.deliveredAt && (
            <Button variant="secondary" size="md" className="mt-2 w-full" onClick={() => setDateSheet(true)}>
              Add Delivery Date
            </Button>
          )}
        </Disclosure>

        <Disclosure
          title="Return policy"
          summary={policy?.windowDays ? `${policy.windowDays} days from ${policy.windowStartsAt}` : "Not on file"}
          icon={<ScrollText aria-hidden className="size-5" />}
        >
          <PolicySection policy={policy} retailerName={retailer.name} today={today} />
        </Disclosure>

        <Disclosure title="Receipt & emails" summary={evidence.length ? `${evidence.length} saved` : "None saved"} icon={<FileText aria-hidden className="size-5" />}>
          {evidence.length === 0 ? (
            <p className="text-[15px] text-muted">No receipts or emails are attached to this order.</p>
          ) : (
            <ul className="space-y-3">
              {evidence.map((e) => (
                <li key={e.id} className="rounded-2xl bg-ivory p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[15px] font-semibold">{e.title}</p>
                    {e.channel === "sample_inbox" && <Tag>Sample</Tag>}
                  </div>
                  <p className="text-[13px] text-muted">
                    {evidenceLabel[e.kind]} · {formatDate(e.receivedAt.slice(0, 10), today)}
                  </p>
                  {e.excerpt && <p className="mt-1.5 text-[14px] leading-snug">{e.excerpt}</p>}
                </li>
              ))}
            </ul>
          )}
        </Disclosure>

        <Disclosure title="Return portal" summary={retailer.returnsUrl ? `${retailer.name} returns` : "Not available"} icon={<Link2 aria-hidden className="size-5" />}>
          {retailer.returnsUrl ? (
            <>
              <p className="mb-3 text-[15px] text-muted">
                Opens {retailer.name}&apos;s website. In this prototype it opens the homepage; verified deep links are added per retailer.
              </p>
              <ExternalButton href={retailer.returnsUrl} variant="secondary" size="md" className="w-full">
                Open {retailer.name}
              </ExternalButton>
            </>
          ) : (
            <p className="text-[15px] text-muted">We don&apos;t have a return link for this retailer yet.</p>
          )}
        </Disclosure>
      </Card>

      <div className="mt-6 flex justify-center">
        <Button variant="ghost" size="sm" className="text-muted" icon={<Trash aria-hidden className="size-4" />} onClick={() => setDeleteSheet(true)}>
          Delete this purchase
        </Button>
      </div>

      <Sheet
        open={dateSheet}
        onOpenChange={setDateSheet}
        title="When did it arrive?"
        description="We'll use this to work out the return deadline."
        footer={
          <Button
            disabled={!date}
            onClick={() => {
              actions.setOrderDate(order.id, "deliveredAt", date);
              setDateSheet(false);
            }}
          >
            Save Delivery Date
          </Button>
        }
      >
        <Field label="Delivery date" htmlFor="delivered">
          <Input id="delivered" type="date" max={today} min={order.shippedAt ?? order.purchasedAt ?? undefined} value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </Sheet>

      <Sheet
        open={deleteSheet}
        onOpenChange={setDeleteSheet}
        title="Delete this purchase?"
        description="This removes the order, its returns, refund tracking and saved emails from Orbit. It doesn't affect anything at the retailer."
        footer={
          <Button
            variant="danger"
            onClick={() => {
              actions.deleteOrder(order.id);
              router.replace("/returns/");
            }}
          >
            Delete Purchase
          </Button>
        }
      >
        <span />
      </Sheet>
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading />}>
      <PurchaseDetail />
    </Suspense>
  );
}
