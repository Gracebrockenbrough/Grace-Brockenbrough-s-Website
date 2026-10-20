import Link from "next/link";
import { cn } from "../ui/cn";

/** Sales and Wishlist live together inside Discover. */
export function DiscoverTabs({ current, wishCount }: { current: "sales" | "wishlist"; wishCount: number }) {
  const tab = (id: "sales" | "wishlist", href: string, label: string) => (
    <Link
      href={href}
      aria-current={current === id ? "page" : undefined}
      className={cn("flex h-11 flex-1 items-center justify-center rounded-full text-[15px] font-semibold transition-colors", current === id ? "bg-card shadow-[var(--shadow-card)]" : "text-muted hover:text-navy")}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Discover" className="flex rounded-full bg-ivory-deep p-1">
      {tab("sales", "/", "Sales for you")}
      {tab("wishlist", "/wishlist/", `Wishlist${wishCount ? ` · ${wishCount}` : ""}`)}
    </nav>
  );
}
