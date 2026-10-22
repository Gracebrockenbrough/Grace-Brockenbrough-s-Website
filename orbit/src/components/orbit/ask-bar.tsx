import Link from "next/link";
import { Mic, Sparkles } from "lucide-react";

/** Entry point to Ask Penny. Looks like a search field; opens the full Ask screen. */
export function AskBar({ hint = "“the black dress from last month”" }: { hint?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href="/ask/"
        className="flex h-[52px] min-w-0 flex-1 items-center gap-2.5 rounded-full border border-line bg-card px-4 text-[16px] shadow-[var(--shadow-card)] hover:border-navy/30"
      >
        <Sparkles aria-hidden className="size-5 shrink-0 text-terracotta" />
        <span className="whitespace-nowrap font-semibold">Ask Penny</span>
        <span className="truncate text-muted">{hint}</span>
      </Link>
      <Link
        href="/ask/?voice=1"
        aria-label="Ask Penny by voice"
        className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-navy text-white shadow-[var(--shadow-card)] hover:bg-navy-soft"
      >
        <Mic aria-hidden className="size-5" />
      </Link>
    </div>
  );
}
