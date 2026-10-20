import { Footprints, Gem, House, ShoppingBag } from "lucide-react";
import type { StoreCategory } from "@/lib/domain/types";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function Lipstick({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M9 3.5 14 2v6.5H9z" />
      <path d="M8 8.5h7v4H8z" />
      <path d="M7 12.5h9V21a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function Hanger({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden {...stroke}>
      <path d="M10 6.2a2 2 0 1 1 3 1.7c-.7.4-1 1-1 1.6v.7" />
      <path d="M12 10.2 3 16.6a1 1 0 0 0 .6 1.9h16.8a1 1 0 0 0 .6-1.9z" />
    </svg>
  );
}

/** Small, quiet store-type icon for wallet cards. */
export function CategoryIcon({ category, className = "size-4" }: { category: StoreCategory; className?: string }) {
  switch (category) {
    case "beauty":
      return <Lipstick className={className} />;
    case "fashion":
      return <Hanger className={className} />;
    case "shoes":
      return <Footprints aria-hidden className={className} strokeWidth={1.75} />;
    case "accessories":
      return <Gem aria-hidden className={className} strokeWidth={1.75} />;
    case "home":
      return <House aria-hidden className={className} strokeWidth={1.75} />;
    default:
      return <ShoppingBag aria-hidden className={className} strokeWidth={1.75} />;
  }
}

export const categoryLabel: Record<StoreCategory, string> = {
  fashion: "Fashion",
  beauty: "Beauty",
  shoes: "Shoes",
  accessories: "Accessories",
  home: "Home",
  general: "Store",
};
