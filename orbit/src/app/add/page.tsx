"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ClipboardList, FileUp, Forward, Mail, PencilLine } from "lucide-react";
import Link from "next/link";
import { BackBar, Shell } from "@/components/layout/shell";
import { CopyRow } from "@/components/orbit/copy";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Row, Rows } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import type { Confidence } from "@/lib/domain/types";
import { FORWARDING_ADDRESS_DEMO } from "@/lib/ingestion/connectors";
import { parseMessage } from "@/lib/ingestion/parse";
import { sampleMessages } from "@/lib/ingestion/samples";
import type { Extracted, Extraction, RawMessage } from "@/lib/ingestion/types";
import { actions, useOrbit, type ImportResult } from "@/lib/store/store";

type Mode = "paste" | "upload" | "manual" | "forward";

const kindLabel: Record<Extraction["kind"], string> = {
  order_confirmation: "Order confirmation",
  shipping_notice: "Shipping notice",
  delivery_update: "Delivery update",
  return_confirmation: "Return confirmation",
  return_label: "Return label",
  refund_confirmation: "Refund confirmation",
  gift_card_email: "Gift card email",
  receipt_upload: "Receipt",
  manual_entry: "Manual entry",
  retailer_integration: "Retailer update",
  unknown: "Unrecognized email",
};

function hashId(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return `paste-${(h >>> 0).toString(36)}`;
}

function ConfidenceTag({ c }: { c: Confidence }) {
  if (c === "high") return null;
  return <Tag tone="warning" className="ml-1.5 align-middle">{c === "medium" ? "Check this" : "Unsure"}</Tag>;
}

function Value<T>({ x, render }: { x: Extracted<T> | null; render?: (v: T) => string }) {
  if (!x) return <span className="font-normal text-muted">Not found</span>;
  return (
    <>
      {render ? render(x.value) : String(x.value)}
      <ConfidenceTag c={x.confidence} />
    </>
  );
}

function Chooser() {
  const options = [
    { mode: "forward", icon: Forward, title: "Forward an email", body: "Send confirmations to your Tote address" },
    { mode: "paste", icon: Mail, title: "Paste an email", body: "Copy the text of an order or return email" },
    { mode: "upload", icon: FileUp, title: "Upload a receipt", body: "An email file, PDF or screenshot" },
    { mode: "manual", icon: PencilLine, title: "Enter it yourself", body: "Just the basics: store, item, date" },
  ] as const;
  return (
    <>
      <h1 className="pb-1 pt-2 text-[28px] font-semibold tracking-[-0.02em]">Add a purchase</h1>
      <p className="pb-5 text-[16px] text-muted">Tote reads the details and tracks the return window for you.</p>
      <Card className="divide-y divide-line">
        {options.map(({ mode, icon: Icon, title, body }) => (
          <Link key={mode} href={`/add/?mode=${mode}`} className="flex min-h-[72px] items-center gap-4 px-4 py-3 hover:bg-ivory-deep">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ivory-deep">
              <Icon aria-hidden className="size-5" />
            </span>
            <span className="flex-1">
              <span className="block text-[16px] font-semibold">{title}</span>
              <span className="block text-[14px] text-muted">{body}</span>
            </span>
            <ChevronRight aria-hidden className="size-5 text-muted/60" />
          </Link>
        ))}
      </Card>
      <p className="mt-5 text-center text-[14px] text-muted">
        Connecting Gmail or Outlook is coming. <Link href="/settings/#email" className="font-semibold text-navy underline-offset-4 hover:underline">Learn more</Link>
      </p>
    </>
  );
}

function PasteFlow({ initialText }: { initialText?: string }) {
  const o = useOrbit()!;
  const samples = sampleMessages(o.today);
  const [text, setText] = useState(initialText ?? "");
  const [msg, setMsg] = useState<RawMessage | null>(null);
  const [x, setX] = useState<Extraction | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const read = (m: RawMessage) => {
    setMsg(m);
    setX(parseMessage(m, o.data.retailers));
    setResult(null);
  };

  if (result) {
    const copy = {
      added: { title: "Purchase added", body: "We'll keep an eye on the return window." },
      merged: { title: "Matched to an existing order", body: "We added the new details to the order you already had. No duplicate was created." },
      duplicate_message: { title: "Already imported", body: "This email is already in Tote, so nothing changed." },
      unrecognized: { title: "We couldn't read this email", body: "It doesn't look like an order, shipping, return or refund email. You can enter the details yourself." },
    }[result.status];
    return (
      <section className="animate-in space-y-5 pt-2">
        <Notice tone={result.status === "unrecognized" ? "warning" : "success"} title={copy.title}>
          {copy.body}
        </Notice>
        {result.orderId ? (
          <ButtonLink href={`/returns/purchase/?id=${result.orderId}`}>View Purchase</ButtonLink>
        ) : (
          <ButtonLink href="/add/?mode=manual">Enter Manually</ButtonLink>
        )}
        <Button variant="ghost" size="md" className="w-full" onClick={() => { setText(""); setX(null); setResult(null); }}>
          Add Another
        </Button>
      </section>
    );
  }

  if (x && msg) {
    const total = x.items.reduce((s, i) => s + (i.value.unitPrice ?? 0) * i.value.quantity, 0);
    return (
      <section className="animate-in space-y-5 pt-2">
        <div>
          <Tag>{kindLabel[x.kind]}</Tag>
          <h1 className="mt-3 text-[26px] font-semibold tracking-[-0.02em]">Does this look right?</h1>
          <p className="mt-1 text-[16px] text-muted">Here&apos;s what we found. Anything marked “Check this” was read with less certainty.</p>
        </div>
        <Card className="px-4">
          <Rows>
            <Row label="Retailer"><Value x={x.retailer} render={(v) => v.name} /></Row>
            <Row label="Order number"><Value x={x.orderNumber} /></Row>
            {(x.purchasedAt || x.kind === "order_confirmation") && <Row label="Ordered"><Value x={x.purchasedAt} render={(d) => formatDate(d, o.today)} /></Row>}
            {x.shippedAt && <Row label="Shipped"><Value x={x.shippedAt} render={(d) => formatDate(d, o.today)} /></Row>}
            {x.deliveredAt && <Row label="Delivered"><Value x={x.deliveredAt} render={(d) => formatDate(d, o.today)} /></Row>}
            {x.tracking && <Row label="Tracking"><Value x={x.tracking} render={(t) => `${t.carrier ?? ""} ${t.number}`.trim()} /></Row>}
            {x.statedReturnDeadline && <Row label="Return by"><Value x={x.statedReturnDeadline} render={(d) => formatDate(d, o.today)} /></Row>}
            {x.refundAmount && <Row label="Refund"><Value x={x.refundAmount} render={(n) => money(n)} /></Row>}
          </Rows>
        </Card>
        {x.items.length > 0 && (
          <Card className="px-4">
            <Rows>
              {x.items.map((i, n) => (
                <Row key={n} label={`${i.value.name}${i.value.quantity > 1 ? ` × ${i.value.quantity}` : ""}`}>
                  {money(i.value.unitPrice)}
                  <ConfidenceTag c={i.confidence} />
                </Row>
              ))}
              {x.total && Math.abs(x.total.value - total) > 0.01 && (
                <Row label="Order total" hint="Doesn't match the items. Check the email">{money(x.total.value)}</Row>
              )}
            </Rows>
          </Card>
        )}
        {x.missing.length > 0 && (
          <Notice tone="warning" title={`Couldn't find: ${x.missing.join(", ")}`}>
            You can add {x.missing.length === 1 ? "it" : "them"} later on the purchase page. We won&apos;t guess.
          </Notice>
        )}
        <Button onClick={() => setResult(actions.importMessage(msg))}>Save to Tote</Button>
        <Button variant="ghost" size="md" className="w-full" onClick={() => setX(null)}>
          Edit Text
        </Button>
      </section>
    );
  }

  return (
    <section className="animate-in space-y-5 pt-2">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Paste an email</h1>
        <p className="mt-1 text-[16px] text-muted">Order confirmations, shipping updates, return labels and refund emails all work.</p>
      </div>
      <Field label="Email text" htmlFor="email" hint="Treated as data only. Instructions inside an email are never followed.">
        <Textarea id="email" value={text} onChange={(e) => setText(e.target.value)} placeholder={"From: orders@store.com\nSubject: Thanks for your order\n\nOrder #12345 …"} />
      </Field>
      <div>
        <p className="mb-2 text-[14px] font-semibold text-muted">Or try a sample email</p>
        <div className="space-y-2">
          {samples.map((s) => (
            <button key={s.id} type="button" onClick={() => read(s)} className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-line bg-card px-4 py-2.5 text-left hover:bg-ivory-deep">
              <ClipboardList aria-hidden className="size-5 shrink-0 text-muted" />
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">{s.label}</span>
                <span className="block text-[13px] text-muted">{s.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <Button
        disabled={text.trim().length < 20}
        onClick={() => {
          const from = text.match(/^from:\s*(.+)$/im)?.[1] ?? null;
          const subject = text.match(/^subject:\s*(.+)$/im)?.[1] ?? null;
          read({ id: hashId(text), channel: "email_upload", from, subject, receivedAt: new Date().toISOString(), body: text });
        }}
      >
        Read Email
      </Button>
    </section>
  );
}

function UploadFlow() {
  const [fileText, setFileText] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string | null>(null);

  if (fileText != null) return <PasteFlow initialText={fileText} />;

  return (
    <section className="animate-in space-y-5 pt-2">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Upload a receipt</h1>
        <p className="mt-1 text-[16px] text-muted">Email files (.eml, .txt) are read right away.</p>
      </div>
      <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-line bg-card px-6 text-center hover:border-navy/30">
        <FileUp aria-hidden className="size-7 text-muted" />
        <span className="mt-2 text-[16px] font-semibold">Choose a file</span>
        <span className="text-[14px] text-muted">.eml, .txt, .pdf, .png or .jpg</span>
        <input
          type="file"
          accept=".eml,.txt,.pdf,image/*,message/rfc822,text/plain"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            if (/\.(eml|txt)$/i.test(f.name) || f.type.startsWith("text/") || f.type === "message/rfc822") setFileText(await f.text());
            else setImageName(f.name);
          }}
        />
      </label>
      {imageName && (
        <Notice
          tone="warning"
          title="We can't read screenshots or PDFs yet"
          action={<ButtonLink href="/add/?mode=manual" size="md" className="w-full">Enter Details Manually</ButtonLink>}
        >
          Reading “{imageName}” needs text recognition, which isn&apos;t available in this preview. The file wasn&apos;t uploaded anywhere.
        </Notice>
      )}
    </section>
  );
}

function ManualFlow() {
  const o = useOrbit()!;
  const router = useRouter();
  const [f, setF] = useState({ retailer: "", item: "", price: "", orderNumber: "", purchased: "", delivered: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const valid = f.retailer.trim() && f.item.trim();
  return (
    <section className="animate-in space-y-5 pt-2">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Enter a purchase</h1>
        <p className="mt-1 text-[16px] text-muted">Only the store and item are required. Leave anything you don&apos;t know blank.</p>
      </div>
      <Field label="Store" htmlFor="m-r">
        <Input id="m-r" list="retailers" value={f.retailer} onChange={set("retailer")} autoComplete="off" />
        <datalist id="retailers">
          {o.data.retailers.map((r) => (
            <option key={r.id} value={r.name} />
          ))}
        </datalist>
      </Field>
      <Field label="Item" htmlFor="m-i">
        <Input id="m-i" value={f.item} onChange={set("item")} autoComplete="off" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price" htmlFor="m-p">
          <Input id="m-p" inputMode="decimal" placeholder="$" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value.replace(/[^0-9.]/g, "") })} />
        </Field>
        <Field label="Order number" htmlFor="m-o">
          <Input id="m-o" value={f.orderNumber} onChange={set("orderNumber")} autoComplete="off" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Ordered" htmlFor="m-d1">
          <Input id="m-d1" type="date" max={o.today} value={f.purchased} onChange={set("purchased")} />
        </Field>
        <Field label="Delivered" htmlFor="m-d2">
          <Input id="m-d2" type="date" max={o.today} value={f.delivered} onChange={set("delivered")} />
        </Field>
      </div>
      <Button
        disabled={!valid}
        onClick={() => {
          const id = actions.addManualOrder({
            retailerName: f.retailer,
            itemName: f.item.trim(),
            price: f.price ? Number(f.price) : null,
            orderNumber: f.orderNumber.trim() || null,
            purchasedAt: f.purchased || null,
            deliveredAt: f.delivered || null,
          });
          router.replace(`/returns/purchase/?id=${id}`);
        }}
      >
        Save Purchase
      </Button>
    </section>
  );
}

function ForwardInfo() {
  return (
    <section className="animate-in space-y-5 pt-2">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Forward your emails</h1>
        <p className="mt-1 text-[16px] text-muted">Forward order, shipping, return and refund emails to your private Tote address.</p>
      </div>
      <Card className="px-4 pb-2 pt-3">
        <CopyRow label="Your Tote address" value={FORWARDING_ADDRESS_DEMO} />
      </Card>
      <Notice tone="demo" title="Not receiving mail yet">
        This is a placeholder address. Inbound email isn&apos;t live in this preview, so paste the email text instead.
      </Notice>
      <ButtonLink href="/add/?mode=paste" variant="secondary">Paste an Email</ButtonLink>
    </section>
  );
}

function AddPage() {
  const mode = useSearchParams().get("mode") as Mode | null;
  const o = useOrbit();
  if (!o) return <Shell loading nav={false} />;
  return (
    <Shell nav={false}>
      <BackBar fallback={mode ? "/add/" : "/returns/"} title={mode ? "Add a purchase" : undefined} />
      {mode === "paste" ? <PasteFlow /> : mode === "upload" ? <UploadFlow /> : mode === "manual" ? <ManualFlow /> : mode === "forward" ? <ForwardInfo /> : <Chooser />}
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading nav={false} />}>
      <AddPage />
    </Suspense>
  );
}
