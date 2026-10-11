import { cn } from "@/lib/cn";

/** The Orbit mark: a small circle with one body on a thin orbit. */
export function OrbitMark({ size = 28, className, spinning = false }: { size?: number; className?: string; spinning?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden className={className}>
      <circle cx="16" cy="16" r="6.5" fill="currentColor" />
      <g className={cn(spinning && "origin-center animate-orbit")} style={{ transformBox: "view-box" }}>
        <circle cx="16" cy="16" r="12.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.4" />
        <circle cx="28.5" cy="16" r="2.6" fill="var(--color-accent)" />
      </g>
    </svg>
  );
}

/** Wordmark: "Orbit", set in the display serif. */
export function Logo({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)} aria-label="Orbit">
      <OrbitMark size={size === "lg" ? 34 : 24} />
      <span className={cn("font-display", size === "lg" ? "text-[30px]" : "text-[21px]")} aria-hidden>
        Orbit
      </span>
    </span>
  );
}
