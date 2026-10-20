import { cn } from "./cn";

/** Compact progress indicator for multi-step flows. */
export function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div>
      <p className="sr-only">
        Step {current + 1} of {steps.length}: {steps[current]}
      </p>
      <ol aria-hidden className="flex gap-1.5">
        {steps.map((s, i) => (
          <li key={s} className={cn("h-1 flex-1 rounded-full transition-colors", i <= current ? "bg-navy" : "bg-line")} />
        ))}
      </ol>
      <p aria-hidden className="mt-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">
        Step {current + 1} of {steps.length} · {steps[current]}
      </p>
    </div>
  );
}
