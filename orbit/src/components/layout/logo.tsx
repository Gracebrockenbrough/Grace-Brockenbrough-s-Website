import { BRAND } from "@/lib/brand";

/** The Penny mark: a copper coin with a little shopping bag pressed into it. */
export function OrbitMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="14" fill="#C27A3F" />
      <circle cx="16" cy="16" r="11.2" fill="none" stroke="#F3D9BC" strokeWidth="1" strokeDasharray="1.4 1.6" />
      <path d="M13.2 13.2v-1.4a2.8 2.8 0 0 1 5.6 0v1.4" fill="none" stroke="#FFF6EC" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10.6 13.2h10.8l-.8 8.6a1.6 1.6 0 0 1-1.6 1.4h-6a1.6 1.6 0 0 1-1.6-1.4z" fill="#FFF6EC" />
    </svg>
  );
}

export function OrbitWordmark() {
  return (
    <span className="inline-flex items-center gap-1.5 text-navy">
      <OrbitMark />
      <span className="font-display text-[25px] leading-none">{BRAND.wordmark}</span>
      <span className="sr-only">{BRAND.name}</span>
    </span>
  );
}
