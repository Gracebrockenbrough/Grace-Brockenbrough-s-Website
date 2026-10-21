"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, ClipboardList, FileUp, Forward, Mail, MessageSquareText, PencilLine } from "lucide-react";
import Link from "next/link";
import { BackBar, Shell } from "@/components/layout/shell";
import { CopyRow } from "@/components/orbit/copy";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Row, Rows } from "@/components/ui/card";
import { CheckRow, Field, Input, Textarea } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import type { Confidence } from "@/lib/domain/types";
import { FORWARDING_ADDRESS_DEMO } from "@/lib/ingestion/connectors";
import { categoryLabel, processMessage } from "@/lib/ingestion/pipeline";
import { receiptToMessage, sharedKind } from "@/lib/ingestion/receipts";
import { downscaleImage, readSmallFile } from "@/lib/hooks/downscale";
import { sampleMessages } from "@/lib/ingestion/samples";
import type { Extracted, Extraction, RawMessage } from "@/lib/ingestion/types";
import { actions, useOrbit, type ImportResult } from "@/lib/store/store";

type Mode = "paste" | "text" | "upload" | "manual" | "forward";

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
    { mode: "paste", icon: Mail, title: "Paste an email", body: "An order, shipping, return or refund email" },
    { mode: "text", icon: MessageSquareText, title: "Paste a receipt or text message", body: "From a store, a text message, or a PDF" },
    { mode: "upload", icon: FileUp, title: "Upload a photo, screenshot or PDF", body: "Keep the receipt with the purchase" },
    { mode: "manual", icon: PencilLine, title: "Enter it yourself", body: "Online or in-store. Just the basics" },
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
        Tote can&apos;t read your text messages on its own. Share the ones you want to keep. <Link href="/settings/#email" className="font-semibold text-navy underline-offset-4 hover:underline">Connected accounts</Link>
      </p>
    </>
  );
}

function PasteFlow({ initialText, shared = false }: { initialText?: string; shared?: boolean }) {
  const o = useOrbit()!;
  const samples = sampleMessages(o.today);
  const [text, setText] = useState(initialText ?? "");
  const [msg, setMsg] = useState<RawMessage | null>(null);
  const [x, setX] = useState<Extraction | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [inStore, setInStore] = useState(false);
  const [checked, setChecked] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [skip, setSkip] = useState<string | null>(null);

  // Preview only: runs the same pipeline the save will, without recording anything.
  const read = (m: RawMessage) => {
    const d = processMessage(m, { retailers: o.data.retailers, jobs: [], aiUsage: [], now: new Date().toISOString() });
    setMsg(m);
    setX(d.extraction);
    setCategory(categoryLabel[d.category]);
    setSkip(d.extraction ? null : d.job.reason);
    setResult(null);
  };

  if (result) {
    const copy = {
      added: { title: "Purchase added", body: "We'll keep an eye on the return window." },
      merged: { title: "Matched to an existing order", body: "We added the new details to the order you already had. No duplicate was created." },
      duplicate_message: { title: "Already imported", body: "This is already in Tote, so nothing changed." },
      unrecognized: { title: "We couldn't read this", body: "It doesn't look like an order, shipping, return or refund message. You can enter the details yourself." },
      skipped: { title: "Not imported", body: result.job?.reason ?? "This message isn't something Tote imports." },
      needs_review: { title: "Saved for a quick check", body: result.job?.reason ?? "Some details need you before we can save this." },
    }[result.status];
    return (
      <section className="animate-in space-y-5 pt-2">
        <Notice tone={result.status === "added" || result.status === "merged" ? "success" : "warning"} title={copy.title}>
          {copy.body}
        </Notice>
        {result.orderId ? (
          <ButtonLink href={`/returns/purchase/?id=${result.orderId}`}>View Purchase</ButtonLink>
        ) : result.status === "needs_review" ? (
          <ButtonLink href="/settings/history/">Review It</ButtonLink>
        ) : (
          <ButtonLink href="/add/?mode=manual">Enter Manually</ButtonLink>
        )}
        <Button variant="ghost" size="md" className="w-full" onClick={() => { setText(""); setX(null); setResult(null); }}>
          Add Another
        </Button>
      </section>
    );
  }

  if (msg && !x) {
    return (
      <section className="animate-in space-y-5 pt-2">
        <Notice tone="warning" title="This doesn't look like a purchase">
          {skip ?? "We couldn't find order, shipping, return or refund details."} Nothing was saved.
        </Notice>
        <ButtonLink href="/add/?mode=manual">Enter Manually</ButtonLink>
        <Button variant="ghost" size="md" className="w-full" onClick={() => setMsg(null)}>
          Edit Text
        </Button>
      </section>
    );
  }

  if (x && msg) {
    const total = x.items.reduce((s, i) => s + (i.value.unitPrice ?? 0) * i.value.quantity, 0);
    return (
      <section className="animate-in space-y-5 pt-2">
        <div>
          <Tag>{category}</Tag>
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
        {shared && (
          <Card className="divide-y divide-line px-4">
            <CheckRow checked={inStore} onChange={setInStore}>
              Bought in a store
            </CheckRow>
            <CheckRow checked={checked} onChange={setChecked}>
              I checked these details against the receipt
            </CheckRow>
          </Card>
        )}
        <Button
          onClick={() => {
            const r = actions.importMessage({ ...msg, inStore });
            if (shared && checked && r.status !== "duplicate_message") actions.markEvidenceVerified(`ev-${msg.id}`);
            setResult(r);
          }}
        >
          Save to Tote
        </Button>
        <Button variant="ghost" size="md" className="w-full" onClick={() => setX(null)}>
          Edit Text
        </Button>
      </section>
    );
  }

  return (
    <section className="animate-in space-y-5 pt-2">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{shared ? "Paste a receipt or text" : "Paste an email"}</h1>
        <p className="mt-1 text-[16px] text-muted">
          {shared ? "A store receipt, a text message from a store, or text copied from a PDF." : "Order confirmations, shipping updates, return labels and refund emails all work."}
        </p>
      </div>
      <Field label={shared ? "Receipt or message text" : "Email text"} htmlFor="email" hint="Treated as data only. Instructions inside it are never followed.">
        <Textarea
          id="email"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={shared ? "SEPHORA\n10/18/2026\nHYDRATING SERUM   72.00\nTAX   6.39\nTOTAL   78.39" : "From: orders@store.com\nSubject: Thanks for your order\n\nOrder #12345 …"}
        />
      </Field>
      {!shared && <div>
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
      </div>}
      <Button
        disabled={text.trim().length < 20}
        onClick={() => {
          if (shared) {
            read(receiptToMessage(text, { id: hashId(text), inStore, retailers: o.data.retailers, receivedAt: new Date().toISOString() }));
            return;
          }
          const from = text.match(/^from:\s*(.+)$/im)?.[1] ?? null;
          const subject = text.match(/^subject:\s*(.+)$/im)?.[1] ?? null;
          read({ id: hashId(text), channel: "email_upload", from, subject, receivedAt: new Date().toISOString(), body: text });
        }}
      >
        {shared ? (text.trim() && sharedKind(text) === "sms" ? "Read Message" : "Read Receipt") : "Read Email"}
      </Button>
    </section>
  );
}

type Attachment = { name: string; type: string; dataUrl: string };

function UploadFlow() {
  const [fileText, setFileText] = useState<string | null>(null);
  const [file, setFile] = useState<Attachment | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (fileText != null) return <PasteFlow initialText={fileText} />;
  if (file) return <ManualFlow attachment={file} />;

  return (
    <section className="animate-in space-y-5 pt-2">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Upload a receipt</h1>
        <p className="mt-1 text-[16px] text-muted">Email files are read right away. Photos, screenshots and PDFs are kept with the purchase while you add the basics.</p>
      </div>
      <label className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-[18px] border-2 border-dashed border-line bg-card px-6 text-center hover:border-navy/30">
        <FileUp aria-hidden className="size-7 text-muted" />
        <span className="mt-2 text-[16px] font-semibold">Choose a file</span>
        <span className="text-[14px] text-muted">.eml, .txt, .pdf, .png or .jpg</span>
        <input
          type="file"
          accept=".eml,.txt,.pdf,image/*,message/rfc822,text/plain,application/pdf"
          className="sr-only"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setError(null);
            if (/\.(eml|txt)$/i.test(f.name) || f.type.startsWith("text/") || f.type === "message/rfc822") return setFileText(await f.text());
            try {
              const dataUrl = f.type.startsWith("image/") ? await downscaleImage(f, 1200) : await readSmallFile(f);
              setFile({ name: f.name, type: f.type.startsWith("image/") ? "image/jpeg" : f.type, dataUrl });
            } catch {
              setError("That file is too large to keep in this preview (900 KB max for PDFs).");
            }
          }}
        />
      </label>
      {error && <Notice tone="warning">{error}</Notice>}
      <Notice tone="info" title="Reading images and PDFs comes next">
        Text recognition isn&apos;t switched on yet, so we won&apos;t pretend to read the file. If you can copy the text out of a PDF, <Link href="/add/?mode=text" className="font-semibold underline-offset-4 hover:underline">paste it instead</Link> and Tote reads it.
      </Notice>
    </section>
  );
}

function ManualFlow({ attachment = null }: { attachment?: Attachment | null }) {
  const o = useOrbit()!;
  const router = useRouter();
  const [f, setF] = useState({ retailer: "", item: "", price: "", orderNumber: "", purchased: "", delivered: "" });
  const [inStore, setInStore] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const valid = f.retailer.trim() && f.item.trim();
  return (
    <section className="animate-in space-y-5 pt-2">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.02em]">{attachment ? "Add the basics" : "Enter a purchase"}</h1>
        <p className="mt-1 text-[16px] text-muted">Only the store and item are required. Leave anything you don&apos;t know blank.</p>
      </div>
      {attachment && (
        <Card className="flex items-center gap-3 p-3">
          {attachment.type.startsWith("image/") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.dataUrl} alt="Your receipt" className="size-16 rounded-xl object-cover" />
          ) : (
            <span className="flex size-16 items-center justify-center rounded-xl bg-ivory-deep text-[13px] font-semibold">PDF</span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{attachment.name}</span>
            <span className="block text-[14px] text-muted">Kept with this purchase. Only you can see it.</span>
          </span>
        </Card>
      )}
      <Card className="px-4">
        <CheckRow checked={inStore} onChange={setInStore}>
          Bought in a store
        </CheckRow>
      </Card>
      {inStore && <p className="-mt-2 px-1 text-[14px] text-muted">In-store returns can follow different rules from online orders. We&apos;ll show them separately.</p>}
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
        <Field label={inStore ? "Receipt number" : "Order number"} htmlFor="m-o">
          <Input id="m-o" value={f.orderNumber} onChange={set("orderNumber")} autoComplete="off" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={inStore ? "Bought" : "Ordered"} htmlFor="m-d1">
          <Input id="m-d1" type="date" max={o.today} value={f.purchased} onChange={set("purchased")} />
        </Field>
        {!inStore && (
          <Field label="Delivered" htmlFor="m-d2">
            <Input id="m-d2" type="date" max={o.today} value={f.delivered} onChange={set("delivered")} />
          </Field>
        )}
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
            deliveredAt: inStore ? null : f.delivered || null,
            inStore,
            attachment,
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
      {mode === "paste" ? <PasteFlow /> : mode === "text" ? <PasteFlow shared /> : mode === "upload" ? <UploadFlow /> : mode === "manual" ? <ManualFlow /> : mode === "forward" ? <ForwardInfo /> : <Chooser />}
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
