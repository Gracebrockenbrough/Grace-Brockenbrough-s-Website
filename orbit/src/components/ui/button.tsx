import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "lg" | "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,transform,box-shadow] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-45 select-none";

const variants: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy-soft shadow-[0_1px_2px_rgb(25_36_59/0.2)]",
  secondary: "bg-card text-navy border border-line hover:bg-ivory-deep",
  ghost: "text-navy hover:bg-ivory-deep",
  danger: "bg-card text-terracotta border border-line hover:bg-terracotta-soft",
};

const sizes: Record<Size, string> = {
  lg: "h-[52px] px-6 text-[16px] w-full",
  md: "h-11 px-5 text-[15px]",
  sm: "h-11 px-4 text-[15px]",
};

interface Common {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
}

export function Button({ variant = "primary", size = "lg", className, children, icon, ...rest }: Common & ComponentProps<"button">) {
  return (
    <button type="button" className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}

/** Internal navigation styled as a button. */
export function ButtonLink({ variant = "primary", size = "lg", className, children, icon, href }: Common & { href: string }) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)}>
      {icon}
      {children}
    </Link>
  );
}

/** Opens an external site (e.g. a retailer) in a new tab, and says so. */
export function ExternalButton({ variant = "primary", size = "lg", className, children, href }: Omit<Common, "icon"> & { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn(base, variants[variant], sizes[size], className)}>
      {children}
      <ArrowUpRight aria-hidden className="size-[18px] opacity-80" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

export function IconButton({ label, className, children, ...rest }: { label: string } & ComponentProps<"button">) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn("inline-flex size-11 items-center justify-center rounded-full text-navy transition-colors hover:bg-ivory-deep active:scale-95", className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function IconLink({ label, href, className, children }: { label: string; href: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} aria-label={label} className={cn("inline-flex size-11 items-center justify-center rounded-full text-navy transition-colors hover:bg-ivory-deep", className)}>
      {children}
    </Link>
  );
}

/** Quiet inline text action ("View all"). Still a 44px tall target. */
export function TextLink({ href, children, className, external }: { href: string; children: ReactNode; className?: string; external?: boolean }) {
  const cls = cn("inline-flex min-h-11 items-center gap-1 text-[15px] font-semibold text-navy underline-offset-4 hover:underline", className);
  if (external)
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
        <ArrowUpRight aria-hidden className="size-4" />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
