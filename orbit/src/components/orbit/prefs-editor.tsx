"use client";

import { EyeOff, Star } from "lucide-react";
import type { ShopCategory, ShoppingPrefs } from "@/lib/domain/types";
import type { OrbitData } from "@/lib/store/state";
import { actions } from "@/lib/store/store";
import { cn } from "../ui/cn";
import { Choice, Toggle } from "../ui/form";
import { RetailerMark } from "./retail";

const CATEGORIES: { id: ShopCategory; label: string }[] = [
  { id: "clothing", label: "Clothing" },
  { id: "shoes", label: "Shoes" },
  { id: "beauty", label: "Beauty" },
  { id: "accessories", label: "Accessories" },
  { id: "home", label: "Home" },
];

export function BrandPicker({ data }: { data: OrbitData }) {
  const prefs = data.shopping;
  return (
    <ul className="divide-y divide-line rounded-[18px] border border-line bg-card">
      {[...data.retailers]
        .filter((r) => r.websiteUrl)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((r) => {
          const fav = prefs.favoriteRetailerIds.includes(r.id);
          const hidden = prefs.hiddenRetailerIds.includes(r.id);
          return (
            <li key={r.id} className="flex min-h-14 items-center gap-3 px-3.5 py-2">
              <RetailerMark retailer={r} />
              <span className={cn("flex-1 font-medium", hidden && "text-muted line-through")}>{r.name}</span>
              <button
                type="button"
                aria-pressed={fav}
                aria-label={`${fav ? "Remove" : "Add"} ${r.name} as a favorite`}
                onClick={() => actions.toggleFavorite(r.id)}
                className={cn("inline-flex size-11 items-center justify-center rounded-full", fav ? "text-terracotta" : "text-muted hover:bg-ivory-deep")}
              >
                <Star aria-hidden className={cn("size-5", fav && "fill-current")} />
              </button>
              <button
                type="button"
                aria-pressed={hidden}
                aria-label={`${hidden ? "Show" : "Hide"} ${r.name} sales`}
                onClick={() => actions.toggleHiddenRetailer(r.id)}
                className={cn("inline-flex size-11 items-center justify-center rounded-full", hidden ? "bg-ivory-deep text-navy" : "text-muted hover:bg-ivory-deep")}
              >
                <EyeOff aria-hidden className="size-5" />
              </button>
            </li>
          );
        })}
    </ul>
  );
}

export function CategoryPicker({ prefs }: { prefs: ShoppingPrefs }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Categories you shop">
      {CATEGORIES.map((c) => {
        const on = prefs.categories.includes(c.id);
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            onClick={() => actions.setShopping({ categories: on ? prefs.categories.filter((x) => x !== c.id) : [...prefs.categories, c.id] })}
            className={cn("h-11 rounded-full border px-4 text-[15px] font-semibold", on ? "border-navy bg-navy text-white" : "border-line bg-card hover:bg-ivory-deep")}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

export function DiscountPicker({ prefs }: { prefs: ShoppingPrefs }) {
  return (
    <Choice
      name="min-discount"
      value={String(prefs.minDiscount) as "0" | "15" | "25" | "40"}
      onChange={(v) => actions.setShopping({ minDiscount: Number(v) as ShoppingPrefs["minDiscount"] })}
      options={[
        { value: "0", label: "Show every sale" },
        { value: "15", label: "15% off or more" },
        { value: "25", label: "25% off or more" },
        { value: "40", label: "40% off or more" },
      ]}
    />
  );
}

export function SponsoredToggle({ prefs }: { prefs: ShoppingPrefs }) {
  return (
    <Toggle
      label="Show sponsored sales"
      description="Paid placements from retailers, always labeled. They never outrank what you asked for."
      checked={prefs.showSponsored}
      onChange={(v) => actions.setShopping({ showSponsored: v })}
    />
  );
}
