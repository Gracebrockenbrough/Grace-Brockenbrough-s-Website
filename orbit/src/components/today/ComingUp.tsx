"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ComingUpGroup } from "@/services/attention";
import { useUI } from "@/store/UIProvider";
import { SectionHeader } from "@/components/ui/Card";

export function ComingUp({ groups }: { groups: ComingUpGroup[] }) {
  const { open } = useUI();
  if (!groups.length) return null;
  return (
    <section aria-labelledby="coming-up">
      <SectionHeader
        id="coming-up"
        title="Coming up"
        action={
          <Link href="/calendar?view=week" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-1 text-[14.5px] font-medium text-accent hover:text-accent-strong">
            View week <ArrowRight size={15} aria-hidden />
          </Link>
        }
      />
      <div className="divide-y divide-line rounded-2xl border border-line bg-surface shadow-card">
        {groups.map((g) => (
          <div key={g.date} className="flex gap-4 px-4 py-3.5 md:px-5">
            <p className="w-24 shrink-0 pt-0.5 text-[14.5px] font-semibold text-ink">{g.label}</p>
            <ul className="min-w-0 flex-1 space-y-1">
              {g.items.map((i) => (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => open(i.kind === "deadline" ? { type: "loop", id: i.refId } : { type: "event", id: i.id })}
                    className="flex w-full items-baseline justify-between gap-3 rounded-lg text-left hover:text-accent"
                  >
                    <span className="truncate text-[15px] text-ink">{i.title}</span>
                    <span className="shrink-0 text-[13.5px] text-ink-3">{i.detail}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
