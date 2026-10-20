import { Footprints, Gem, House, Package, Shirt, Sparkles } from "lucide-react";
import type { CardTone, ItemCategory, Retailer } from "@/lib/domain/types";
import { cn } from "../ui/cn";

/** Card-face and accent colors per tone. Muted, in-palette; never a retailer's own branding. */
export const tones: Record<CardTone, { face: string; ink: string; soft: string; softInk: string }> = {
  navy: { face: "bg-[#19243B]", ink: "text-white", soft: "bg-[#E6E8EE]", softInk: "text-[#19243B]" },
  sage: { face: "bg-[#4E6A57]", ink: "text-white", soft: "bg-[#DDE8DC]", softInk: "text-[#35553C]" },
  terracotta: { face: "bg-[#B65D4F]", ink: "text-white", soft: "bg-[#F5E7E3]", softInk: "text-[#8E4135]" },
  sand: { face: "bg-[#E5DAC4]", ink: "text-[#19243B]", soft: "bg-[#F3ECDF]", softInk: "text-[#6B5532]" },
  slate: { face: "bg-[#59627A]", ink: "text-white", soft: "bg-[#E9EBEF]", softInk: "text-[#3F4759]" },
  ink: { face: "bg-[#1E1E22]", ink: "text-white", soft: "bg-[#ECECEC]", softInk: "text-[#1E1E22]" },
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

/** Placeholder product image. Production uses the image from the order email. */
export function ProductThumb({ category, tone, className, count }: { category: ItemCategory; tone: CardTone; className?: string; count?: number }) {
  const Icon = categoryIcon[category];
  const t = tones[tone];
  return (
    <span aria-hidden className={cn("relative inline-flex size-16 shrink-0 items-center justify-center rounded-2xl", t.soft, t.softInk, className)}>
      <Icon className="size-7" strokeWidth={1.5} />
      {count && count > 1 ? (
        <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-card bg-navy px-1.5 text-[11px] font-bold leading-[18px] text-white">{count}</span>
      ) : null}
    </span>
  );
}
