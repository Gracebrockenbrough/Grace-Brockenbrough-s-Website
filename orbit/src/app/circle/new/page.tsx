"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, Lock, ShieldCheck, Trash } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { Photo } from "@/components/orbit/art";
import { FeedPost, visibilityLabel } from "@/components/orbit/circle";
import { ItemArt, KIND_COLOR } from "@/components/orbit/item-art";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { CheckRow, Field, Textarea } from "@/components/ui/form";
import { Notice } from "@/components/ui/notice";
import { Steps } from "@/components/ui/steps";
import { toast } from "@/components/ui/toast";
import type { PostImage, PostType, SocialPost, Visibility } from "@/lib/domain/types";
import { downscaleImage } from "@/lib/hooks/downscale";
import { presetSession } from "@/lib/hooks/useSessionState";
import { itemKind } from "@/lib/intelligence/buckets";
import { retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

const TYPES: { v: PostType; label: string; hint: string }[] = [
  { v: "haul", label: "Haul", hint: "Pieces you chose to show off" },
  { v: "styled", label: "Styled it", hint: "An outfit or styling idea" },
  { v: "store_favorite", label: "Store favorite", hint: "Recommend a shop" },
  { v: "review", label: "Honest review", hint: "Sizing, quality or returns" },
  { v: "collection", label: "Collection", hint: "A wishlist or moodboard" },
];

type Picked = { key: string; name: string; kind: string; retailerId: string | null };

/**
 * Create a post in four short steps. Purchases can be used as a starting point, but only
 * items ticked one by one are included, prices and dates never are, and publishing asks
 * for a final confirmation.
 */
export default function NewPostPage() {
  const o = useOrbit();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [type, setType] = useState<PostType | null>(null);
  const [photos, setPhotos] = useState<PostImage[]>([]);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [caption, setCaption] = useState("");
  const [stores, setStores] = useState<string[]>([]);
  const [sizing, setSizing] = useState<SocialPost["notes"]["sizing"]>(null);
  const [ease, setEase] = useState<SocialPost["notes"]["returnEase"]>(null);
  const [audience, setAudience] = useState<Visibility | null>(null);
  const [confirm, setConfirm] = useState(false);
  if (!o) return <Shell loading nav={false} />;

  const purchases = o.data.orders.flatMap((ord) => ord.items.map((i) => ({ key: `${ord.id}:${i.id}`, name: i.name, kind: itemKind(i), retailerId: ord.retailerId })));
  const togglePick = (p: Picked) => setPicked((cur) => (cur.some((x) => x.key === p.key) ? cur.filter((x) => x.key !== p.key) : [...cur, p]));
  const fromPurchases = picked.length > 0;
  const images: PostImage[] = photos.length ? photos : picked.length && type !== "store_favorite" && type !== "review" ? [{ kind: "art", seed: picked.map((p) => p.key).join(), kinds: picked.map((p) => p.kind).slice(0, 3), palette: "apricot", alt: picked.map((p) => p.name).join(", ") }] : [];
  const draft: SocialPost = {
    id: "preview",
    authorId: "me",
    type: type ?? "haul",
    images,
    caption: caption.trim(),
    retailerIds: stores,
    items: picked.map((p) => ({ name: p.name, kind: p.kind, retailerId: p.retailerId })),
    notes: { sizing, quality: null, returnEase: ease },
    audience: audience ?? "private",
    createdAt: new Date().toISOString(),
    likes: 0,
    liked: false,
    saved: false,
    demo: false,
  };
  const canNext = [type != null, type === "store_favorite" ? stores.length > 0 : photos.length > 0 || picked.length > 0 || type === "review", caption.trim().length > 1, audience != null && (!fromPurchases || confirm)][step];

  const chip = (on: boolean) => cn("min-h-11 rounded-full border px-3.5 text-[14px] font-semibold", on ? "border-navy bg-navy text-white" : "border-line bg-card");

  return (
    <Shell nav={false}>
      <BackBar fallback="/circle/" title="New post" />
      <div className="pb-4 pt-1">
        <Steps steps={["Type", "Content", "Details", "Share"]} current={step} />
      </div>

      {step === 0 && (
        <section className="animate-in grid grid-cols-1 gap-2">
          <h1 className="font-display mb-1 text-[28px] leading-none">What are you sharing?</h1>
          {TYPES.map((t) => (
            <button key={t.v} type="button" aria-pressed={type === t.v} onClick={() => setType(t.v)} className={cn("flex min-h-16 items-center justify-between rounded-[18px] border px-4 text-left", type === t.v ? "border-navy bg-navy text-white" : "border-line bg-card")}>
              <span>
                <span className="block font-bold">{t.label}</span>
                <span className={cn("block text-[14px]", type === t.v ? "text-white/70" : "text-muted")}>{t.hint}</span>
              </span>
              {type === t.v && <Check aria-hidden className="size-5" />}
            </button>
          ))}
        </section>
      )}

      {step === 1 && (
        <section className="animate-in space-y-5">
          <h1 className="font-display text-[28px] leading-none">{type === "store_favorite" ? "Which store?" : "Add photos or pieces"}</h1>
          {type === "store_favorite" ? (
            <div className="flex flex-wrap gap-2">
              {o.data.retailers.filter((r) => r.websiteUrl).map((r) => (
                <button key={r.id} type="button" aria-pressed={stores.includes(r.id)} onClick={() => setStores(stores.includes(r.id) ? [] : [r.id])} className={chip(stores.includes(r.id))}>
                  {r.name}
                </button>
              ))}
            </div>
          ) : (
            <>
              <div>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((p, n) => (
                    <div key={n} className="relative aspect-square overflow-hidden rounded-[16px]">
                      {p.kind === "photo" && <Photo src={p.src} alt={p.alt} className="size-full" />}
                      <button type="button" aria-label="Remove photo" onClick={() => setPhotos(photos.filter((_, i) => i !== n))} className="absolute right-1 top-1 inline-flex size-8 items-center justify-center rounded-full bg-white/90">
                        <Trash aria-hidden className="size-4" />
                      </button>
                    </div>
                  ))}
                  {photos.length < 6 && (
                    <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-[16px] border-2 border-dashed border-line bg-card text-muted">
                      <Camera aria-hidden className="size-6" />
                      <span className="mt-1 text-[13px] font-semibold">Add photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="sr-only"
                        onChange={async (e) => {
                          const files = Array.from(e.target.files ?? []).slice(0, 6 - photos.length);
                          const next = await Promise.all(files.map(async (f) => ({ kind: "photo" as const, src: await downscaleImage(f, 900), alt: "Your photo" })));
                          setPhotos([...photos, ...next]);
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="mt-2 text-[13px] text-muted">Up to 6 photos. Swipe through them in the post.</p>
              </div>

              <div>
                <p className="flex items-center gap-1.5 text-[15px] font-semibold">
                  <Lock aria-hidden className="size-4" /> Tag pieces you bought (optional)
                </p>
                <p className="mb-2 text-[13px] text-muted">Your purchases stay private. Only items you tick are added, by name only, never with prices or dates.</p>
                <Card className="max-h-72 divide-y divide-line overflow-y-auto">
                  {purchases.map((p) => {
                    const on = picked.some((x) => x.key === p.key);
                    return (
                      <button key={p.key} type="button" aria-pressed={on} onClick={() => togglePick(p)} className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl" style={{ background: KIND_COLOR[p.kind as keyof typeof KIND_COLOR].tint }}>
                          <ItemArt kind={p.kind as keyof typeof KIND_COLOR} className="size-7" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                          <span className="block text-[13px] text-muted">{retailerOf(o.data, p.retailerId).name}</span>
                        </span>
                        <span className={cn("flex size-6 items-center justify-center rounded-md border-2", on ? "border-navy bg-navy text-white" : "border-line")}>{on && <Check aria-hidden className="size-4" />}</span>
                      </button>
                    );
                  })}
                </Card>
              </div>
            </>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="animate-in space-y-5">
          <h1 className="font-display text-[28px] leading-none">Say a little</h1>
          <Field label="Caption" htmlFor="cap">
            <Textarea id="cap" className="min-h-24" maxLength={280} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder={type === "review" ? "How was the sizing, quality or return?" : "What do you love about it?"} />
          </Field>
          {type !== "store_favorite" && (
            <div>
              <p className="mb-2 text-[15px] font-semibold">Tag stores</p>
              <div className="flex flex-wrap gap-2">
                {[...new Set([...picked.map((p) => p.retailerId).filter(Boolean), ...o.data.retailers.filter((r) => r.websiteUrl).map((r) => r.id)])].slice(0, 10).map((id) => (
                  <button key={id} type="button" aria-pressed={stores.includes(id!)} onClick={() => setStores(stores.includes(id!) ? stores.filter((x) => x !== id) : [...stores, id!])} className={chip(stores.includes(id!))}>
                    {retailerOf(o.data, id!).name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-[15px] font-semibold">Sizing (optional)</p>
            <div className="flex flex-wrap gap-2">
              {(["small", "true", "large"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={sizing === s} onClick={() => setSizing(sizing === s ? null : s)} className={chip(sizing === s)}>
                  {{ small: "Runs small", true: "True to size", large: "Runs large" }[s]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[15px] font-semibold">Return experience (optional)</p>
            <div className="flex flex-wrap gap-2">
              {(["easy", "okay", "hard"] as const).map((s) => (
                <button key={s} type="button" aria-pressed={ease === s} onClick={() => setEase(ease === s ? null : s)} className={chip(ease === s)}>
                  {{ easy: "Easy", okay: "Okay", hard: "Difficult" }[s]}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="animate-in space-y-5">
          <h1 className="font-display text-[28px] leading-none">Who can see it?</h1>
          <div className="grid grid-cols-3 gap-2">
            {(["private", "friends", "public"] as Visibility[]).map((v) => (
              <button key={v} type="button" aria-pressed={audience === v} onClick={() => setAudience(v)} className={chip(audience === v)}>
                {visibilityLabel[v]}
              </button>
            ))}
          </div>
          <div>
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">Preview</p>
            <FeedPost post={draft} author={{ id: "me", name: o.data.publicProfile?.displayName ?? "You", handle: "you", palette: "orchid", relation: "me", demo: false }} data={o.data} following={false} />
          </div>
          {fromPurchases && (
            <Card className="px-4">
              <CheckRow checked={confirm} onChange={setConfirm}>
                <span className="block font-semibold">Share these {picked.length} {picked.length === 1 ? "piece" : "pieces"}</span>
                <span className="block text-[14px] text-muted">{picked.map((p) => p.name).join(", ")}. Names only. Your other purchases, prices and dates stay private.</span>
              </CheckRow>
            </Card>
          )}
          <Notice tone="info" title={<span className="inline-flex items-center gap-1.5"><ShieldCheck aria-hidden className="size-4" /> In this preview</span>}>
            Posts are saved only in your browser until Tote accounts launch, so no one else can see them yet.
          </Notice>
        </section>
      )}

      <div className="mt-8 flex gap-2">
        {step > 0 && (
          <Button variant="secondary" size="md" className="flex-1" onClick={() => setStep(step - 1)}>
            Back
          </Button>
        )}
        {step < 3 ? (
          <Button size="md" className="flex-[2]" disabled={!canNext} onClick={() => setStep(step + 1)}>
            Next
          </Button>
        ) : (
          <Button
            size="md"
            className="flex-[2]"
            disabled={!canNext}
            onClick={() => {
              const { id: _id, authorId: _a, createdAt: _c, likes: _l, liked: _lk, saved: _s, demo: _d, ...input } = draft;
              actions.publishPost({ ...input, audience: audience! });
              toast("Posted", `Visible to: ${visibilityLabel[audience!]}.`);
              // Land on the feed, where the new post is, whatever tab was open before.
              presetSession("circle-section2", "feed");
              presetSession("circle-feed", "friends");
              router.replace("/circle/");
            }}
          >
            Publish
          </Button>
        )}
      </div>
    </Shell>
  );
}
