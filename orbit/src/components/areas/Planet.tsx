import type { Category } from "@/types";
import { AREA_STYLE } from "@/lib/areas";
import { cn } from "@/lib/cn";

/** A small lit sphere in the area's color. Purely decorative. */
export function Planet({ area, size = 56, ring = false, className, glow = false }: { area: Category; size?: number; ring?: boolean; className?: string; glow?: boolean }) {
  const { hex } = AREA_STYLE[area];
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size, marginInline: ring ? size * 0.36 : undefined }} aria-hidden>
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.75) 0%, ${hex} 30%, ${hex} 55%, rgba(13,20,48,0.85) 115%)`,
          boxShadow: glow ? `0 0 ${size * 0.5}px ${hex}55` : `0 ${size * 0.08}px ${size * 0.25}px rgba(0,0,0,0.35)`,
        }}
      />
      {ring && (
        <span
          className="absolute left-1/2 top-1/2 rounded-[50%] border-2"
          style={{ width: size * 1.7, height: size * 0.5, borderColor: `${hex}aa`, transform: "translate(-50%,-50%) rotate(-18deg)" }}
        />
      )}
    </span>
  );
}

/** The bright center of the orbit map. */
export function Sun({ size = 96, children }: { size?: number; children?: React.ReactNode }) {
  return (
    <span
      className="relative flex shrink-0 flex-col items-center justify-center rounded-full text-navy"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 35% 30%, #fffaf0 0%, #f4efe6 45%, #e3d6bd 100%)",
        boxShadow: "0 0 60px rgba(244,239,230,0.35), 0 0 120px rgba(143,155,255,0.25)",
      }}
    >
      {children}
    </span>
  );
}
