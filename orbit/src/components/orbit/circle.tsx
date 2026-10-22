"use client";

import Link from "next/link";
import { Heart, Lock, Store, UsersRound } from "lucide-react";
import type { CircleAuthor, Collection, Retailer, ReturnPolicy, Visibility } from "@/lib/domain/types";
import type { ItemKind } from "@/lib/intelligence/buckets";
import { money } from "@/lib/domain/format";
import type { OrbitData } from "@/lib/store/state";
import { cn } from "../ui/cn";
import { Collage, Photo, type Palette } from "./art";
import { ItemArt, KIND_COLOR } from "./item-art";

/** Lists and favorite stores are either just yours or public. Friends-only is treated as public. */
export const visibilityLabel: Record<Visibility, string> = { private: "Private", friends: "Public", public: "Public" };

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

/** Image-led store card: a collage band in the store's colors, then one or two real facts. */
export function StoreTile({ r, policy, friends, saved }: { r: Retailer; policy: ReturnPolicy | null; friends: number; saved: boolean; data?: OrbitData }) {
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
            <UsersRound aria-hidden className="size-3.5" /> On {friends} {friends === 1 ? "friend's list" : "friends' lists"}
          </span>
        ) : (
          <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
            <Store aria-hidden className="size-3.5" /> {policy ? "Policy on file" : "No policy on file"}
          </span>
        )}
      </span>
    </Link>
  );
}

/** A collection as a tasteful collage: up to four pieces, never filler images. */
export function CollectionTile({ c, href, owner }: { c: Collection; href: string; owner?: CircleAuthor | null }) {
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
          {owner ? (
            <>
              {owner.name}
              {owner.demo ? " · Demo" : ""}
            </>
          ) : (
            <>
              {c.visibility === "private" && <Lock aria-hidden className="size-3" />}
              {c.items.length} {c.items.length === 1 ? "item" : "items"} · {visibilityLabel[c.visibility]}
            </>
          )}
        </span>
      </span>
    </Link>
  );
}
