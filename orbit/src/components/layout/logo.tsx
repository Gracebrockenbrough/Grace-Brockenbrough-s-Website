export function OrbitMark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <circle cx="16" cy="16" r="11" fill="none" stroke="currentColor" strokeWidth="2.25" />
      <circle cx="25.5" cy="10.5" r="3.25" fill="#B65D4F" stroke="#F8F7F4" strokeWidth="1.5" />
    </svg>
  );
}

export function OrbitWordmark() {
  return (
    <span className="inline-flex items-center gap-2 text-navy">
      <OrbitMark />
      <span className="text-[21px] font-semibold tracking-[-0.03em]">orbit</span>
      <span className="sr-only">Orbit, Returns and Wallet</span>
    </span>
  );
}
