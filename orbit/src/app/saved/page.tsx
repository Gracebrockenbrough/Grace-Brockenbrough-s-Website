"use client";

import { useRef, useState } from "react";
import { ArrowUpRight, Bookmark, Camera, Check, Link2, Mic, Trash, Type } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { ItemArt, KIND_COLOR } from "@/components/orbit/item-art";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Disclosure } from "@/components/ui/disclosure";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { addDays, formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import type { WishItem } from "@/lib/domain/types";
import { downscaleImage } from "@/lib/hooks/downscale";
import { itemKind } from "@/lib/intelligence/buckets";
import { activeWishes, parseProductLink, parseWishText } from "@/lib/intelligence/saved";
import { creditAt, retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

type Mode = WishItem["source"];

type Recognition = { lang: string; interimResults: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };

function AddWish({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const o = useOrbit()!;
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [store, setStore] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [keepFor, setKeepFor] = useState("0");
  const [listening, setListening] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);

  const parsed = parseWishText(text);
  const fromLink = mode === "link" && url ? parseProductLink(url, o.data.retailers) : null;
  const validUrl = (() => {
    try {
      return ["http:", "https:"].includes(new URL(url).protocol);
    } catch {
      return false;
    }
  })();
  const raw = text.trim() || fromLink?.name || "";
  const name = raw ? raw[0].toUpperCase() + raw.slice(1) : "";
  const valid = name.length >= 2 && (mode !== "link" || validUrl);

  const listen = () => {
    const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) {
      setNote("Voice isn't available in this browser. Type it instead.");
      return;
    }
    const r = new Ctor();
    rec.current = r;
    r.lang = "en-US";
    r.interimResults = true;
    r.onresult = (e) => setText(Array.from(e.results, (x) => x[0].transcript).join(" "));
    r.onend = () => setListening(false);
    r.onerror = () => {
      setListening(false);
      setNote("We couldn't hear that. Check microphone access, or type instead.");
    };
    setNote(null);
    setListening(true);
    try {
      r.start();
    } catch {
      setListening(false);
      setNote("Voice isn't available here. Type it instead.");
    }
  };

  const save = () => {
    const retailerId = store ? actions.ensureRetailer(store) : fromLink?.retailerId ?? null;
    actions.addWish({
      kind: mode === "link" || (store && !/\b(a|an|some|any)\b/i.test(name)) ? "product" : "interest",
      text: name,
      retailerId,
      url: mode === "link" ? url.trim() : null,
      image,
      color: parsed.color,
      maxPrice: parsed.maxPrice,
      occasion: parsed.occasion,
      tags: parsed.tags,
      source: mode,
      until: keepFor !== "0" ? addDays(o.today, Number(keepFor)) : null,
    });
    onClose();
  };

  const titles: Record<Mode, string> = { text: "Describe it", photo: "Add a photo", voice: "Say it", link: "Paste a link" };

  return (
    <Sheet
      open
      onOpenChange={(v) => !v && onClose()}
      title={titles[mode]}
      description="Exact products or broad ideas both work, like “a blue dress for a wedding under $150”."
      footer={
        <Button disabled={!valid} onClick={save}>
          Save for Later
        </Button>
      }
    >
      <div className="space-y-4">
        {mode === "link" && (
          <Field label="Product link" htmlFor="wl-url" hint={url && !validUrl ? "Paste a full link starting with https://" : fromLink?.retailerId ? `From ${retailerOf(o.data, fromLink.retailerId).name}` : undefined}>
            <Input id="wl-url" type="url" inputMode="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
        )}
        {mode === "photo" && (
          <div>
            <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[18px] border-2 border-dashed border-line bg-card text-center hover:border-navy/30">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="Your photo" className="max-h-48 object-contain" />
              ) : (
                <>
                  <Camera aria-hidden className="size-7 text-muted" />
                  <span className="mt-2 font-semibold">Take or choose a photo</span>
                  <span className="text-[14px] text-muted">A screenshot or picture of the product</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) setImage(await downscaleImage(f));
                }}
              />
            </label>
            <p className="mt-2 text-[13px] text-muted">Add a few words so you can find it again with Ask.</p>
          </div>
        )}
        <Field label={mode === "link" ? "Name (optional)" : "What are you looking for?"} htmlFor="wl-text">
          {mode === "voice" ? (
            <div className="flex gap-2">
              <Textarea id="wl-text" className="min-h-24" value={text} onChange={(e) => setText(e.target.value)} placeholder="Tap the mic and describe it" />
              <button
                type="button"
                onClick={() => (listening ? rec.current?.stop() : listen())}
                aria-label={listening ? "Stop listening" : "Start voice input"}
                aria-pressed={listening}
                className={cn("flex size-12 shrink-0 items-center justify-center rounded-full text-white", listening ? "animate-pulse bg-terracotta" : "bg-navy")}
              >
                <Mic aria-hidden className="size-5" />
              </button>
            </div>
          ) : (
            <Input id="wl-text" value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === "link" ? fromLink?.name ?? "" : "e.g. white sneakers"} autoComplete="off" />
          )}
        </Field>
        {note && <p role="status" className="text-[14px] text-muted">{note}</p>}
        {(parsed.color || parsed.maxPrice || parsed.occasion) && (
          <div className="flex flex-wrap gap-1.5 text-[13px] font-semibold">
            {parsed.color && <span className="rounded-full bg-ivory-deep px-2.5 py-1">{parsed.color}</span>}
            {parsed.maxPrice && <span className="rounded-full bg-ivory-deep px-2.5 py-1">Under {money(parsed.maxPrice)}</span>}
            {parsed.occasion && <span className="rounded-full bg-ivory-deep px-2.5 py-1">For a {parsed.occasion.toLowerCase()}</span>}
          </div>
        )}
        <Field label="Store (optional)" htmlFor="wl-store">
          <Input id="wl-store" list="wl-stores" value={store} onChange={(e) => setStore(e.target.value)} autoComplete="off" />
          <datalist id="wl-stores">
            {o.data.retailers.map((r) => (
              <option key={r.id} value={r.name} />
            ))}
          </datalist>
        </Field>
        <Field label="Keep it for" htmlFor="wl-keep" hint="Temporary interests drop off on their own.">
          <Select id="wl-keep" value={keepFor} onChange={(e) => setKeepFor(e.target.value)}>
            <option value="0">Until I remove it</option>
            <option value="14">2 weeks</option>
            <option value="30">1 month</option>
            <option value="90">3 months</option>
          </Select>
        </Field>
      </div>
    </Sheet>
  );
}

function WishCard({ w }: { w: WishItem }) {
  const o = useOrbit()!;
  const kind = itemKind({ name: `${w.text} ${w.tags.join(" ")}`, category: w.tags.includes("serum") ? "beauty" : w.tags.some((t) => ["sneakers", "sneaker", "boots", "boot", "shoes", "heels"].includes(t)) ? "shoes" : "clothing" });
  const retailer = w.retailerId ? retailerOf(o.data, w.retailerId) : null;
  const credit = w.retailerId ? creditAt(o.data, w.retailerId, o.today) : 0;
  return (
    <Card as="article" className="p-3.5">
      <div className="flex items-start gap-3">
        {w.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={w.image} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span aria-hidden className="flex size-16 shrink-0 items-center justify-center rounded-2xl" style={{ background: KIND_COLOR[kind].tint }}>
            <ItemArt kind={kind} className="size-11" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {retailer && <p className="text-[13px] font-semibold text-muted">{retailer.name}</p>}
          <h3 className="text-[16px] font-semibold leading-snug">{w.text}</h3>
          <p className="mt-0.5 flex flex-wrap gap-x-2 text-[13px] text-muted">
            {w.color && <span>{w.color}</span>}
            {w.maxPrice && <span>Under {money(w.maxPrice)}</span>}
            {w.occasion && <span>{w.occasion}</span>}
            {w.until && <span>Until {formatDate(w.until, o.today)}</span>}
            <span>Added by {w.source === "voice" ? "voice" : w.source === "photo" ? "photo" : w.source === "link" ? "link" : "text"}</span>
          </p>
        </div>
      </div>
      {credit > 0 && <p className="mt-3 text-[13px] font-medium text-sage-ink">You have {money(credit)} in recorded {retailer?.name} credit.</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-line/70 pt-1">
        {w.url && (
          <a href={w.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[14px] font-semibold text-navy hover:bg-ivory-deep">
            Open link <ArrowUpRight aria-hidden className="size-4" />
          </a>
        )}
        <span className="flex-1" />
        <button type="button" onClick={() => actions.setWishStatus(w.id, "purchased")} className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[14px] font-semibold text-navy hover:bg-ivory-deep">
          <Check aria-hidden className="size-4" /> Bought it
        </button>
        <button type="button" aria-label={`Remove ${w.text}`} onClick={() => actions.removeWish(w.id)} className="inline-flex size-11 items-center justify-center rounded-full text-muted hover:bg-ivory-deep">
          <Trash aria-hidden className="size-4" />
        </button>
      </div>
    </Card>
  );
}

export default function SavedPage() {
  const o = useOrbit();
  const [mode, setMode] = useState<Mode | null>(null);
  if (!o) return <Shell loading />;
  const active = activeWishes(o.data, o.today);
  const done = o.data.wishlist.filter((w) => w.status === "purchased");
  const expired = o.data.wishlist.filter((w) => w.status === "active" && w.until && w.until < o.today);

  const methods: { id: Mode; label: string; icon: React.ReactNode }[] = [
    { id: "text", label: "Describe", icon: <Type aria-hidden className="size-5" /> },
    { id: "photo", label: "Photo", icon: <Camera aria-hidden className="size-5" /> },
    { id: "voice", label: "Voice", icon: <Mic aria-hidden className="size-5" /> },
    { id: "link", label: "Link", icon: <Link2 aria-hidden className="size-5" /> },
  ];

  return (
    <Shell>
      <BackBar fallback="/settings/" title="Saved for Later" />
      <p className="pb-1 pt-1 text-[16px] text-muted">Products and ideas you want to remember. Only you can see them.</p>

      <div className="mt-4 grid grid-cols-4 gap-2" role="group" aria-label="Save something for later">
        {methods.map((m) => (
          <button key={m.id} type="button" onClick={() => setMode(m.id)} className="flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-[18px] border border-line bg-card text-[13px] font-semibold shadow-[var(--shadow-card)] hover:bg-ivory-deep">
            {m.icon}
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {active.length === 0 ? (
          <EmptyState icon={<Bookmark aria-hidden />} title="Nothing saved yet">
            Save a product link, a photo or a note so you don&apos;t lose it.
          </EmptyState>
        ) : (
          active.map((w) => <WishCard key={w.id} w={w} />)
        )}
      </div>

      {(done.length > 0 || expired.length > 0) && (
        <Card className="mt-6 overflow-hidden">
          <Disclosure title="Bought or expired" summary={`${done.length + expired.length} items`}>
            <ul className="divide-y divide-line">
              {[...done, ...expired].map((w) => (
                <li key={w.id} className="flex min-h-12 items-center gap-2 py-2">
                  <span className="flex-1 text-[15px]">
                    {w.text} <span className="text-muted">· {w.status === "purchased" ? "Bought" : "Expired"}</span>
                  </span>
                  <button type="button" onClick={() => actions.setWishStatus(w.id, "active")} className="min-h-11 rounded-full px-3 text-[14px] font-semibold text-navy hover:bg-ivory-deep">
                    Restore
                  </button>
                </li>
              ))}
            </ul>
          </Disclosure>
        </Card>
      )}

      <Notice tone="info" className="mt-6">
        Saved items are private. Tote never uses them for advertising or shares them.
      </Notice>

      {mode && <AddWish mode={mode} onClose={() => setMode(null)} />}
    </Shell>
  );
}
