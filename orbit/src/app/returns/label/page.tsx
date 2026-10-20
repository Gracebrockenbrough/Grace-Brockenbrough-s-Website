"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, MapPin, Printer, ScanQrCode, Sun } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { QrCode } from "@/components/orbit/qr";
import { ReturnFactsList } from "@/components/orbit/return-facts";
import { Button, ButtonLink, ExternalButton } from "@/components/ui/button";
import { Card, Row, Rows } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Notice, Tag } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { daysBetween, formatDate } from "@/lib/domain/dates";
import { dropOffLabel } from "@/lib/domain/format";
import { returnFacts } from "@/lib/intelligence/returns";
import { policyOf, retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

/** Illustrative nearby locations. Production uses the carrier's location API with the customer's permission. */
const EXAMPLE_LOCATIONS = [
  { name: "UPS Access Point · Corner Market", distance: "0.3 mi", hours: "Open until 9 PM" },
  { name: "The UPS Store · Main Street", distance: "0.8 mi", hours: "Open until 7 PM" },
  { name: "UPS Customer Center", distance: "2.4 mi", hours: "Open until 8 PM" },
];

function LabelView() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const o = useOrbit();
  const [confirmDrop, setConfirmDrop] = useState(false);
  if (!o) return <Shell loading nav={false} />;

  const request = o.data.returns.find((r) => r.id === id);
  const order = request && o.data.orders.find((x) => x.id === request.orderId);
  if (!request || !order)
    return (
      <Shell nav={false}>
        <BackBar fallback="/returns/" />
        <EmptyState icon={<ScanQrCode aria-hidden />} title="Label not found" action={<ButtonLink href="/returns/">Back to Purchases</ButtonLink>} />
      </Shell>
    );

  const retailer = retailerOf(o.data, order.retailerId);
  const policy = policyOf(o.data, order.retailerId);
  const artifact = request.artifacts.find((a) => a.kind === "qr_code") ?? request.artifacts[0];
  const items = order.items.filter((i) => request.itemIds.includes(i.id));
  const left = request.shipBy ? daysBetween(o.today, request.shipBy) : null;
  const carrier = artifact?.carrier ?? (request.dropOff ? dropOffLabel[request.dropOff] : "the carrier");
  const refund = o.data.refunds.find((f) => f.returnId === request.id);
  const facts = returnFacts(policy, { dropOff: request.dropOff, refund: request.refundPreference });
  const shipped = request.status === "shipped" || request.status === "received" || request.status === "completed";

  return (
    <Shell nav={false}>
      <BackBar fallback={`/returns/purchase/?id=${order.id}`} title={`${retailer.name} return`} />

      <div className="pb-4 pt-2 text-center">
        <h1 className="text-[24px] font-semibold tracking-[-0.02em]">{items.map((i) => i.name).join(", ")}</h1>
        {request.shipBy && !shipped && (
          <p className={`mt-1 text-[16px] font-medium ${left != null && left <= 2 ? "text-terracotta" : "text-navy"}`}>
            Drop off by {formatDate(request.shipBy, o.today)}
            <span className="font-normal text-muted"> · {left === 0 ? "today" : left === 1 ? "tomorrow" : `${left} days left`}</span>
          </p>
        )}
        {shipped && <p className="mt-1 text-[16px] text-sage-ink">Dropped off. This code has been used.</p>}
      </div>

      {artifact && artifact.kind !== "qr_code" ? (
        <Card className="px-6 py-6 text-center">
          <Printer aria-hidden className="mx-auto size-8 text-muted" />
          <p className="mt-3 text-[17px] font-semibold">Your label is in {retailer.name}&apos;s email</p>
          <p className="mt-1 text-[15px] text-muted">Open the email to print it, then attach it to your package. Orbit saved the email with this return.</p>
        </Card>
      ) : artifact ? (
        <Card className="px-6 py-6 text-center">
          <QrCode value={artifact.code} label={`Return QR code for ${retailer.name}, code ${artifact.code}`} />
          <p className="tabular mt-4 text-[15px] font-semibold tracking-[0.06em]">{artifact.code}</p>
          <p className="mt-1 text-[15px] text-muted">Show this at any {carrier} location. They&apos;ll print the label for you.</p>
          {order.demo && <Tag className="mt-3">Demo code, not a real label</Tag>}
        </Card>
      ) : (
        <Notice tone="warning" title="No label yet">
          {retailer.name} hasn&apos;t sent a label or QR code. Forward their return email to Orbit when it arrives.
        </Notice>
      )}

      {artifact?.kind === "qr_code" && !shipped && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[14px] text-muted">
          <Sun aria-hidden className="size-4" /> Turn up your screen brightness for scanning
        </p>
      )}

      {!shipped && (
        <section aria-labelledby="dropoff" className="mt-7">
          <h2 id="dropoff" className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
            Where to drop it off
          </h2>
          <Card className="divide-y divide-line">
            {EXAMPLE_LOCATIONS.map((l) => (
              <div key={l.name} className="flex items-center gap-3 px-4 py-3">
                <MapPin aria-hidden className="size-5 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{l.name}</p>
                  <p className="flex items-center gap-1.5 text-[14px] text-muted">
                    {l.distance} · <Clock aria-hidden className="size-3.5" /> {l.hours}
                  </p>
                </div>
              </div>
            ))}
            <p className="px-4 py-2.5 text-[13px] text-muted">Example locations for this demo.</p>
          </Card>
          <ExternalButton href={`https://www.google.com/maps/search/${encodeURIComponent(`${carrier} drop off near me`)}`} variant="secondary" size="md" className="mt-3 w-full">
            Find {carrier} Locations Nearby
          </ExternalButton>
        </section>
      )}

      <Card className="mt-7 overflow-hidden">
        <Disclosure title="What to bring" summary={facts.boxRequired ? "Item packed in a box or mailer" : "Your item and this code"}>
          <ReturnFactsList facts={facts} retailerName={retailer.name} />
        </Disclosure>
        <Disclosure title="Return details" summary={request.rmaNumber ?? order.orderNumber ?? undefined}>
          <Rows>
            <Row label="Order number">{order.orderNumber ?? "Unknown"}</Row>
            {request.rmaNumber && <Row label="Return number">{request.rmaNumber}</Row>}
            <Row label="Label from">{request.submission.confirmedByRetailer ? `${retailer.name} email` : "Not confirmed"}</Row>
            {artifact?.expiresAt && <Row label="Code valid until">{formatDate(artifact.expiresAt, o.today)}</Row>}
          </Rows>
        </Disclosure>
      </Card>

      {!shipped ? (
        <Button variant="secondary" className="mt-6" onClick={() => setConfirmDrop(true)}>
          I&apos;ve Dropped It Off
        </Button>
      ) : (
        refund && (
          <ButtonLink href={`/returns/refund/?id=${refund.id}`} className="mt-6">
            Track Refund
          </ButtonLink>
        )
      )}

      <Sheet
        open={confirmDrop}
        onOpenChange={setConfirmDrop}
        title="Dropped off?"
        description={`We'll start watching for ${retailer.name} to receive it and issue your refund. Keep your drop-off receipt until the refund arrives.`}
        footer={
          <Button
            onClick={() => {
              actions.markShipped(request.id);
              setConfirmDrop(false);
              if (refund) router.push(`/returns/refund/?id=${refund.id}`);
            }}
          >
            Yes, I Dropped It Off
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
    <Suspense fallback={<Shell loading nav={false} />}>
      <LabelView />
    </Suspense>
  );
}
