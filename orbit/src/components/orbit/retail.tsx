import { Footprints, Gem, House, Package, Shirt, Sparkles } from "lucide-react";
import type { CardTone, ItemCategory, Retailer } from "@/lib/domain/types";
import { cn } from "../ui/cn";
import { itemKind } from "@/lib/intelligence/buckets";
import { ItemArt, KIND_COLOR } from "./item-art";

/** Card-face and accent colors per tone. Muted, in-palette; never a retailer's own branding. */
export const tones: Record<CardTone, { face: string; ink: string; soft: string; softInk: string }> = {
  navy: { face: "bg-[#26233D]", ink: "text-white", soft: "bg-[#E8E7EF]", softInk: "text-[#26233D]" },
  sage: { face: "bg-[#41766F]", ink: "text-white", soft: "bg-[#E9F2F0]", softInk: "text-[#2F5A54]" },
  terracotta: { face: "bg-[#AD503E]", ink: "text-white", soft: "bg-[#FBE9E4]", softInk: "text-[#8C3D2F]" },
  sand: { face: "bg-[#EEDFC6]", ink: "text-[#26233D]", soft: "bg-[#FFF0DD]", softInk: "text-[#7E5020]" },
  slate: { face: "bg-[#6E5A96]", ink: "text-white", soft: "bg-[#F1EAFB]", softInk: "text-[#5A4382]" },
  ink: { face: "bg-[#1F1E2A]", ink: "text-white", soft: "bg-[#ECEBEF]", softInk: "text-[#1F1E2A]" },
};

export function RetailerMark({ retailer, className }: { retailer: Retailer; className?: string }) {
  const t = tones[retailer.tone];
  const initials = retailer.name.replace(/[^A-Za-z0-9& ]/g, "").split(/\s+/).filter((w) => w !== "&").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <span aria-hidden className={cn("inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] text-[12px] font-bold tracking-wide", t.soft, t.softInk, className)}>
      {initials}
    </span>
  );
}

const categoryIcon: Record<ItemCategory, typeof Shirt> = {
  clothing: Shirt,
  beauty: Sparkles,
  accessories: Gem,
  shoes: Footprints,
  home: House,
  other: Package,
};

/**
 * Product image placeholder: a small drawing of the kind of item, in its own color.
 * Production shows the photo from the order email when there is one.
 */
export function ProductThumb({ category, name, tone, className, count }: { category: ItemCategory; name?: string; tone: CardTone; className?: string; count?: number }) {
  const kind = itemKind({ name: name ?? "", category });
  const useArt = Boolean(name) || kind !== "other";
  const Icon = categoryIcon[category];
  const t = tones[tone];
  return (
    <span
      aria-hidden
      className={cn("relative inline-flex size-16 shrink-0 items-center justify-center rounded-2xl", !useArt && [t.soft, t.softInk], className)}
      style={useArt ? { background: KIND_COLOR[kind].tint } : undefined}
    >
      {useArt ? <ItemArt kind={kind} className="size-[70%]" /> : <Icon className="size-7" strokeWidth={1.5} />}
      {count && count > 1 ? (
        <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-card bg-navy px-1.5 text-[11px] font-bold leading-[18px] text-white">{count}</span>
      ) : null}
    </span>
  );
}
