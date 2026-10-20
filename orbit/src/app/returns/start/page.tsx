"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleDashed, Hourglass, Mail, PackageOpen } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { CopyRow } from "@/components/orbit/copy";
import { DeadlineLine } from "@/components/orbit/deadline";
import { ProductThumb } from "@/components/orbit/retail";
import { ReturnFactsList } from "@/components/orbit/return-facts";
import { Button, ButtonLink, ExternalButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckRow, Choice, Field, Select } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { EmptyState } from "@/components/ui/states";
import { Steps } from "@/components/ui/steps";
import { formatDate } from "@/lib/domain/dates";
import { capabilityLabel, dropOffLabel, money, orderTotal, refundMethodLabel } from "@/lib/domain/format";
import type { DropOffKind, RefundMethod, ReturnRequest } from "@/lib/domain/types";
import { returnFacts } from "@/lib/intelligence/returns";
import { adapterFor, prepareDetails, type SubmissionResult } from "@/lib/services/returnSubmission";
import { orderView, returnStatusText, type OrderView } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

const STEPS = ["Choose items", "Return details", "Review & approve", "Next steps"];
const REASONS = ["Too small", "Too large", "Not as pictured", "Changed my mind", "Arrived damaged", "Wrong item sent", "Other"];

function Router() {
  const params = useSearchParams();
  const o = useOrbit();
  if (!o) return <Shell loading nav={false} />;

  const returnId = params.get("return");
  const existing = returnId ? o.data.returns.find((r) => r.id === returnId) : null;
  const orderId = existing?.orderId ?? params.get("order");
  const order = o.data.orders.find((x) => x.id === orderId);

  if (!order || (returnId && !existing))
    return (
      <Shell nav={false}>
        <BackBar fallback="/returns/" />
        <EmptyState icon={<PackageOpen aria-hidden />} title="We couldn't find this return" action={<ButtonLink href="/returns/">Back to Purchases</ButtonLink>} />
      </Shell>
    );

  const view = orderView(o.data, order, o.today);
  if (existing && existing.status !== "prepared") return <ReturnStatus view={view} request={existing} />;
  return <Assistant key={existing?.id ?? order.id} view={view} existing={existing ?? null} preselect={params.get("item")} email={o.profile.email} />;
}

// ─── Assistant (steps 1–4) ─────────────────────────────────────────────

function Assistant({ view, existing, preselect, email }: { view: OrderView; existing: ReturnRequest | null; preselect: string | null; email: string }) {
  const o = useOrbit()!;
  const { order, retailer, policy } = view;
  const returnable = view.items.filter((i) => i.stage === "to_decide");

  const [step, setStep] = useState(existing ? 3 : returnable.length === 1 ? 1 : 0);
  const [selected, setSelected] = useState<string[]>(
    existing?.itemIds ?? (preselect && returnable.some((i) => i.item.id === preselect) ? [preselect] : returnable.length === 1 ? [returnable[0].item.id] : []),
  );
  const [reason, setReason] = useState<string>(existing?.reason ?? "");
  const [refund, setRefund] = useState<RefundMethod | null>(existing?.refundPreference ?? policy?.refundMethods[0] ?? null);
  const [dropOff, setDropOff] = useState<DropOffKind | null>(existing?.dropOff ?? policy?.dropOff[0] ?? null);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [preparedId, setPreparedId] = useState<string | null>(existing?.id ?? null);
  const router = useRouter();

  const facts = returnFacts(policy, { dropOff, refund });
  const cap = retailer.returnCapability;
  const request = preparedId ? o.data.returns.find((r) => r.id === preparedId) ?? null : null;
  const selectedTotal = orderTotal(order, selected);

  // Once the customer reports submission, show the return's status instead of the steps.
  if (request && request.status !== "prepared") return <ReturnStatus view={orderView(o.data, order, o.today)} request={request} />;

  if (returnable.length === 0 && !existing)
    return (
      <Shell nav={false}>
        <BackBar fallback={`/returns/purchase/?id=${order.id}`} />
        <EmptyState icon={<PackageOpen aria-hidden />} title="Nothing left to return" action={<ButtonLink href={`/returns/purchase/?id=${order.id}`}>View Purchase</ButtonLink>}>
          Every item in this order is already being returned, kept, or past its return window.
        </EmptyState>
      </Shell>
    );

  const approve = async () => {
    setBusy(true);
    const id = actions.prepareReturn({ orderId: order.id, itemIds: selected, reason: reason || null, refundPreference: refund, dropOff });
    setPreparedId(id);
    router.replace(`/returns/start/?return=${id}`, { scroll: false });
    const req = { itemIds: selected, reason: reason || null, refundPreference: refund, dropOff };
    const prepared = actions.getReturn(id)!;
    const res = await adapterFor(cap).submit(prepared, prepareDetails(order, req, email), new Date().toISOString());
    // The prototype never receives `submitted: true`; if an integration ever does, the workflow records it from the retailer's confirmation.
    setResult(res);
    setBusy(false);
    setStep(3);
  };

  const back = step > 0 && step < 3 && !(step === 1 && returnable.length === 1);

  return (
    <Shell nav={false}>
      <BackBar
        fallback={`/returns/purchase/?id=${order.id}`}
        title={`${retailer.name} return`}
        action={back ? <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>Previous</Button> : undefined}
      />
      <div className="pb-5 pt-2">
        <Steps steps={STEPS} current={step} />
      </div>

      {step === 0 && (
        <section aria-labelledby="s1" className="animate-in">
          <h1 id="s1" className="text-[26px] font-semibold tracking-[-0.02em]">What are you returning?</h1>
          <p className="mt-1 text-[16px] text-muted">Choose one or more items from this order.</p>
          <Card className="mt-5 divide-y divide-line px-4">
            {view.items.map((a) => {
              const disabled = a.stage !== "to_decide";
              const why = { returning: "Already being returned", completed: "Already returned", kept: "You're keeping this", not_returnable: a.eligibility === "ineligible" ? "Final sale" : "Return window closed", on_the_way: "Not delivered yet", to_decide: "" }[a.stage];
              return (
                <CheckRow
                  key={a.item.id}
                  disabled={disabled}
                  checked={selected.includes(a.item.id)}
                  onChange={(v) => setSelected((s) => (v ? [...s, a.item.id] : s.filter((x) => x !== a.item.id)))}
                >
                  <span className="flex items-center gap-3 py-2">
                    <ProductThumb category={a.item.category} name={a.item.name} tone={retailer.tone} className="size-12 rounded-xl" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{a.item.name}</span>
                      <span className="block text-[14px] text-muted">
                        {money(a.item.unitPrice)}
                        {a.item.variant ? ` · ${a.item.variant}` : ""}
                      </span>
                      {disabled ? <span className="block text-[14px] text-muted">{why}</span> : <DeadlineLine deadline={a.deadline} today={o.today} className="text-[14px]" />}
                    </span>
                  </span>
                </CheckRow>
              );
            })}
          </Card>
          <Button className="mt-6" disabled={selected.length === 0} onClick={() => setStep(1)}>
            Continue{selected.length > 1 ? ` with ${selected.length} items` : ""}
          </Button>
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="s2" className="animate-in space-y-6">
          <div>
            <h1 id="s2" className="text-[26px] font-semibold tracking-[-0.02em]">Return details</h1>
            <p className="mt-1 text-[16px] text-muted">
              {order.items.filter((i) => selected.includes(i.id)).map((i) => i.name).join(", ")} · {money(selectedTotal)}
            </p>
          </div>

          <Field label="Reason (optional)" htmlFor="reason" hint="Some retailers ask for this. It doesn't change your refund.">
            <Select id="reason" value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Choose a reason</option>
              {REASONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>

          {policy && policy.refundMethods.length > 0 && (
            <div className="space-y-2">
              <p className="text-[15px] font-semibold">Refund to</p>
              <Choice
                name="refund"
                value={refund}
                onChange={setRefund}
                options={policy.refundMethods.map((m) => {
                  const fee = returnFacts(policy, { dropOff, refund: m }).fee;
                  return { value: m, label: refundMethodLabel[m], detail: fee == null ? "Fee not confirmed" : fee === 0 ? "No fee" : `${money(fee)} fee` };
                })}
              />
            </div>
          )}

          {policy && policy.dropOff.length > 0 && (
            <div className="space-y-2">
              <p className="text-[15px] font-semibold">Send it back</p>
              <Choice
                name="dropoff"
                value={dropOff}
                onChange={setDropOff}
                options={policy.dropOff.map((d) => ({
                  value: d,
                  label: d === "store" ? `${retailer.name} store` : `${dropOffLabel[d]} drop-off`,
                  detail:
                    d === "store"
                      ? "Bring the item and your order number"
                      : d === "happy_returns"
                        ? "No box or label needed"
                        : policy.shipping.qrCodeAvailable
                          ? "Show a QR code, no printer needed"
                          : "Print a label and pack the item",
                }))}
              />
            </div>
          )}

          {!policy && (
            <Notice tone="warning" title="We don't know this retailer's process yet">
              You can still prepare the return. Check {retailer.name}&apos;s site for refund and drop-off options.
            </Notice>
          )}

          <Button onClick={() => setStep(2)}>Review Return</Button>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="s3" className="animate-in space-y-5">
          <div>
            <h1 id="s3" className="text-[26px] font-semibold tracking-[-0.02em]">Review your return</h1>
            <p className="mt-1 text-[16px] text-muted">Here&apos;s exactly what to expect.</p>
          </div>

          <Card className="p-4">
            <ul className="space-y-2">
              {order.items.filter((i) => selected.includes(i.id)).map((i) => (
                <li key={i.id} className="flex justify-between gap-3">
                  <span className="font-medium">{i.name}</span>
                  <span className="tabular">{money(i.unitPrice)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 border-t border-line pt-1">
              <ReturnFactsList facts={facts} retailerName={retailer.name} />
            </div>
          </Card>

          <Notice tone={cap === "guided" ? "info" : "demo"} title={`${capabilityLabel[cap].name} return`}>
            {cap === "guided" && `Tote can't submit returns to ${retailer.name}. We'll prepare everything so you can finish on their site in a couple of minutes.`}
          </Notice>

          <Button onClick={approve} disabled={busy}>
            {cap === "guided" ? "Approve & Prepare Return" : "Approve Return Request"}
          </Button>
          <p className="text-center text-[14px] text-muted">You can cancel any time before you send the item.</p>
        </section>
      )}

      {step === 3 && request && (
        <NextSteps view={view} request={request} result={result} email={email} />
      )}
    </Shell>
  );
}

function NextSteps({ view, request, result, email }: { view: OrderView; request: ReturnRequest; result: SubmissionResult | null; email: string }) {
  const { order, retailer } = view;
  const [cancelled, setCancelled] = useState(false);
  const items = order.items.filter((i) => request.itemIds.includes(i.id));

  if (cancelled)
    return (
      <EmptyState icon={<CircleDashed aria-hidden />} title="Return cancelled" action={<ButtonLink href={`/returns/purchase/?id=${order.id}`}>Back to Purchase</ButtonLink>}>
        Nothing was sent to {retailer.name}.
      </EmptyState>
    );

  return (
    <section aria-labelledby="s4" className="animate-in space-y-5">
      <div>
        <Tag tone="warning">Not submitted yet</Tag>
        <h1 id="s4" className="mt-3 text-[26px] font-semibold tracking-[-0.02em]">Finish on {retailer.name}&apos;s site</h1>
        <p className="mt-1 text-[16px] text-muted">
          {(result && !result.submitted ? result.message : null) ??
            `Tote prepared everything. Nothing has been sent to ${retailer.name}.`}{" "}
          It takes about two minutes.
        </p>
      </div>

      <ol className="space-y-3">
        <li>
          <Card className="p-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">1 · Open the return page</p>
            {retailer.returnsUrl ? (
              <ExternalButton href={retailer.returnsUrl} className="mt-3">
                Open {retailer.name} Returns
              </ExternalButton>
            ) : (
              <p className="mt-2 text-[15px]">Find the returns page on {retailer.name}&apos;s website.</p>
            )}
          </Card>
        </li>
        <li>
          <Card className="px-4 pb-2 pt-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">2 · Use these details</p>
            <div className="divide-y divide-line">
              {order.orderNumber ? <CopyRow label="Order number" value={order.orderNumber} /> : <p className="py-3 text-[15px] text-sand-ink">Order number not found. Check your order email.</p>}
              <CopyRow label="Email on the order" value={email} />
              <CopyRow label={items.length > 1 ? "Items" : "Item"} value={items.map((i) => i.name + (i.variant ? ` (${i.variant})` : "")).join(", ")} />
              {request.reason && <CopyRow label="Reason" value={request.reason} />}
            </div>
          </Card>
        </li>
        <li>
          <Card className="p-4">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">3 · Then come back</p>
            <p className="mt-2 text-[15px]">
              {retailer.name} will email your {request.dropOff === "store" ? "return confirmation" : "label or QR code"}. Forward it to Tote and it&apos;ll appear here, ready to show at drop-off.
            </p>
          </Card>
        </li>
      </ol>

      <Button
        variant="secondary"
        onClick={() => actions.reportSubmitted(request.id)}
      >
        I&apos;ve Submitted It on {retailer.name}
      </Button>
      <div className="flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted"
          onClick={() => {
            actions.cancelReturn(request.id);
            setCancelled(true);
          }}
        >
          Cancel this return
        </Button>
      </div>
    </section>
  );
}

// ─── Status of a return already underway ───────────────────────────────

function ReturnStatus({ view, request }: { view: OrderView; request: ReturnRequest }) {
  const o = useOrbit()!;
  const { order, retailer } = view;
  const refund = o.data.refunds.find((f) => f.returnId === request.id);
  const items = order.items.filter((i) => request.itemIds.includes(i.id));

  return (
    <Shell nav={false}>
      <BackBar fallback={`/returns/purchase/?id=${order.id}`} title={`${retailer.name} return`} />
      <section className="animate-in space-y-5 pt-2">
        <div>
          {request.submission.confirmedByRetailer ? <Tag tone="success">Confirmed by {retailer.name}</Tag> : <Tag tone="warning">Not confirmed by {retailer.name} yet</Tag>}
          <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.02em]">{returnStatusText(request)}</h1>
          <p className="mt-1 text-[16px] text-muted">
            {items.map((i) => i.name).join(", ")} · {money(orderTotal(order, request.itemIds))}
          </p>
        </div>

        {request.status === "reported_submitted" && (
          <>
            <Notice tone="info" title={`Waiting for ${retailer.name}`}>
              When their confirmation email arrives, forward it to Tote. Your label or QR code will appear here.
            </Notice>
            <ButtonLink href="/add/?mode=paste" icon={<Mail aria-hidden className="size-5" />}>
              Add Confirmation Email
            </ButtonLink>
          </>
        )}
        {request.status === "approval_pending" && (
          <Notice tone="info" title={`${retailer.name} is reviewing your request`}>
            You&apos;ll get a label once it&apos;s approved. Don&apos;t send anything yet.
          </Notice>
        )}
        {request.status === "label_ready" && <ButtonLink href={`/returns/label/?id=${request.id}`}>View QR Code</ButtonLink>}
        {(request.status === "shipped" || request.status === "received" || request.status === "completed") && refund && (
          <ButtonLink href={`/returns/refund/?id=${refund.id}`}>Track Refund</ButtonLink>
        )}

        <Card className="p-4">
          <h2 className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">History</h2>
          <ol className="space-y-3">
            {[...request.history].reverse().map((h, i) => (
              <li key={i} className="flex gap-3">
                <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${i === 0 ? "bg-navy" : "bg-line"}`} />
                <span>
                  <span className="block text-[15px] font-medium">{h.note}</span>
                  <span className="block text-[13px] text-muted">{formatDate(h.at.slice(0, 10), o.today)}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        {request.status === "reported_submitted" && (
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" className="text-muted" icon={<Hourglass aria-hidden className="size-4" />} onClick={() => actions.cancelReturn(request.id)}>
              I didn&apos;t finish it. Cancel return
            </Button>
          </div>
        )}
      </section>
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading nav={false} />}>
      <Router />
    </Suspense>
  );
}
