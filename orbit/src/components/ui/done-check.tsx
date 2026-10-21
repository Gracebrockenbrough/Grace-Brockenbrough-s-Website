import { cn } from "./cn";

/** A checkmark that pops in and draws itself. Static when reduced motion is on. */
export function DoneCheck({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <span aria-hidden className={cn("animate-pop inline-flex shrink-0 items-center justify-center rounded-full", onDark ? "bg-white/15 text-white" : "bg-sage text-sage-ink", className)}>
      <svg viewBox="0 0 24 24" className="size-[55%]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5" className="animate-draw" />
      </svg>
    </span>
  );
}
