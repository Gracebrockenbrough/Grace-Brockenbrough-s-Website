"use client";

import { ChevronRight } from "lucide-react";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { ConnectionIcon } from "@/components/connections/ConnectionIcon";

/** Orbit keeps asking, gently, so it understands more of your life. One question at a time. */
export function KnowYouCard() {
  const { derived, dispatch, state } = useOrbit();
  const { notify, open } = useUI();
  const { score, questions, connect } = derived.knowYou;
  const q = questions[0];
  // Connections are simulated, so real accounts aren't offered them yet.
  const c = state.mode === "live" ? undefined : connect[0];
  if (!q && !c) return null;

  return (
    <section aria-labelledby="know-you" className="rounded-2xl bg-surface p-4 shadow-card">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="know-you" className="text-[15px] font-semibold">Help Orbit know you</h2>
        <span className="text-[13.5px] tabular-nums text-ink-3">{score}%</span>
      </div>
      <span className="mt-2 block h-1 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100} aria-label="How well Orbit knows you">
        <span className="block h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${score}%` }} />
      </span>

      {q && (
        <div className="mt-4">
          <p className="text-[15.5px]">{q.question}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {q.options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => {
                  dispatch({ type: "ANSWER_PROFILE", id: q.id, answer: o });
                  notify(`Got it. ${q.why}`, { undoable: true });
                }}
                className="min-h-9 rounded-full bg-sunken px-3.5 text-[14px] hover:bg-line"
              >
                {o}
              </button>
            ))}
          </div>
        </div>
      )}

      {c && (
        <button type="button" onClick={() => open({ type: "connect", id: c.source.id })} className="mt-4 flex w-full items-center gap-3 border-t border-line pt-3.5 text-left">
          <ConnectionIcon source={c.source} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-medium">Connect {c.source.name}</span>
            <span className="block truncate text-[13.5px] text-ink-3">{c.why}</span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-ink-3" aria-hidden />
        </button>
      )}
    </section>
  );
}
