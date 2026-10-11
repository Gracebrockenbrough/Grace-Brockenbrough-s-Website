import type { Category } from "@/types";
import { areaStyle } from "@/lib/areas";
import { cn } from "@/lib/cn";

/** A small, flat circle in the area's color. The only "planet" in the app. */
export function Planet({ area, size = 12, className }: { area: Category; size?: number; className?: string }) {
  return <span className={cn("inline-block shrink-0 rounded-full", areaStyle(area).dot, className)} style={{ width: size, height: size }} aria-hidden />;
}
