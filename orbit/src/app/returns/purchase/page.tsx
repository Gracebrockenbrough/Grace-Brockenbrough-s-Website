"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowUpRight, CalendarClock, CalendarDays, Camera, Check, ChevronRight, Copy, FileText, FileUp, Inbox, Mail, PackageCheck, PlugZap, ScanBarcode, ScrollText, Store, Trash } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { ProductThumb } from "@/components/orbit/retail";
import { Button, ButtonLink, ExternalButton, TextLink } from "@/components/ui/button";
import { Card, Row, Rows } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Field, Input } from "@/components/ui/form";
import { RefundAsker } from "@/components/orbit/refund-asker";
import { Journey } from "@/components/orbit/journey";
import { orderJourney } from "@/lib/intelligence/journey";
import { CapabilityList, ReturnDates } from "@/components/orbit/return-dates";
import { Notice, Tag } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { trackingUrl } from "@/lib/domain/carriers";
import { formatDate } from "@/lib/domain/dates";
import { downscaleImage, readSmallFile } from "@/lib/hooks/downscale";
import { dropOffLabel, money, orderTotal, refundMethodLabel } from "@/lib/domain/format";
import type { DateOnly, Evidence, FieldSource, ReturnPolicy } from "@/lib/domain/types";
import { orderDeadlines, orderView, purchaseSource, refundOutlook, type MoneyKind } from "@/lib/store/selectors";
import { capabilitiesOf } from "@/lib/retailers/capabilities";
import { actions, useOrbit } from "@/lib/store/store";
import { toast } from "@/components/ui/toast";

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
  if (!src) return undefined;
  if (src.method === "user") return "Added by you";
  const ev = evidence.find((e) => e.id === src.evidenceId);
  return `${ev ? evidenceLabel[ev.kind] : "Email"}${src.confidence === "high" ? "" : ` · ${src.confidence} confidence`}`;
}

function Missing({ children = "Not in your emails" }: { children?: string }) {
  return <span className="font-normal text-muted">{children}</span>;
}

function CopyValue({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="inline-flex items-center gap-1">
      <span className="tabular">{value}</span>
      <button
        type="button"
        aria-label={`Copy ${label}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          } catch {
            // Clipboard blocked; the value stays visible to copy by hand.
          }
        }}
        className="-my-2 -mr-2 inline-flex size-10 items-center justify-center rounded-full text-muted hover:bg-ivory-deep hover:text-navy"
      >
        {done ? <Check aria-hidden className="size-4 text-sage-ink" /> : <Copy aria-hidden className="size-4" />}
      </button>
    </span>
  );
}

const moneyTag: Record<MoneyKind, { label: string; tone: "neutral" | "success" | "warning" }> = {
  potential: { label: "Potential", tone: "neutral" },
  expected: { label: "Expected", tone: "warning" },
  confirmed: { label: "Issued", tone: "success" },
  actual: { label: "Actual", tone: "success" },
  last_known: { label: "Last known", tone: "warning" },
};

function PolicySection({ policy, retailerName, today, inStore = false, newer = null }: { policy: ReturnPolicy | null; retailerName: string; today: DateOnly; inStore?: boolean; newer?: ReturnPolicy | null }) {
  if (!policy)
    return (
      <Notice tone="warning" title="No policy on file">
        We don&apos;t have {retailerName}&apos;s return policy yet, so we can&apos;t estimate a deadline. Check the retailer&apos;s site for their terms.
      </Notice>
    );
  const startLabel = { delivery: "Delivery date", purchase: "Purchase date", shipment: "Ship date", unknown: "Unknown" }[policy.windowStartsAt];
  const fee = (n: number | null) => (n == null ? <Missing>Not confirmed</Missing> : n === 0 ? "Free" : money(n));
  const tri = (v: boolean | null) => (v == null ? <Missing>Not confirmed</Missing> : v ? "Yes" : "No");
  return (
    <>
      {policy.verification === "sample" && (
        <Notice tone="demo" className="mb-2">
          Sample policy for this prototype, not verified with {retailerName}.
        </Notice>
      )}
      <Rows>
        {inStore && (
          <Row label="Bought in store" hint={policy.inStore.note ?? undefined}>
            {policy.inStore.accepted === false ? "In-store returns not listed" : policy.inStore.windowDays ? `${policy.inStore.windowDays} days from purchase` : "Same window, from the purchase date"}
          </Row>
        )}
        <Row label="Return window">{policy.windowDays ? `${policy.windowDays} days` : <Missing>Not confirmed</Missing>}</Row>
        <Row label="Window starts">{inStore ? "Purchase date" : startLabel}</Row>
        <Row label="Label or approval">{policy.labelWithinDays != null ? `Within ${policy.labelWithinDays} days of starting` : policy.approvalRequired ? "Approval needed, no time limit stated" : "Comes when you start"}</Row>
        <Row label="Ship or drop off">{policy.shipWithinDays != null ? `Within ${policy.shipWithinDays} days of starting` : <Missing>No separate limit stated</Missing>}</Row>
        {!inStore && policy.inStore.accepted && <Row label="In-store returns" hint={policy.inStore.note ?? undefined}>{policy.inStore.windowDays ? `${policy.inStore.windowDays} days` : "Accepted"}</Row>}
        <Row label="Refund">{policy.refundMethods.map((m) => refundMethodLabel[m]).join(" or ")}</Row>
        <Row label="Mail return fee" hint={policy.fees.waivedForStoreCredit ? "Free if you choose store credit" : undefined}>
          {fee(policy.fees.mail)}
        </Row>
        <Row label="In-store return">{fee(policy.fees.inStore)}</Row>
        <Row label="Drop-off">{policy.dropOff.map((d) => dropOffLabel[d]).join(", ")}</Row>
        <Row label="Box needed">{tri(policy.shipping.boxRequired)}</Row>
        <Row label="Printer needed">{tri(policy.shipping.qrCodeAvailable ? false : policy.shipping.printingRequired)}</Row>
        <Row label="Last checked">{formatDate(policy.lastCheckedAt, today)}</Row>
        <Row label="Policy version" hint={newer ? `Version ${newer.version} applies to purchases from ${formatDate(newer.effectiveFrom!, today)}. This order keeps the terms it was bought under.` : undefined}>
          {policy.version}
        </Row>
      </Rows>
      {policy.holidayNote && <p className="mt-2 text-[15px] text-muted">{policy.holidayNote}</p>}
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
  const [receipt, setReceipt] = useState<Evidence | null>(null);
  const [date, setDate] = useState("");
  const [trackSheet, setTrackSheet] = useState(false);
  const [trackNo, setTrackNo] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  if (!o) return <Shell loading nav={false} />;
  const order = o.data.orders.find((x) => x.id === id);
  if (!order)
    return (
      <Shell>
        <BackBar fallback="/returns/" />
        <EmptyState icon={<FileText aria-hidden />} title="Purchase not found" action={<ButtonLink href="/returns/">Back to Returns</ButtonLink>}>
          It may have been deleted.
        </EmptyState>
      </Shell>
    );

  const { today, data } = o;
  const v = orderView(data, order, today);
  const { retailer, policy, items, current: c } = v;
  const evidence = data.evidence.filter((e) => order.evidenceIds.includes(e.id));
  const outlook = refundOutlook(v);
  const openItems = items.filter((i) => i.stage === "to_decide");
  const kept = items.filter((i) => i.stage === "kept");
  const single = order.items.length === 1 ? order.items[0] : null;
  const needsDelivery = v.deadline?.kind === "unknown" && v.deadline.missing === "start_date";
  const r = v.activeReturn ?? v.latestReturn;
  const artifact = r?.artifacts[0] ?? null;
  const ch = order.charges;
  const refundIssued = Boolean(v.refund?.confirmed && v.refund.destination !== "store_credit" && !v.refund.arrivedAt);
  const shipment = v.activeReturn && ["prepared", "reported_submitted", "approval_pending", "label_ready", "shipped"].includes(v.activeReturn.status) ? v.activeReturn : null;

  const toFile = async (f: File) => ({ name: f.name, type: f.type || "application/octet-stream", dataUrl: f.type.startsWith("image/") ? await downscaleImage(f, 1000) : await readSmallFile(f) });
  const onReceipt = async (f?: File) => {
    if (!f) return;
    try {
      setFileError(null);
      actions.attachReceipt(order.id, await toFile(f));
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  };
  const onLabel = async (f?: File) => {
    if (!f || !shipment) return;
    try {
      setFileError(null);
      actions.saveReturnLabel(shipment.id, await toFile(f));
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "Couldn't read that file.");
    }
  };
  const itemsSubtotal = orderTotal(order);
  const source = purchaseSource(data, order);
  const dates = orderDeadlines(v, today);
  const caps = capabilitiesOf(retailer, policy);
  const latestPolicy = data.policies.filter((p) => p.retailerId === order.retailerId).sort((a, b) => b.version - a.version)[0] ?? null;
  const newerPolicy = latestPolicy && policy && latestPolicy.version > policy.version ? latestPolicy : null;
  const inStore = order.channel === "in_store";

  const deadlineRow = (() => {
    const d = v.deadline;
    if (c.key === "drop_off" && r?.shipBy) return { value: `Drop off by ${formatDate(r.shipBy, today)}`, tag: { label: "From retailer", tone: "success" as const } };
    if (!d) return null;
    if (d.kind === "confirmed") return { value: formatDate(d.date, today), tag: { label: `Confirmed by ${retailer.name}`, tone: "success" as const } };
    if (d.kind === "estimated") return { value: formatDate(d.date, today), tag: { label: "Estimated", tone: "warning" as const } };
    if (d.kind === "not_started") return { value: "Starts at delivery", tag: null };
    return { value: "Deadline unknown", tag: { label: "Needs info", tone: "warning" as const } };
  })();

  return (
    <Shell>
      <BackBar fallback="/returns/" title="Order details" />

      {/* Product overview */}
      <header className="flex items-center gap-4 pb-5 pt-2">
        <ProductThumb category={order.items[0]?.category ?? "other"} name={order.items[0]?.name} tone={retailer.tone} className="size-[84px] rounded-[20px]" count={order.items.length} />
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-muted">{retailer.name}</p>
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em]">{single ? single.name : `${order.items.length} items`}</h1>
          <p className="tabular mt-0.5 text-[18px] font-semibold">{money(single ? single.unitPrice : itemsSubtotal)}</p>
          {single && (single.variant || single.quantity > 1) && (
            <p className="text-[15px] text-muted">{[single.variant, single.quantity > 1 ? `Qty ${single.quantity}` : null].filter(Boolean).join(" · ")}</p>
          )}
        </div>
      </header>

      <p className="-mt-2 mb-4 flex items-center gap-1.5 text-[14px] text-muted">
        {inStore ? <Store aria-hidden className="size-4 shrink-0" /> : <Inbox aria-hidden className="size-4 shrink-0" />}
        <span className="min-w-0 truncate">
          {source.connectionId ? "Purchased using: " : "Source: "}
          <span className="font-semibold text-navy">{source.label}</span>
          {source.detail ? ` · ${source.detail}` : ""}
          {inStore ? " · Bought in store" : ""}
        </span>
      </p>

      {/* Return overview */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[17px] font-semibold">Return</h2>
          <Tag tone={c.indicator === "done" ? "success" : c.indicator === "unknown" || c.indicator === "refund_check" ? "warning" : c.daysLeft != null && c.daysLeft <= 3 ? "urgent" : "neutral"}>{c.label}</Tag>
        </div>
        <p className="mt-1 text-[15px] text-muted">{c.why}</p>
        <Rows className="mt-2">
          {deadlineRow && (
            <Row label={c.key === "drop_off" ? "Drop-off deadline" : "Return deadline"} hint={deadlineRow.tag ? <Tag tone={deadlineRow.tag.tone} className="mt-1">{deadlineRow.tag.label}</Tag> : undefined}>
              {deadlineRow.value}
            </Row>
          )}
          <Row label={outlook.kind === "confirmed" ? "Refund" : "Expected refund"} hint={<Tag tone={moneyTag[outlook.kind].tone} className="mt-1">{moneyTag[outlook.kind].label}</Tag>}>
            {outlook.amount != null ? money(outlook.amount) : <Missing>Not known yet</Missing>}
            <span className="block text-[13px] font-normal text-muted">{outlook.methodLabel}</span>
          </Row>
          <Row label="Return method">{r?.dropOff ? (r.dropOff === "store" ? `${retailer.name} store` : `${dropOffLabel[r.dropOff]} drop-off`) : <Missing>Choose when you start</Missing>}</Row>
        </Rows>

        {refundIssued && <RefundAsker compact refund={v.refund!} request={v.latestReturn ?? null} retailer={retailer} orderNumber={order.orderNumber} today={today} />}
        {v.refund?.arrivedAt && <p className="mt-2 text-[14px] font-medium text-sage-ink">You confirmed the refund arrived on {formatDate(v.refund.arrivedAt, today)}.</p>}

        {shipment && (
          <div className="mt-3 rounded-2xl border border-line px-3 py-2.5">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Return shipment</p>
            {shipment.returnTracking ? (
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="text-[15px]">
                  {shipment.returnTracking.carrier ?? "Tracking"} <span className="tabular text-muted">{shipment.returnTracking.number}</span>
                </span>
                {trackingUrl(shipment.returnTracking.carrier, shipment.returnTracking.number) && (
                  <a href={trackingUrl(shipment.returnTracking.carrier, shipment.returnTracking.number)!} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold text-navy">
                    Track <ArrowUpRight aria-hidden className="size-4" />
                  </a>
                )}
              </div>
            ) : (
              <p className="mt-1 text-[14px] text-muted">Shipped it? Add the tracking number from your drop-off receipt.</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {!shipment.artifacts.length && (
                <label className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-card px-4 text-[14px] font-semibold hover:bg-ivory-deep">
                  <FileUp aria-hidden className="size-4" /> Save Return Label
                  <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => onLabel(e.target.files?.[0])} />
                </label>
              )}
              {!shipment.returnTracking && (
                <Button variant="secondary" size="sm" icon={<ScanBarcode aria-hidden className="size-4" />} onClick={() => setTrackSheet(true)}>
                  Add Tracking Number
                </Button>
              )}
            </div>
            {fileError && <p role="alert" className="mt-1 text-[14px] text-terracotta">{fileError}</p>}
          </div>
        )}

        {shipment && (
          <ButtonLink href={`/returns/kit/?id=${shipment.id}`} variant="secondary" size="md" className="mt-3 w-full" icon={<PackageCheck aria-hidden className="size-4" />}>
            Open Return Kit
          </ButtonLink>
        )}

        <div className="mt-3 space-y-2">
          {needsDelivery ? (
            <Button onClick={() => setDateSheet(true)} icon={<CalendarDays aria-hidden className="size-5" />}>
              Add Delivery Date
            </Button>
          ) : c.action.label !== "View Details" ? (
            <ButtonLink href={c.action.href}>{c.action.label}</ButtonLink>
          ) : retailer.websiteUrl ? (
            <ExternalButton href={retailer.supportUrl || retailer.websiteUrl} variant="secondary">
              Contact {retailer.name}
            </ExternalButton>
          ) : null}
          {needsDelivery && (
            <ButtonLink href={`/returns/start/?order=${order.id}`} variant="secondary" size="md" className="w-full">
              Start Return Anyway
            </ButtonLink>
          )}
          {openItems.length > 0 && (
            <Button variant="ghost" size="md" className="w-full" onClick={() => {
                actions.keepItems(order.id, openItems.map((i) => i.item.id));
                toast(openItems.length > 1 ? "Keeping them" : "Keeping it", "Return reminders are off. You can undo this anytime.");
              }}>
              I&apos;m Keeping {openItems.length > 1 ? "These" : "It"}
            </Button>
          )}
          {kept.length > 0 && openItems.length === 0 && !v.activeReturn && (
            <Button variant="ghost" size="md" className="w-full" onClick={() => actions.undoKeep(order.id)}>
              Undo &ldquo;Keeping&rdquo;
            </Button>
          )}
        </div>
      </Card>

      {/* Journey: what has happened and what's next, with how each step is known */}
      <section aria-labelledby="journey" className="mt-6">
        <h2 id="journey" className="mb-1 text-[17px] font-semibold">
          Journey
        </h2>
        <Card className="px-4 py-2">
          <Journey steps={orderJourney(data, v)} today={today} />
        </Card>
      </section>

      {/* Items (multi-item orders): return them individually */}
      {order.items.length > 1 && (
        <section className="mt-6" aria-labelledby="items">
          <h2 id="items" className="mb-2 text-[17px] font-semibold">
            Items <span className="font-normal text-muted">· {order.items.length}</span>
          </h2>
          <Card className="divide-y divide-line">
            {items.map((a) => (
              <div key={a.item.id} className="flex items-center gap-3 p-3.5">
                <ProductThumb category={a.item.category} name={a.item.name} tone={retailer.tone} className="size-12 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.item.name}</p>
                  <p className="truncate text-[14px] text-muted">
                    {[a.item.variant, a.item.quantity > 1 ? `Qty ${a.item.quantity}` : null, { to_decide: "Can be returned", returning: "Returning", completed: "Returned", kept: "Keeping", on_the_way: "Not delivered yet", not_returnable: a.eligibility === "ineligible" ? "Final sale" : "Window closed" }[a.stage]].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="tabular font-semibold">{money(a.item.unitPrice)}</span>
                  {a.stage === "to_decide" && (
                    <Link href={`/returns/start/?order=${order.id}&item=${a.item.id}`} className="inline-flex min-h-9 items-center gap-0.5 text-[14px] font-semibold text-navy hover:underline">
                      Return this <ChevronRight aria-hidden className="size-4" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {/* Secondary details */}
      <Card className="mt-6 overflow-hidden">
        {(openItems.length > 0 || v.activeReturn) && (
          <Disclosure title="Return dates" summary="Start, label and ship-by, kept separate" icon={<CalendarClock aria-hidden className="size-5" />}>
            <ReturnDates dates={dates} today={today} />
          </Disclosure>
        )}
        <Disclosure title="Purchase details" summary={order.orderNumber ? `Order ${order.orderNumber}` : "Order number not found"} icon={<FileText aria-hidden className="size-5" />}>
          <Rows>
            <Row label="Order number" hint={sourceHint(order.fieldSources.orderNumber, evidence)}>
              {order.orderNumber ? <CopyValue value={order.orderNumber} label="order number" /> : <Missing />}
            </Row>
            <Row label="Ordered" hint={sourceHint(order.fieldSources.purchasedAt, evidence)}>
              {order.purchasedAt ? formatDate(order.purchasedAt, today) : <Missing />}
            </Row>
            <Row label="Shipped" hint={sourceHint(order.fieldSources.shippedAt, evidence)}>
              {order.shippedAt ? formatDate(order.shippedAt, today) : <Missing />}
            </Row>
            <Row label="Delivered" hint={sourceHint(order.fieldSources.deliveredAt, evidence)}>
              {order.deliveredAt ? formatDate(order.deliveredAt, today) : <Missing>Not confirmed</Missing>}
            </Row>
            {!order.deliveredAt && order.expectedDeliveryAt && (
              <Row label="Expected delivery" hint={<Tag tone="warning" className="mt-1">Estimate</Tag>}>
                {formatDate(order.expectedDeliveryAt, today)}
              </Row>
            )}
            <Row label="Carrier">{order.tracking?.carrier ?? <Missing />}</Row>
            <Row
              label="Tracking number"
              hint={
                order.tracking && trackingUrl(order.tracking.carrier, order.tracking.number) ? (
                  <a href={trackingUrl(order.tracking.carrier, order.tracking.number)!} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 font-semibold text-navy">
                    Track package <ArrowUpRight aria-hidden className="size-3.5" />
                  </a>
                ) : undefined
              }
            >
              {order.tracking ? <CopyValue value={order.tracking.number} label="tracking number" /> : <Missing />}
            </Row>
            <Row label="Item subtotal">{ch.subtotal != null ? money(ch.subtotal) : itemsSubtotal != null ? money(itemsSubtotal) : <Missing />}</Row>
            <Row label="Shipping">{ch.shipping != null ? (ch.shipping === 0 ? "Free" : money(ch.shipping)) : <Missing />}</Row>
            <Row label="Tax">{ch.tax != null ? money(ch.tax) : <Missing />}</Row>
            <Row label="Discounts">{ch.discount != null ? money(ch.discount) : <Missing>None recorded</Missing>}</Row>
            <Row label="Order total">{ch.total != null ? money(ch.total) : <Missing />}</Row>
            <Row label="Return label">
              {artifact && r ? (
                <Link href={`/returns/kit/?id=${r.id}`} className="font-semibold underline-offset-4 hover:underline">
                  {artifact.kind === "qr_code" ? "Show QR code" : "View label"}
                </Link>
              ) : (
                <Missing>{v.activeReturn ? "Not issued yet" : "None"}</Missing>
              )}
            </Row>
          </Rows>
          {!order.deliveredAt && (
            <Button variant="secondary" size="md" className="mt-2 w-full" onClick={() => setDateSheet(true)}>
              Add Delivery Date
            </Button>
          )}
        </Disclosure>

        <Disclosure title="Source emails & receipt" summary={evidence.length ? `${evidence.length} saved` : "None saved"} icon={<Mail aria-hidden className="size-5" />}>
          {evidence.length === 0 ? (
            <p className="mb-2 text-[15px] text-muted">No emails or receipts are attached to this order.</p>
          ) : (
            <ul className="space-y-2">
              {evidence.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => setReceipt(e)} className="flex w-full items-center gap-3 rounded-2xl bg-ivory px-3 py-2.5 text-left hover:bg-ivory-deep">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{e.kind === "order_confirmation" ? "Receipt · " : ""}{e.title}</span>
                      <span className="block text-[13px] text-muted">
                        {evidenceLabel[e.kind]} · {formatDate(e.receivedAt.slice(0, 10), today)}
                        {e.connectionId ? ` · ${data.connections.find((c) => c.id === e.connectionId)?.label ?? "Inbox"}` : ""}
                        {e.verification === "extracted" ? " · Read from your receipt, not checked" : e.verification === "verified" ? " · Checked by you" : ""}
                        {e.channel === "sample_inbox" ? " · Sample" : ""}
                      </span>
                    </span>
                    <ChevronRight aria-hidden className="size-4 text-muted" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="mt-3 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line px-3 text-[15px] font-semibold hover:border-navy/30">
            <Camera aria-hidden className="size-5" /> Add a Receipt
            <input type="file" accept="image/*,application/pdf" capture="environment" className="sr-only" onChange={(e) => onReceipt(e.target.files?.[0])} />
          </label>
          <p className="mt-1.5 text-[13px] text-muted">Scan a paper receipt or upload a PDF. It&apos;s stored with this purchase.</p>
        </Disclosure>

        <Disclosure title="Return policy" summary={policy?.windowDays ? `${policy.windowDays} days from ${policy.windowStartsAt}` : "Not on file"} icon={<ScrollText aria-hidden className="size-5" />}>
          <PolicySection policy={policy} retailerName={retailer.name} today={today} inStore={inStore} newer={newerPolicy} />
          {retailer.returnsUrl && (
            <ExternalButton href={retailer.returnsUrl} variant="secondary" size="md" className="mt-3 w-full">
              Open {retailer.name} Returns
            </ExternalButton>
          )}
        </Disclosure>

        <Disclosure title={`What Penny can do with ${retailer.name}`} summary={caps.approvedReturnSubmission === "no" ? "Guided returns. You finish on their site" : "Connected"} icon={<PlugZap aria-hidden className="size-5" />}>
          <CapabilityList caps={caps} retailerName={retailer.name} />
        </Disclosure>
      </Card>

      <div className="mt-6 flex justify-center">
        <Button variant="ghost" size="sm" className="text-muted" icon={<Trash aria-hidden className="size-4" />} onClick={() => setDeleteSheet(true)}>
          Delete this purchase
        </Button>
      </div>

      <Sheet open={receipt != null} onOpenChange={(x) => !x && setReceipt(null)} title={receipt?.title ?? ""} description={receipt ? `${evidenceLabel[receipt.kind]} from ${receipt.from ?? "unknown sender"}` : undefined}>
        {receipt && (
          <div className="space-y-3">
            {receipt.attachment?.type.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={receipt.attachment.dataUrl} alt={receipt.title} className="w-full rounded-2xl border border-line" />
            ) : receipt.attachment ? (
              <p className="rounded-2xl bg-card p-4 text-[15px]">PDF saved: {receipt.attachment.name}</p>
            ) : (
              <p className="rounded-2xl bg-card p-4 text-[15px] leading-relaxed">{receipt.excerpt ?? "No preview saved."}</p>
            )}
            <p className="text-[13px] text-muted">
              Received {formatDate(receipt.receivedAt.slice(0, 10), today)}. {receipt.channel === "sample_inbox" ? "This is a fictional sample email." : "The full message is stored privately."}
            </p>
          </div>
        )}
      </Sheet>

      <Sheet
        open={trackSheet}
        onOpenChange={setTrackSheet}
        title="Return tracking number"
        description="It's on your drop-off receipt. Scanning the barcode comes with the mobile app; for now, type it in."
        footer={
          <Button
            disabled={trackNo.trim().length < 8 || !shipment}
            onClick={() => {
              actions.setReturnTracking(shipment!.id, trackNo);
              setTrackNo("");
              setTrackSheet(false);
            }}
          >
            Save Tracking Number
          </Button>
        }
      >
        <Field label="Tracking number" htmlFor="rt-no" hint="UPS numbers start with 1Z. USPS numbers are usually 22 digits.">
          <Input id="rt-no" autoComplete="off" spellCheck={false} value={trackNo} onChange={(e) => setTrackNo(e.target.value)} />
        </Field>
      </Sheet>

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
        description="This removes the order, its returns, refund tracking and saved emails from Penny. It doesn't affect anything at the retailer."
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
