"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Camera, LayoutGrid, Lock, Plus, Trash } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { Photo } from "@/components/orbit/art";
import { visibilityLabel } from "@/components/orbit/circle";
import { ItemArt, KIND_COLOR } from "@/components/orbit/item-art";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field, Input, Select } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import type { Visibility } from "@/lib/domain/types";
import { downscaleImage } from "@/lib/hooks/downscale";
import { itemKind, type ItemKind } from "@/lib/intelligence/buckets";
import { retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

function CollectionView() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const o = useOrbit();
  const [add, setAdd] = useState(false);
  const [f, setF] = useState({ name: "", url: "", store: "", image: null as string | null });
  if (!o) return <Shell loading nav={false} />;
  const c = (o.data.collections ?? []).find((x) => x.id === id);
  if (!c)
    return (
      <Shell nav={false}>
        <BackBar fallback="/circle/" />
        <EmptyState icon={<LayoutGrid aria-hidden />} title="Collection not found" action={<ButtonLink href="/circle/">Back to Circle</ButtonLink>} />
      </Shell>
    );

  const cycle: Record<Visibility, Visibility> = { private: "friends", friends: "public", public: "private" };
  const validUrl = !f.url || /^https?:\/\/\S+\.\S+/.test(f.url);

  return (
    <Shell nav={false}>
      <BackBar fallback="/circle/" title="Collection" />
      <header className="pb-4 pt-2">
        <h1 className="font-display text-[34px] leading-none">{c.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px] text-muted">
          <span>{c.items.length} {c.items.length === 1 ? "item" : "items"}</span>·
          <button type="button" onClick={() => actions.setCollection(c.id, { visibility: cycle[c.visibility] })} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-card px-3 font-semibold text-navy shadow-[var(--shadow-card)]">
            {c.visibility === "private" && <Lock aria-hidden className="size-3.5" />}
            {visibilityLabel[c.visibility]} · change
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setAdd(true)} className="flex aspect-[4/5] flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-line text-muted hover:border-navy/30">
          <Plus aria-hidden className="size-6" />
          <span className="mt-1 text-[14px] font-semibold">Add an item</span>
        </button>
        {c.items.map((it) => {
          const kind = (it.kind ?? "other") as ItemKind;
          return (
            <figure key={it.id} className="group relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[20px]" style={{ background: KIND_COLOR[kind].tint }}>
                {it.image ? <Photo src={it.image} alt={it.name} className="size-full" /> : <ItemArt kind={kind} className="absolute left-[18%] top-[18%] size-[64%]" />}
                <button type="button" aria-label={`Remove ${it.name}`} onClick={() => actions.removeCollectionItem(c.id, it.id)} className="absolute right-1.5 top-1.5 inline-flex size-9 items-center justify-center rounded-full bg-white/90 text-muted">
                  <Trash aria-hidden className="size-4" />
                </button>
              </div>
              <figcaption className="mt-1.5 px-1">
                <span className="block truncate text-[14px] font-semibold">{it.name}</span>
                <span className="flex items-center gap-1 text-[12px] text-muted">
                  {it.retailerId ? retailerOf(o.data, it.retailerId).name : "Any store"}
                  {it.url && (
                    <a href={it.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center font-semibold text-navy">
                      · Link <ArrowUpRight aria-hidden className="size-3" />
                    </a>
                  )}
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <Button variant="ghost" size="sm" className="mx-auto mt-8 flex text-muted" icon={<Trash aria-hidden className="size-4" />} onClick={() => { actions.deleteCollection(c.id); router.replace("/circle/"); }}>
        Delete collection
      </Button>

      <Sheet
        open={add}
        onOpenChange={setAdd}
        title="Add to collection"
        footer={
          <Button
            disabled={f.name.trim().length < 2 || !validUrl}
            onClick={() => {
              const retailerId = f.store ? f.store : null;
              actions.addCollectionItem(c.id, { name: f.name.trim(), kind: itemKind({ name: f.name, category: "clothing" }), image: f.image, url: f.url.trim() || null, retailerId });
              toast("Added", `${f.name.trim()} is in ${c.title}.`);
              setF({ name: "", url: "", store: "", image: null });
              setAdd(false);
            }}
          >
            Add Item
          </Button>
        }
      >
        <div className="space-y-3">
          <label className={cn("flex h-32 cursor-pointer items-center justify-center overflow-hidden rounded-[18px] border-2 border-dashed border-line bg-card", f.image && "border-solid")}>
            {f.image ? (
              <Photo src={f.image} alt="Your photo" className="h-full w-full" />
            ) : (
              <span className="flex flex-col items-center text-muted">
                <Camera aria-hidden className="size-6" />
                <span className="mt-1 text-[14px] font-semibold">Add a photo (optional)</span>
              </span>
            )}
            <input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const file = e.target.files?.[0]; if (file) setF({ ...f, image: await downscaleImage(file, 640) }); }} />
          </label>
          <Field label="What is it?" htmlFor="ci-name">
            <Input id="ci-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="e.g. Linen wide-leg pants" />
          </Field>
          <Field label="Store (optional)" htmlFor="ci-store">
            <Select id="ci-store" value={f.store} onChange={(e) => setF({ ...f, store: e.target.value })}>
              <option value="">Any store</option>
              {o.data.retailers.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Link (optional)" htmlFor="ci-url" hint={!validUrl ? "Use a full link starting with https://" : undefined}>
            <Input id="ci-url" type="url" inputMode="url" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} placeholder="https://" />
          </Field>
        </div>
      </Sheet>
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading nav={false} />}>
      <CollectionView />
    </Suspense>
  );
}
