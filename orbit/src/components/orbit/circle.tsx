"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Bookmark, ChevronDown, Heart, Lock, Ruler, Store, Undo2, UsersRound } from "lucide-react";
import { toast } from "@/components/ui/toast";
import type { CircleAuthor, Collection, PostImage, Retailer, ReturnPolicy, SocialPost, Visibility } from "@/lib/domain/types";
import type { ItemKind } from "@/lib/intelligence/buckets";
import { money } from "@/lib/domain/format";
import { retailerOf } from "@/lib/store/selectors";
import type { OrbitData } from "@/lib/store/state";
import { actions } from "@/lib/store/store";
import { cn } from "../ui/cn";
import { BagsSketch, Collage, Photo, type Palette } from "./art";
import { ItemArt, KIND_COLOR } from "./item-art";
import { RetailerMark } from "./retail";

export const visibilityLabel: Record<Visibility, string> = { private: "Only you", friends: "Friends", public: "Everyone" };

const AVATAR: Record<string, string> = {
  rose: "bg-[#F2EFEA] text-navy ring-1 ring-[#C23A2B]/50",
  sky: "bg-[#F2EFEA] text-navy ring-1 ring-navy/20",
  sage: "bg-[#F2EFEA] text-navy ring-1 ring-navy/20",
  ink: "bg-navy text-white",
  apricot: "bg-[#F2EFEA] text-navy ring-1 ring-navy/20",
  orchid: "bg-[#F2EFEA] text-navy ring-1 ring-[#7948AF]/40",
};

export function Avatar({ name, palette, className }: { name: string; palette: string; className?: string }) {
  return (
    <span aria-hidden className={cn("font-display flex size-9 shrink-0 items-center justify-center rounded-full text-[16px]", AVATAR[palette] ?? AVATAR.apricot, className)}>
      {name[0]}
    </span>
  );
}

export function PostImageView({ img, className }: { img: PostImage; className?: string }) {
  if (img.kind === "photo") return <Photo src={img.src} alt={img.alt} className={cn("size-full", className)} />;
  return <Collage seed={img.seed} kinds={img.kinds as ItemKind[]} palette={img.palette as Palette} label={img.alt} className={cn("size-full", className)} />;
}

/** Swipeable images with position dots. Uses native scroll-snap, so it's light and accessible. */
export function Carousel({ images, className, aspect = "aspect-[4/5]" }: { images: PostImage[]; className?: string; aspect?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  return (
    <div className={cn("relative", className)}>
      <div
        ref={ref}
        onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-[24px] [scrollbar-width:none]"
        aria-roledescription="carousel"
        aria-label={`${images.length} ${images.length === 1 ? "image" : "images"}`}
      >
        {images.map((img, n) => (
          <div key={n} className={cn("w-full shrink-0 snap-center", aspect)} aria-roledescription="slide" aria-label={`${n + 1} of ${images.length}`}>
            <PostImageView img={img} />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5" aria-hidden>
          {images.map((_, n) => (
            <span key={n} className={cn("h-1.5 rounded-full bg-white transition-all", n === i ? "w-5" : "w-1.5 opacity-60")} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Post types as small editorial kickers, not candy-colored pills. */
const TYPE: Record<SocialPost["type"], { label: string; chip: string }> = {
  haul: { label: "Haul", chip: "text-[#C23A2B]" },
  styled: { label: "Styled it", chip: "text-navy" },
  store_favorite: { label: "Store favorite", chip: "text-navy" },
  review: { label: "Honest review", chip: "text-navy" },
  collection: { label: "Collection", chip: "text-navy" },
};

const SIZING = { small: "Runs small", true: "True to size", large: "Runs large" } as const;
const EASE = { easy: "Easy return", okay: "Okay return", hard: "Difficult return" } as const;

function Notes({ post }: { post: SocialPost }) {
  const n = post.notes;
  if (!n.sizing && !n.returnEase && !n.quality) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5 text-[13px] font-semibold">
      {n.sizing && (
        <span className="inline-flex items-center gap-1 rounded-full bg-ivory-deep px-2.5 py-1">
          <Ruler aria-hidden className="size-3.5" /> {SIZING[n.sizing]}
        </span>
      )}
      {n.returnEase && (
        <span className="inline-flex items-center gap-1 rounded-full bg-ivory-deep px-2.5 py-1">
          <Undo2 aria-hidden className="size-3.5" /> {EASE[n.returnEase]}
        </span>
      )}
      {n.quality && <span className="rounded-full bg-ivory-deep px-2.5 py-1">{n.quality}</span>}
    </div>
  );
}

function StoreTags({ post, data }: { post: SocialPost; data: OrbitData }) {
  if (!post.retailerIds.length) return null;
  return (
    <span className="flex flex-wrap gap-x-2">
      {post.retailerIds.map((id) => (
        <Link key={id} href={`/stores/?id=${id}`} className="inline-flex min-h-8 items-center font-bold text-circle">
          @{retailerOf(data, id).name}
        </Link>
      ))}
    </span>
  );
}

function Actions({ post, author }: { post: SocialPost; author: { name: string } }) {
  return (
    <div className="mt-1 flex items-center gap-1">
      <button type="button" aria-pressed={post.liked} aria-label={post.liked ? "Unlike" : "Like"} onClick={() => actions.toggleLike(post.id)} className={cn("inline-flex h-11 items-center gap-1.5 rounded-full px-2.5 text-[14px] font-semibold", post.liked ? "text-returns" : "text-muted hover:text-navy")}>
        <Heart aria-hidden key={String(post.liked)} className={cn("size-5", post.liked && "animate-pop fill-current")} />
        <span className="tabular">{post.likes}</span>
      </button>
      <button
        type="button"
        aria-pressed={post.saved}
        aria-label={post.saved ? "Remove from saved" : `Save ${author.name}'s post`}
        onClick={() => actions.toggleSavePost(post.id) && toast("Saved", "Find it in Lists.")}
        className={cn("inline-flex size-11 items-center justify-center rounded-full", post.saved ? "text-circle" : "text-muted hover:text-navy")}
      >
        <Bookmark aria-hidden className={cn("size-5", post.saved && "fill-current")} />
      </button>
    </div>
  );
}

/** A feed post. Layout varies by type so the feed has rhythm instead of identical boxes. */
export function FeedPost({ post, author, data, following }: { post: SocialPost; author: CircleAuthor | { id: string; name: string; handle: string; palette: string; relation: "me"; demo: false }; data: OrbitData; following: boolean }) {
  const [open, setOpen] = useState(false);
  const t = TYPE[post.type];
  const head = (
    <div className="flex items-center gap-2.5">
      <Avatar name={author.name} palette={author.palette} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[15px] font-bold">{author.name}</p>
        <p className="truncate text-[13px] text-muted">
          <span className={cn("mr-1.5 text-[11px] font-bold uppercase tracking-[0.12em]", t.chip)}>{t.label}</span>
          {author.relation === "me" ? visibilityLabel[post.audience] : `@${author.handle}`}
        </p>
      </div>
      {post.demo && <span className="rounded-full border border-dashed border-line px-2 py-0.5 text-[11px] font-semibold text-muted">Demo</span>}
      {author.relation === "creator" && (
        <button type="button" onClick={() => actions.toggleFollow(author.id)} className={cn("h-9 rounded-full px-3.5 text-[13px] font-bold", following ? "border border-line text-muted" : "bg-navy text-white")}>
          {following ? "Following" : "Follow"}
        </button>
      )}
    </div>
  );

  // Store favorite: an editorial card about the store itself.
  if (post.type === "store_favorite") {
    const r = retailerOf(data, post.retailerIds[0]);
    return (
      <article className="overflow-hidden rounded-[26px] bg-card shadow-[var(--shadow-card)]">
        <div className="p-4 pb-3">{head}</div>
        <Link href={`/stores/?id=${r.id}`} className="relative mx-3 flex items-center gap-4 overflow-hidden rounded-[20px] border border-line bg-[#FAF8F4] p-4">
          <BagsSketch className="absolute -right-3 bottom-0 h-20 opacity-90" />
          <RetailerMark retailer={r} className="size-14 rounded-2xl text-[17px]" />
          <span className="relative min-w-0">
            <span className="font-display block text-[24px] leading-none">{r.name}</span>
            <span className="mt-1 block text-[14px] text-muted underline decoration-[#C23A2B] underline-offset-4">Store, returns and reviews</span>
          </span>
        </Link>
        <div className="px-4 pb-2 pt-3">
          <p className="text-[15px] leading-snug">“{post.caption}”</p>
          <Notes post={post} />
          <Actions post={post} author={author} />
        </div>
      </article>
    );
  }

  // Honest review: a quote card, coral-edged like Returns.
  if (post.type === "review") {
    return (
      <article className="rounded-[26px] bg-card p-4 shadow-[var(--shadow-card)]">
        {head}
        <blockquote className="mt-3 border-l-2 border-[#C23A2B] pl-3">
          <p className="font-display text-[20px] leading-[1.15]">“{post.caption}”</p>
        </blockquote>
        <div className="mt-2 text-[14px]">
          <StoreTags post={post} data={data} />
        </div>
        <Notes post={post} />
        <Actions post={post} author={author} />
      </article>
    );
  }

  // Collection: a 2×2 grid of the tagged pieces.
  if (post.type === "collection" && post.items.length >= 3) {
    return (
      <article className="rounded-[26px] bg-card p-4 shadow-[var(--shadow-card)]">
        {head}
        <p className="font-display mt-3 text-[22px] leading-[1.1]">{post.caption}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {post.items.slice(0, 4).map((it, n) => {
            const kind = (it.kind ?? "other") as ItemKind;
            return (
              <div key={n} className="relative aspect-square overflow-hidden rounded-[18px]" style={{ background: KIND_COLOR[kind].tint }}>
                <ItemArt kind={kind} className="absolute left-[18%] top-[14%] size-[64%]" />
                <span className="absolute inset-x-2 bottom-2 truncate rounded-full bg-white/90 px-2 py-0.5 text-[12px] font-semibold">{it.name}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-2 text-[14px]">
          <StoreTags post={post} data={data} />
        </div>
        <Actions post={post} author={author} />
      </article>
    );
  }

  // Haul / Styled it: image first.
  return (
    <article className={cn(post.type === "styled" ? "" : "rounded-[26px] bg-card p-3 shadow-[var(--shadow-card)]")}>
      <div className={cn(post.type === "styled" ? "px-1 pb-2" : "px-1 pb-2.5 pt-1")}>{head}</div>
      {post.images.length > 0 && <Carousel images={post.images} aspect={post.type === "styled" ? "aspect-[4/5]" : "aspect-square"} />}
      <div className="px-1 pt-2">
        <p className="text-[15px] leading-snug">
          <span className="font-bold">{author.name}</span> {post.caption}
        </p>
        <div className="text-[14px]">
          <StoreTags post={post} data={data} />
        </div>
        <Notes post={post} />
        {post.items.length > 0 && (
          <>
            <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="mt-1 inline-flex min-h-10 items-center gap-1 text-[14px] font-semibold text-muted">
              {open ? "Hide" : "View"} {post.items.length} tagged {post.items.length === 1 ? "item" : "items"} <ChevronDown aria-hidden className={cn("size-4 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
              <ul className="animate-in mb-1 space-y-1.5">
                {post.items.map((it, n) => (
                  <li key={n} className="flex items-center gap-2.5 rounded-2xl bg-ivory-deep px-2.5 py-2 text-[14px]">
                    <span className="flex size-9 items-center justify-center rounded-xl" style={{ background: KIND_COLOR[(it.kind ?? "other") as ItemKind].tint }}>
                      <ItemArt kind={(it.kind ?? "other") as ItemKind} className="size-7" />
                    </span>
                    <span className="flex-1 font-semibold">{it.name}</span>
                    {it.retailerId && (
                      <Link href={`/stores/?id=${it.retailerId}`} className="text-[13px] font-semibold text-circle">
                        {retailerOf(data, it.retailerId).name}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <Actions post={post} author={author} />
      </div>
    </article>
  );
}

/** Image-led store card: a collage band in the store's colors, then one or two real facts. */
export function StoreTile({ r, policy, friends, saved, data }: { r: Retailer; policy: ReturnPolicy | null; friends: number; saved: boolean; data: OrbitData }) {
  const kinds: Record<Retailer["category"], ItemKind[]> = {
    fashion: ["dresses", "knitwear"],
    beauty: ["beauty"],
    shoes: ["shoes"],
    accessories: ["bags", "accessories"],
    home: ["home"],
    general: ["other", "home"],
  };
  const palette: Record<Retailer["tone"], Palette> = { navy: "ink", sage: "sage", terracotta: "rose", sand: "apricot", slate: "orchid", ink: "sky" };
  const fact = !policy
    ? { text: "Return policy unknown", tone: "text-sand-ink" }
    : policy.fees.mail === 0
      ? { text: "Free mail returns", tone: "text-sage-ink" }
      : policy.fees.mail != null
        ? { text: `${money(policy.fees.mail)} mail returns`, tone: "text-navy" }
        : policy.refundMethods.includes("original_payment")
          ? { text: "Refunds to card", tone: "text-navy" }
          : { text: "Store credit only", tone: "text-sand-ink" };
  return (
    <Link href={`/stores/?id=${r.id}`} className="group block overflow-hidden rounded-[22px] bg-card shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]">
      <Collage seed={r.id} kinds={kinds[r.category]} palette={palette[r.tone]} className="aspect-[4/3]">
        {saved && (
          <span className="absolute right-2 top-2 inline-flex size-8 items-center justify-center rounded-full bg-white/90 text-circle">
            <Heart aria-label="Saved" className="size-4 fill-current" />
          </span>
        )}
      </Collage>
      <span className="block p-3">
        <span className="font-display block truncate text-[19px] leading-tight">{r.name}</span>
        <span className={cn("block truncate text-[13px] font-semibold", fact.tone)}>{fact.text}</span>
        {friends > 0 ? (
          <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
            <UsersRound aria-hidden className="size-3.5" /> {friends} {friends === 1 ? "friend recommends" : "friends recommend"}
          </span>
        ) : (
          <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
            <Store aria-hidden className="size-3.5" /> {policy ? `Policy checked ${policy.lastCheckedAt.slice(5).replace("-", "/")}` : "No policy on file"}
          </span>
        )}
      </span>
    </Link>
  );
}

/** A collection as a tasteful collage: up to four pieces, never filler images. */
export function CollectionTile({ c, href }: { c: Collection; href: string }) {
  const pieces = c.items.slice(0, 4);
  return (
    <Link href={href} className="block">
      <span className="relative grid aspect-square grid-cols-2 gap-1 overflow-hidden rounded-[22px] bg-card p-1 shadow-[var(--shadow-card)]">
        {pieces.length === 0 ? (
          <span className="col-span-2 row-span-2 flex items-center justify-center rounded-[18px] border-2 border-dashed border-line text-[13px] font-semibold text-muted">Empty</span>
        ) : (
          Array.from({ length: 4 }, (_, n) => {
            const it = pieces[n];
            if (!it) return <span key={n} className="rounded-[16px] bg-ivory-deep" />;
            const kind = (it.kind ?? "other") as ItemKind;
            return it.image ? (
              <Photo key={n} src={it.image} alt="" className={cn("size-full rounded-[16px]", pieces.length === 1 && "col-span-2 row-span-2")} />
            ) : (
              <span key={n} className={cn("relative rounded-[16px]", pieces.length === 1 && "col-span-2 row-span-2")} style={{ background: KIND_COLOR[kind].tint }}>
                <ItemArt kind={kind} className="absolute left-[16%] top-[16%] size-[68%]" />
              </span>
            );
          })
        )}
      </span>
      <span className="mt-2 block px-1">
        <span className="block truncate text-[15px] font-bold">{c.title}</span>
        <span className="flex items-center gap-1 text-[13px] text-muted">
          {c.visibility === "private" && <Lock aria-hidden className="size-3" />}
          {c.items.length} {c.items.length === 1 ? "item" : "items"} · {visibilityLabel[c.visibility]}
        </span>
      </span>
    </Link>
  );
}
