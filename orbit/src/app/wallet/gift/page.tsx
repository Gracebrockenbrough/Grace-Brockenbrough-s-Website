"use client";

import { useState } from "react";
import { Gift } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { CopyRow } from "@/components/orbit/copy";
import { RetailerMark } from "@/components/orbit/retail";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Row, Rows } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { Steps } from "@/components/ui/steps";
import { money } from "@/lib/domain/format";
import type { GiftTransfer } from "@/lib/domain/types";
import { GIFT_LIMITS, demoGiftProvider } from "@/lib/services/gifts";
import { actions, useOrbit } from "@/lib/store/store";

const STEPS = ["Store", "Amount", "Recipient", "Message", "Review"];

export default function SendGiftPage() {
  const o = useOrbit();
  const [step, setStep] = useState(0);
  const [retailerId, setRetailerId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [gift, setGift] = useState<GiftTransfer | null>(null);
  const [busy, setBusy] = useState(false);
  if (!o) return <Shell loading nav={false} />;

  const partners = o.data.retailers.filter((r) => r.giftPartner);
  const retailer = partners.find((r) => r.id === retailerId);
  const presets = retailerId ? demoGiftProvider.amounts(retailerId) : [];
  const contactOk = /\S+@\S+\.\S+/.test(contact) || /^\+?[\d\s().-]{7,}$/.test(contact);
  const customNum = Number(custom);
  const customOk = custom !== "" && customNum >= GIFT_LIMITS.min && customNum <= GIFT_LIMITS.max;

  const confirm = async () => {
    if (!retailer || !amount) return;
    setBusy(true);
    const g = await demoGiftProvider.purchase(
      { retailerId: retailer.id, amount, senderName: o.profile.firstName, recipientName: name.trim(), recipientContact: contact.trim(), message: message.trim() || null },
      new Date().toISOString(),
    );
    actions.saveGift(g);
    setGift(g);
    setBusy(false);
  };

  if (gift && retailer) {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/gift/claim/?id=${gift.id}`;
    return (
      <Shell nav={false}>
        <BackBar fallback="/wallet/" />
        <section className="animate-in pt-4 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-terracotta-soft text-terracotta">
            <Gift aria-hidden className="size-7" />
          </span>
          <Tag className="mt-5">Demo. No payment was taken</Tag>
          <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.02em]">Your gift is ready</h1>
          <p className="mt-1 text-[16px] text-muted">
            A {money(gift.amount)} {retailer.name} demo gift for {gift.recipientName}. In the full app, we&apos;d deliver it to {gift.recipientContact}.
          </p>
        </section>
        <Card className="mt-6 px-4 pb-2 pt-3 text-left">
          <CopyRow label="Claim link (demo)" value={link} />
        </Card>
        <div className="mt-6 space-y-2">
          <ButtonLink href={`/gift/claim/?id=${gift.id}`}>See What {gift.recipientName.split(" ")[0]} Sees</ButtonLink>
          <ButtonLink href="/wallet/" variant="ghost" size="md" className="w-full">
            Done
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  const next = () => setStep((s) => s + 1);

  return (
    <Shell nav={false}>
      <BackBar
        fallback="/wallet/"
        title="Send a Gift"
        action={step > 0 ? <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>Previous</Button> : undefined}
      />
      <div className="pb-5 pt-2">
        <Steps steps={STEPS} current={step} />
      </div>

      {step === 0 && (
        <section className="animate-in">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Choose a store</h1>
          <p className="mt-1 text-[16px] text-muted">Participating stores for this demo.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {partners.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={retailerId === r.id}
                onClick={() => {
                  setRetailerId(r.id);
                  setAmount(null);
                  next();
                }}
                className={cn("flex min-h-24 flex-col items-start justify-between rounded-[18px] border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-colors hover:border-navy/30", retailerId === r.id ? "border-navy" : "border-line")}
              >
                <RetailerMark retailer={r} />
                <span className="mt-3 text-[16px] font-semibold">{r.name}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === 1 && retailer && (
        <section className="animate-in">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">How much?</h1>
          <p className="mt-1 text-[16px] text-muted">A {retailer.name} digital gift card.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            {presets.map((a) => (
              <button
                key={a}
                type="button"
                aria-pressed={amount === a && !custom}
                onClick={() => {
                  setAmount(a);
                  setCustom("");
                }}
                className={cn("tabular h-16 rounded-[18px] border text-[20px] font-semibold transition-colors", amount === a && !custom ? "border-navy bg-navy text-white" : "border-line bg-card hover:border-navy/30")}
              >
                {money(a)}
              </button>
            ))}
          </div>
          <Field label="Or enter an amount" htmlFor="custom" hint={`${money(GIFT_LIMITS.min)} to ${money(GIFT_LIMITS.max)}`}>
            <Input
              id="custom"
              inputMode="decimal"
              placeholder="$"
              className="mt-1"
              value={custom}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, "");
                setCustom(v);
                setAmount(v ? Number(v) : null);
              }}
            />
          </Field>
          <Button className="mt-6" disabled={!amount || (custom !== "" && !customOk)} onClick={next}>
            Continue
          </Button>
        </section>
      )}

      {step === 2 && (
        <section className="animate-in space-y-5">
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Who&apos;s it for?</h1>
            <p className="mt-1 text-[16px] text-muted">We&apos;ll send them a link to open their gift.</p>
          </div>
          <Field label="Their name" htmlFor="name">
            <Input id="name" autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email or phone" htmlFor="contact" hint="Use a made-up address in this demo.">
            <Input id="contact" autoComplete="off" inputMode="email" value={contact} onChange={(e) => setContact(e.target.value)} />
          </Field>
          <Button disabled={!name.trim() || !contactOk} onClick={next}>
            Continue
          </Button>
        </section>
      )}

      {step === 3 && (
        <section className="animate-in space-y-5">
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Add a message</h1>
            <p className="mt-1 text-[16px] text-muted">Optional. Keep it short and sweet.</p>
          </div>
          <Field label="Message" htmlFor="msg" hint={`${200 - message.length} characters left`}>
            <Textarea id="msg" maxLength={200} className="min-h-32" placeholder="Happy birthday! Treat yourself." value={message} onChange={(e) => setMessage(e.target.value)} />
          </Field>
          <Button onClick={next}>{message.trim() ? "Continue" : "Skip"}</Button>
        </section>
      )}

      {step === 4 && retailer && amount && (
        <section className="animate-in space-y-5">
          <div>
            <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Review your gift</h1>
          </div>
          <Card className="px-4">
            <Rows>
              <Row label="Gift card">{retailer.name}</Row>
              <Row label="Amount">{money(amount)}</Row>
              <Row label="To">
                {name}
                <span className="block text-[13px] font-normal text-muted">{contact}</span>
              </Row>
              {message.trim() && <Row label="Message">“{message.trim()}”</Row>}
              <Row label="Payment" hint="Demo mode. No card is charged">None</Row>
            </Rows>
          </Card>
          <Notice tone="demo">
            This creates a fictional gift card for demonstration. Real gift cards will be issued by an authorized gift card partner.
          </Notice>
          <Button disabled={busy} onClick={confirm}>
            Confirm Demo Gift · {money(amount)}
          </Button>
        </section>
      )}
    </Shell>
  );
}
