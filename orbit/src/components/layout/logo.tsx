import { BRAND } from "@/lib/brand";

/**
 * The Tote mark: a soft tote bag with a coral fold in its corner, the "return" that
 * folds back. Indigo body so it reads on any section tint.
 */
export function OrbitMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M11.5 12V9.5a4.5 4.5 0 0 1 9 0V12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6.6 12.2c0-.7.5-1.2 1.2-1.2h16.4c.7 0 1.2.5 1.2 1.2l-1.1 13.1a2.9 2.9 0 0 1-2.9 2.7H10.6a2.9 2.9 0 0 1-2.9-2.7z" fill="currentColor" />
      <path d="M25.2 18.6 19.6 28h1.8a2.9 2.9 0 0 0 2.9-2.7z" fill="#E8826D" />
      <circle cx="16" cy="17.6" r="1.6" fill="#FBF9F6" />
    </svg>
  );
}

export function OrbitWordmark() {
  return (
    <span className="inline-flex items-center gap-1.5 text-navy">
      <OrbitMark />
      <span className="font-display text-[25px] leading-none tracking-[-0.02em]">{BRAND.wordmark}</span>
      <span className="sr-only">{BRAND.name}</span>
    </span>
  );
}
