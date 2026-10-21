"use client";

import { Heart } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { actions } from "@/lib/store/store";
import { cn } from "../ui/cn";

/** Heart that fills when a store is saved. Saving is private until the customer shares it. */
export function SaveStoreButton({ retailerId, name, saved, size = "sm" }: { retailerId: string; name: string; saved: boolean; size?: "sm" | "lg" }) {
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from favorites` : `Save ${name} to favorites`}
      onClick={() => {
        if (actions.toggleFavoriteStore(retailerId)) toast(`${name} saved`, "It's in your favorites. Only you can see it until you share it.");
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors",
        size === "lg" ? "h-11 border border-line bg-card px-4 text-[15px] hover:bg-ivory-deep" : "size-11 hover:bg-circle-soft",
        saved ? "text-circle" : "text-muted",
      )}
    >
      <Heart aria-hidden key={String(saved)} className={cn("size-5", saved && "animate-pop fill-current")} />
      {size === "lg" && (saved ? "Saved" : "Save Store")}
    </button>
  );
}
