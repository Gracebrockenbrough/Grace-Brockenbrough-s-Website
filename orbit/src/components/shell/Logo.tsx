import { cn } from "@/lib/cn";

/** The orbital mark: a ring with one small body in orbit. */
export function OrbitMark({ size = 28, className, spinning = false }: { size?: number; className?: string; spinning?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="2.6" />
      <g className={cn(spinning && "origin-center animate-orbit")} style={{ transformBox: "view-box" }}>
        <ellipse cx="16" cy="16" rx="14.5" ry="6" transform="rotate(-24 16 16)" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.2" />
        <circle cx="28.4" cy="10.6" r="2.4" fill="var(--color-accent)" />
      </g>
    </svg>
  );
}

/** Typographic ORBIT wordmark. */
export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)} aria-label="ORBIT">
      <OrbitMark size={size === "lg" ? 40 : 26} />
      <span className={cn("font-semibold tracking-[0.18em]", size === "lg" ? "text-[28px]" : "text-[17px]")} aria-hidden>
        ORBIT
      </span>
    </span>
  );
}
