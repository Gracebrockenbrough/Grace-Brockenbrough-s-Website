"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Banknote, CircleCheck, Mail } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { Button, ButtonLink, ExternalButton } from "@/components/ui/button";
import { Card, Row, Rows } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { CheckRow, Field, Input } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { daysBetween, formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import { retailerOf, returnStatusText } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

/**
 * Orbit never connects to bank accounts. What it can know:
 *   1. the store received the return (store email),
 *   2. the store issued the refund (store's refund email),
 *   3. the money arrived (only if the customer tells us).
 */
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
        <EmptyState icon={<Banknote aria-hidden />} title="Refund not found" action={<ButtonLink href="/returns/">Back to Returns</ButtonLink>} />
      </Shell>
    );

  const { today } = o;
  const retailer = retailerOf(o.data, order.retailerId);
  const request = o.data.returns.find((r) => r.id === refund.returnId);
  const issued = refund.confirmed;
  const arrived = refund.arrivedAt ?? (issued?.by === "customer" ? issued.at : null);
  const late = refund.expected?.by && !issued ? daysBetween(refund.expected.by, today) : 0;
  const received = request && (request.status === "received" || request.status === "completed");
  const credit = refund.destination === "store_credit";
  const dest = refund.destinationLabel ?? "your original payment method";

  const steps = [
    ...refund.milestones.filter((m) => !/arrived/i.test(m.label)).map((m) => ({ label: m.label, sub: formatDate(m.at.slice(0, 10), today) + (m.evidenceId ? " · from the store's email" : ""), done: true })),
    ...(!received && !issued ? [{ label: `${retailer.name} receives it`, sub: "We'll see this in their email", done: false }] : []),
    ...(!issued
      ? [{ label: credit ? "Store credit issued" : "Refund issued", sub: refund.expected?.by ? `Expected by ${formatDate(refund.expected.by, today)} · from the store's email` : "We'll see this in their email", done: false }]
      : []),
    ...(!credit
      ? [{ label: "Arrives in your account", sub: arrived ? `${formatDate(arrived, today)} · you confirmed` : "Banks usually take 3–5 business days. Only you can confirm this.", done: Boolean(arrived) }]
      : []),
  ];

  return (
    <Shell nav={false}>
      <BackBar fallback={`/returns/purchase/?id=${order.id}`} title={`${retailer.name} ${credit ? "credit" : "refund"}`} />

      <div className="pb-5 pt-3">
        {arrived ? (
          <Tag tone="success">
            <CircleCheck aria-hidden className="size-3.5" /> Arrived
          </Tag>
        ) : issued ? (
          <Tag tone="success">
            <CircleCheck aria-hidden className="size-3.5" /> Issued by {retailer.name}
          </Tag>
        ) : late > 0 ? (
          <Tag tone="warning">Refund needs checking · expected {late === 1 ? "1 day" : `${late} days`} ago</Tag>
        ) : (
          <Tag>Waiting for {retailer.name}</Tag>
        )}
        <p className="tabular mt-3 text-[44px] font-semibold leading-none tracking-[-0.03em]">{money(issued?.amount ?? refund.expected?.amount ?? null)}</p>
        <p className="mt-2 text-[16px] text-muted">
          {issued
            ? credit
              ? `Issued as ${retailer.name} store credit on ${formatDate(issued.at, today)}`
              : `${retailer.name} issued it to ${dest} on ${formatDate(issued.at, today)}`
            : refund.expected?.by
              ? `Expected by ${formatDate(refund.expected.by, today)}, to ${dest}`
              : refund.expected?.basis ?? "Expected once the store processes your return"}
        </p>
      </div>

      {late > 0 && (
        <Notice tone="warning" className="mb-5" title="Refund needs checking">
          {received ? `${retailer.name} has your return` : "Your return should have arrived"}, but we haven&apos;t seen a refund email from them. The refund may already be on your statement. If it isn&apos;t, contact them with your order number{order.orderNumber ? ` (${order.orderNumber})` : ""}.
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
                <span className="block text-[14px] text-muted">{s.sub}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <p className="mt-3 flex gap-2 px-1 text-[14px] text-muted">
        <Mail aria-hidden className="mt-0.5 size-4 shrink-0" />
        Orbit doesn&apos;t connect to your bank. We follow the store&apos;s emails, and you can tell us when the money lands.
      </p>

      <Card className="mt-5 px-4">
        <Rows>
          <Row label="Expected" hint={refund.expected?.basis}>
            {refund.expected ? `${money(refund.expected.amount)}${refund.expected.by ? ` by ${formatDate(refund.expected.by, today)}` : ""}` : "Unknown"}
          </Row>
          <Row label="Issued">{issued ? `${money(issued.amount)} · ${issued.by === "retailer_email" ? "store email" : "you confirmed"}` : "Not yet"}</Row>
          <Row label="Refund to">{refund.destinationLabel ?? "Unknown"}</Row>
          {request && <Row label="Return status">{returnStatusText(request)}</Row>}
        </Rows>
      </Card>

      {!arrived && (
        <div className="mt-6 space-y-2">
          {late > 0 && retailer.supportUrl && <ExternalButton href={retailer.supportUrl}>Contact {retailer.name}</ExternalButton>}
          {!issued && (
            <ButtonLink href="/add/?mode=paste" variant={late > 0 ? "secondary" : "primary"}>
              Add the Store&apos;s Refund Email
            </ButtonLink>
          )}
          {!credit && issued ? (
            <div className="rounded-[18px] border border-line bg-card px-4">
              <CheckRow checked={false} onChange={() => actions.markRefundArrived(refund.id, issued.amount)}>
                <span className="block font-semibold">I&apos;ve received this refund</span>
                <span className="block text-[14px] text-muted">
                  Check {dest} for {money(issued.amount)}. It stays pending until you tick this.
                </span>
              </CheckRow>
            </div>
          ) : !credit ? (
            <Button
              variant="ghost"
              size="md"
              className="w-full"
              onClick={() => {
                setAmount(String(refund.expected?.amount ?? ""));
                setSheet(true);
              }}
            >
              It Already Arrived
            </Button>
          ) : null}
        </div>
      )}

      <Sheet
        open={sheet}
        onOpenChange={setSheet}
        title="Did the money arrive?"
        description="Check your bank or card statement. We'll mark this refund as complete."
        footer={
          <Button
            disabled={!(Number(amount) > 0)}
            onClick={() => {
              actions.markRefundArrived(refund.id, Number(amount));
              setSheet(false);
            }}
          >
            Yes, {Number(amount) > 0 ? money(Number(amount)) : "It"} Arrived
          </Button>
        }
      >
        <Field label="Amount on your statement" htmlFor="amt" hint={refund.expected?.amount ? `Expected ${money(refund.expected.amount)}` : undefined}>
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
