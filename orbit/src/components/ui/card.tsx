import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "./cn";

export function Card({ children, className, as: As = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" | "article" | "li" }) {
  return <As className={cn("rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)]", className)}>{children}</As>;
}

/** A card whose whole surface navigates. Keep a single, clear destination. */
export function LinkCard({ href, children, className, label }: { href: string; children: ReactNode; className?: string; label?: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={cn(
        "block rounded-[var(--radius-card)] border border-line bg-card shadow-[var(--shadow-card)] transition-[transform,box-shadow] hover:shadow-[var(--shadow-lift)] active:scale-[0.99]",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/** Label/value row for detail lists. */
export function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="text-[15px] text-muted">{label}</dt>
      <dd className="text-right text-[15px] font-medium text-navy">
        {children}
        {hint && <div className="mt-0.5 text-[13px] font-normal text-muted">{hint}</div>}
      </dd>
    </div>
  );
}

export function Rows({ children, className }: { children: ReactNode; className?: string }) {
  return <dl className={cn("divide-y divide-line", className)}>{children}</dl>;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex min-h-11 items-end justify-between gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {action}
    </div>
  );
}
