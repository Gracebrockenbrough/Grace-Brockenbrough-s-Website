"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Banknote, CircleCheck } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { Button, ButtonLink, ExternalButton } from "@/components/ui/button";
import { Card, Row, Rows } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { daysBetween, formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import { retailerOf, returnStatusText } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";
import { cn } from "@/components/ui/cn";

function RefundView() {
  const id = useSearchParams().get("id");
  const o = useOrbit();
  const [sheet, setSheet] = useState(false);
  const [amount, setAmount] = useState("");
  if (!o) return <Shell loading nav={false} />;

  const refund = o.data.refunds.find((f) => f.id === id);
  const order = refund && o.data.orders.find((x) => x.id === refund.orderId);
  if (!refund || !order)
    return (
      <Shell nav={false}>
        <BackBar fallback="/returns/" />
        <EmptyState icon={<Banknote aria-hidden />} title="Refund not found" action={<ButtonLink href="/returns/">Back to Purchases</ButtonLink>} />
      </Shell>
    );

  const { today } = o;
  const retailer = retailerOf(o.data, order.retailerId);
  const request = o.data.returns.find((r) => r.id === refund.returnId);
  const late = refund.expected?.by && !refund.confirmed ? daysBetween(refund.expected.by, today) : 0;
  const received = request && (request.status === "received" || request.status === "completed");
  const credit = refund.destination === "store_credit";

  // Timeline: confirmed milestones, then what we're still waiting for.
  const steps = [
    ...refund.milestones.map((m) => ({ label: m.label, date: m.at.slice(0, 10), done: true, evidence: m.evidenceId != null })),
    ...(!received && !refund.confirmed ? [{ label: `Received by ${retailer.name}`, date: null, done: false, evidence: false }] : []),
    ...(!refund.confirmed
      ? [{ label: credit ? "Store credit issued" : "Refund issued", date: refund.expected?.by ?? null, done: false, evidence: false }]
      : []),
  ];

  return (
    <Shell nav={false}>
      <BackBar fallback={`/returns/purchase/?id=${order.id}`} title={`${retailer.name} ${credit ? "credit" : "refund"}`} />

      <div className="pb-5 pt-3">
        {refund.confirmed ? (
          <Tag tone="success">
            <CircleCheck aria-hidden className="size-3.5" />
            {refund.confirmed.by === "retailer_email" ? `Confirmed by ${retailer.name}` : "Confirmed by you"}
          </Tag>
        ) : late > 0 ? (
          <Tag tone="urgent">{late === 1 ? "1 day" : `${late} days`} later than expected</Tag>
        ) : (
          <Tag>Expected · not received</Tag>
        )}
        <p className="tabular mt-3 text-[44px] font-semibold leading-none tracking-[-0.03em]">
          {money(refund.confirmed?.amount ?? refund.expected?.amount ?? null)}
        </p>
        <p className="mt-2 text-[16px] text-muted">
          {refund.confirmed
            ? `${credit ? "Issued as store credit" : `Refunded to ${refund.destinationLabel ?? "your original payment"}`} on ${formatDate(refund.confirmed.at, today)}`
            : refund.expected?.by
              ? `Expected by ${formatDate(refund.expected.by, today)} to ${refund.destinationLabel ?? "your original payment"}`
              : refund.expected?.basis ?? "Expected once the retailer processes your return"}
        </p>
      </div>

      {late > 0 && (
        <Notice tone="warning" className="mb-5" title="This refund is late">
          {received ? `${retailer.name} received your return, but we haven't seen a refund confirmation.` : `We haven't seen a refund confirmation from ${retailer.name}.`} Banks can take a few business days to show refunds, so check your statement first.
        </Notice>
      )}

      <Card className="p-4">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Progress</h2>
        <ol>
          {steps.map((s, i) => (
            <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
              {i < steps.length - 1 && <span aria-hidden className={cn("absolute left-[9px] top-6 h-[calc(100%-18px)] w-0.5", s.done ? "bg-navy" : "bg-line")} />}
              <span aria-hidden className={cn("mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2", s.done ? "border-navy bg-navy" : "border-line bg-card")} />
              <span>
                <span className={cn("block text-[16px] font-medium", !s.done && "text-muted")}>{s.label}</span>
                <span className="block text-[14px] text-muted">
                  {s.done ? (s.date ? formatDate(s.date, today) : "") + (s.evidence ? " · from email" : "") : s.date ? `Expected by ${formatDate(s.date, today)}` : "Waiting"}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="mt-5 px-4">
        <Rows>
          <Row label="Expected" hint={refund.expected?.basis}>
            {refund.expected ? `${money(refund.expected.amount)}${refund.expected.by ? ` by ${formatDate(refund.expected.by, today)}` : ""}` : "Unknown"}
          </Row>
          <Row label="Confirmed">{refund.confirmed ? `${money(refund.confirmed.amount)} on ${formatDate(refund.confirmed.at, today)}` : "Not yet"}</Row>
          <Row label="Refund to">{refund.destinationLabel ?? "Unknown"}</Row>
          {request && <Row label="Return status">{returnStatusText(request)}</Row>}
        </Rows>
      </Card>

      {!refund.confirmed && (
        <div className="mt-6 space-y-2">
          {late > 0 && retailer.supportUrl && <ExternalButton href={retailer.supportUrl}>Contact {retailer.name}</ExternalButton>}
          <Button variant="secondary" onClick={() => { setAmount(String(refund.expected?.amount ?? "")); setSheet(true); }}>
            I&apos;ve Received It
          </Button>
        </div>
      )}

      <Sheet
        open={sheet}
        onOpenChange={setSheet}
        title="Confirm your refund"
        description="Check the amount on your statement. We'll mark this refund as confirmed by you."
        footer={
          <Button
            disabled={!(Number(amount) > 0)}
            onClick={() => {
              actions.confirmRefundByCustomer(refund.id, Number(amount));
              setSheet(false);
            }}
          >
            Confirm {Number(amount) > 0 ? money(Number(amount)) : "Refund"}
          </Button>
        }
      >
        <Field label="Amount received" htmlFor="amt" hint={refund.expected?.amount ? `Expected ${money(refund.expected.amount)}` : undefined}>
          <Input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
        </Field>
      </Sheet>
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading nav={false} />}>
      <RefundView />
    </Suspense>
  );
}
