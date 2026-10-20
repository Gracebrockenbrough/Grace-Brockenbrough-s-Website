import { BRAND } from "@/lib/brand";

/** A shopping bag in orbit: the bag outline with the terracotta "planet" at its handle. */
export function OrbitMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <path d="M7.2 11.5h17.6l-1.3 13.3a3 3 0 0 1-3 2.7h-9a3 3 0 0 1-3-2.7z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12 11.5V9.8a4 4 0 0 1 8 0v1.7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="23.6" cy="7.4" r="3" fill="#B65D4F" stroke="#F8F7F4" strokeWidth="1.5" />
    </svg>
  );
}

export function OrbitWordmark() {
  return (
    <span className="inline-flex items-center gap-1.5 text-navy">
      <OrbitMark />
      <span className="text-[21px] font-semibold tracking-[-0.03em]">{BRAND.wordmark}</span>
      <span className="sr-only">{BRAND.name}</span>
    </span>
  );
}
