"use client";

import { Link2 } from "lucide-react";
import { AREA_STYLE } from "@/lib/areas";
import { cn } from "@/lib/cn";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { ConnectionIcon } from "@/components/connections/ConnectionIcon";

/** ORBIT keeps asking (gently) so it can understand more of your life. */
export function KnowYouCard({ compact = false }: { compact?: boolean }) {
  const { derived, dispatch } = useOrbit();
  const { notify, open } = useUI();
  const { score, level, questions, connect } = derived.knowYou;
  const q = questions[0];
  const c = connect[0];
  const r = 26;
  const circ = 2 * Math.PI * r;

  return (
    <section aria-label="Help ORBIT know you" className="rounded-3xl border border-line bg-gradient-to-br from-surface to-space-2 p-5">
      <div className="flex items-center gap-4">
        <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0" aria-hidden>
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-sunken)" strokeWidth="6" />
          <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-accent)" strokeWidth="6" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - score / 100)} transform="rotate(-90 32 32)" className="transition-[stroke-dashoffset] duration-700" />
          <text x="32" y="37" textAnchor="middle" className="fill-ink text-[15px] font-semibold">{score}%</text>
        </svg>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-accent">Help ORBIT know you</p>
          <p className="font-display text-[20px] leading-snug">{level}</p>
          <p className="text-[14px] text-ink-3">The more ORBIT knows, the better it plans around your real life.</p>
        </div>
      </div>

      {q && (
        <div className="mt-5 rounded-2xl bg-sunken p-4">
          <p className="text-[15.5px] font-medium">
            <span className={cn("mr-2 inline-block h-2 w-2 rounded-full align-middle", AREA_STYLE[q.area].dot)} aria-hidden />
            {q.question}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {q.options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  dispatch({ type: "ANSWER_PROFILE", id: q.id, answer: o });
                  notify(`Got it. ${q.why}`, { undoable: true });
                }}
                className="min-h-9 rounded-full border border-line-strong bg-surface px-3.5 text-[14px] hover:border-accent"
              >
                {o}
              </button>
            ))}
          </div>
          {!compact && questions.length > 1 && <p className="mt-3 text-[13px] text-ink-3">{questions.length - 1} more quick questions after this one.</p>}
        </div>
      )}

      {c && (
        <button type="button" onClick={() => open({ type: "connect", id: c.source.id })} className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-dashed border-accent-line p-3 text-left hover:bg-accent-soft">
          <ConnectionIcon source={c.source} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">Connect {c.source.name}</span>
            <span className="block text-[13.5px] text-ink-3">{c.why}</span>
          </span>
          <Link2 size={16} className="shrink-0 text-accent" aria-hidden />
        </button>
      )}
    </section>
  );
}
