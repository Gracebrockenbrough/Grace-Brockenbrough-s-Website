import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import type { Retailer } from "@/lib/domain/types";
import { cn } from "../ui/cn";
import { RetailerMark } from "./retail";

const toneCls = {
  terracotta: "bg-terracotta-soft text-terracotta",
  sage: "bg-sage text-sage-ink",
  sand: "bg-sand text-sand-ink",
  navy: "bg-ivory-deep text-navy",
};

/** A Discover box: one idea, one number, tap for the details. */
export function DiscoverTile({
  href,
  icon,
  tone,
  value,
  label,
  sub,
  marks,
}: {
  href: string;
  icon: ReactNode;
  tone: keyof typeof toneCls;
  value: string;
  label: string;
  sub: string;
  marks?: Retailer[];
}) {
  return (
    <Link
      href={href}
      className="animate-in flex min-h-[164px] flex-col rounded-[22px] border border-line bg-card p-4 shadow-[var(--shadow-card)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
    >
      <span className="flex items-start justify-between">
        <span aria-hidden className={cn("flex size-10 items-center justify-center rounded-xl [&_svg]:size-5", toneCls[tone])}>
          {icon}
        </span>
        <ChevronRight aria-hidden className="size-5 text-muted/50" />
      </span>
      <span className="mt-auto pt-3">
        <span className="tabular block text-[26px] font-semibold leading-none tracking-[-0.02em]">{value}</span>
        <span className="mt-1 block text-[15px] font-semibold">{label}</span>
        <span className="block text-[13px] leading-snug text-muted">{sub}</span>
      </span>
      {marks && marks.length > 0 && (
        <span aria-hidden className="mt-2 flex -space-x-1.5">
          {marks.slice(0, 4).map((r) => (
            <RetailerMark key={r.id} retailer={r} className="size-7 rounded-lg border-2 border-card text-[10px]" />
          ))}
        </span>
      )}
    </Link>
  );
}

/** A slimmer row for secondary sections. */
export function DiscoverRow({ href, icon, label, sub }: { href: string; icon: ReactNode; label: string; sub: string }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ivory-deep">
      <span aria-hidden className="flex size-10 items-center justify-center rounded-xl bg-ivory-deep text-navy [&_svg]:size-5">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{label}</span>
        <span className="block text-[14px] text-muted">{sub}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 text-muted/60" />
    </Link>
  );
}
