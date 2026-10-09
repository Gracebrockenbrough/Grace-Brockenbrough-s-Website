"use client";

import { AlertCircle, CalendarDays, GitCompareArrows, Telescope } from "lucide-react";
import { formatLongDate } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { Modal } from "@/components/ui/Overlay";
import { Button } from "@/components/ui/Button";
import { OrbitMark } from "@/components/shell/Logo";

/** A summary you can absorb in under 30 seconds. */
export function MorningBrief({ onClose }: { onClose: () => void }) {
  const { derived, dispatch } = useOrbit();
  const { open } = useUI();
  const { brief, today } = derived;

  const start = () => {
    dispatch({ type: "SET_BRIEF_SEEN", seen: true });
    onClose();
  };

  return (
    <Modal
      title={brief.greeting}
      onClose={start}
      eyebrow={
        <span className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-ink-3">
          <OrbitMark size={18} className="text-ink" /> Morning Brief · {formatLongDate(today)}
        </span>
      }
      footer={
        <Button variant="primary" size="lg" className="w-full" onClick={start} data-autofocus>
          Start my day
        </Button>
      }
    >
      <p className="text-[16.5px] text-ink-2">{brief.headline}</p>

      {brief.priorities.length > 0 && (
        <section className="mt-6" aria-labelledby="brief-priorities">
          <h3 id="brief-priorities" className="text-[14px] font-semibold uppercase tracking-wide text-ink-3">
            {brief.priorities.length} {brief.priorities.length === 1 ? "priority" : "priorities"}
          </h3>
          <ol className="mt-2 space-y-2">
            {brief.priorities.map((p, i) => (
              <li key={p.id} className="flex items-baseline gap-3 animate-rise-in" style={{ animationDelay: `${i * 70}ms` }}>
                <span className="w-4 shrink-0 text-[15px] font-semibold text-accent">{i + 1}</span>
                <span className="flex-1 text-[16px] font-medium text-ink">{p.title}</span>
                <span className="shrink-0 text-[14px] text-ink-3">{p.detail}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-6" aria-labelledby="brief-schedule">
        <h3 id="brief-schedule" className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wide text-ink-3">
          <CalendarDays size={15} aria-hidden /> Your schedule
        </h3>
        <ul className="mt-2 space-y-1 text-[15.5px] text-ink">
          {brief.schedule.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>

      {brief.watchOut && (
        <section className="mt-6 rounded-2xl bg-attention-soft px-4 py-3" aria-labelledby="brief-watch">
          <h3 id="brief-watch" className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wide text-attention">
            <AlertCircle size={15} aria-hidden /> Watch out
          </h3>
          <p className="mt-1 text-[15.5px] text-ink">{brief.watchOut}</p>
        </section>
      )}

      {brief.change && (
        <section className="mt-4 rounded-2xl border border-line px-4 py-3" aria-labelledby="brief-change">
          <h3 id="brief-change" className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wide text-ink-3">
            <GitCompareArrows size={15} aria-hidden /> Something changed
          </h3>
          <p className="mt-1 text-[15.5px] text-ink">{brief.change}</p>
          {derived.changes[0] && (
            <button
              type="button"
              onClick={() => {
                dispatch({ type: "SET_BRIEF_SEEN", seen: true });
                open({ type: "change", id: derived.changes.find((c) => c.confidence >= 0.8)?.id ?? derived.changes[0].id });
              }}
              className="mt-1 text-[14.5px] font-medium text-accent hover:underline"
            >
              Review change
            </button>
          )}
        </section>
      )}

      {brief.lookingAhead && (
        <section className="mt-6" aria-labelledby="brief-ahead">
          <h3 id="brief-ahead" className="flex items-center gap-2 text-[14px] font-semibold uppercase tracking-wide text-ink-3">
            <Telescope size={15} aria-hidden /> Looking ahead
          </h3>
          <p className="mt-1 text-[15.5px] text-ink">{brief.lookingAhead}</p>
        </section>
      )}
    </Modal>
  );
}
