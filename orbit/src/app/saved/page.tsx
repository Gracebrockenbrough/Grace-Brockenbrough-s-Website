"use client";

import { useState } from "react";
import { ArrowUpRight, Bookmark, Plus, Trash } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { ProductThumb } from "@/components/orbit/retail";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { money } from "@/lib/domain/format";
import { creditAt, retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

const validUrl = (s: string) => {
  try {
    const u = new URL(s.trim());
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
};

export default function SavedPage() {
  const o = useOrbit();
  const [adding, setAdding] = useState(false);
  const [f, setF] = useState({ name: "", retailer: "", url: "", image: "", note: "" });
  if (!o) return <Shell loading nav={false} />;
  const { data, today } = o;

  const valid = f.name.trim() && f.retailer.trim() && validUrl(f.url) && (!f.image.trim() || validUrl(f.image));
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Shell nav={false}>
      <BackBar
        fallback="/settings/"
        title="Saved for Later"
        action={
          <IconButton label="Save an item" onClick={() => setAdding(true)}>
            <Plus aria-hidden className="size-[22px]" />
          </IconButton>
        }
      />
      <p className="pb-4 pt-1 text-[16px] text-muted">Your private list. Orbit never adds anything to it.</p>

      {data.saved.length === 0 ? (
        <EmptyState icon={<Bookmark aria-hidden />} title="Nothing saved yet" action={<Button onClick={() => setAdding(true)}>Save an Item</Button>}>
          Keep track of things you&apos;re thinking about, with a link back to the store.
        </EmptyState>
      ) : (
        <ul className="space-y-2.5">
          {data.saved.map((s) => {
            const r = retailerOf(data, s.retailerId);
            const credit = creditAt(data, s.retailerId, today);
            return (
              <li key={s.id}>
                <Card className="flex items-center gap-3 p-3">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl">
                    {s.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.imageUrl} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
                    ) : (
                      <ProductThumb category="other" tone={r.tone} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-semibold text-muted">{r.name}</span>
                      <span className="flex items-center gap-1 text-[16px] font-semibold">
                        <span className="truncate">{s.name}</span>
                        <ArrowUpRight aria-hidden className="size-4 shrink-0 text-muted" />
                        <span className="sr-only">(opens {r.name} in a new tab)</span>
                      </span>
                      {s.note && <span className="block truncate text-[14px] text-muted">{s.note}</span>}
                      {credit > 0 && <span className="mt-0.5 block text-[13px] font-medium text-sage-ink">You have {money(credit)} in recorded {r.name} credit.</span>}
                    </span>
                  </a>
                  <IconButton label={`Remove ${s.name}`} onClick={() => actions.removeSaved(s.id)} className="text-muted">
                    <Trash aria-hidden className="size-4" />
                  </IconButton>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Sheet
        open={adding}
        onOpenChange={setAdding}
        title="Save for later"
        description="Paste the product link from the store's website."
        footer={
          <Button
            disabled={!valid}
            onClick={() => {
              actions.addSaved({ name: f.name, retailerName: f.retailer, url: f.url, imageUrl: f.image.trim() || null, note: f.note.trim() || null });
              setF({ name: "", retailer: "", url: "", image: "", note: "" });
              setAdding(false);
            }}
          >
            Save Item
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Product" htmlFor="sv-name">
            <Input id="sv-name" value={f.name} onChange={set("name")} autoComplete="off" />
          </Field>
          <Field label="Store" htmlFor="sv-store">
            <Input id="sv-store" list="sv-retailers" value={f.retailer} onChange={set("retailer")} autoComplete="off" />
            <datalist id="sv-retailers">
              {data.retailers.map((r) => (
                <option key={r.id} value={r.name} />
              ))}
            </datalist>
          </Field>
          <Field label="Link" htmlFor="sv-url" hint={f.url && !validUrl(f.url) ? "Enter a full link starting with https://" : undefined}>
            <Input id="sv-url" type="url" inputMode="url" placeholder="https://" value={f.url} onChange={set("url")} />
          </Field>
          <Field label="Image link (optional)" htmlFor="sv-img">
            <Input id="sv-img" type="url" inputMode="url" placeholder="https://" value={f.image} onChange={set("image")} />
          </Field>
          <Field label="Note (optional)" htmlFor="sv-note">
            <Textarea id="sv-note" className="min-h-20" maxLength={140} value={f.note} onChange={set("note")} />
          </Field>
        </div>
      </Sheet>
    </Shell>
  );
}
