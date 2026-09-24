import { cx, Icon } from './ui/primitives';

export const STEPS = [
  { title: 'Define the Purchase', short: 'Purchase' },
  { title: 'Define Priorities', short: 'Priorities' },
  { title: 'Enter Supplier Quotes', short: 'Quotes' },
  { title: 'Compare Suppliers', short: 'Compare' },
  { title: 'View Recommendation', short: 'Recommendation' },
  { title: 'Negotiation Opportunities', short: 'Negotiate' },
];

export const ProgressSteps = ({
  current,
  onSelect,
  isEnabled,
}: {
  current: number;
  onSelect: (i: number) => void;
  isEnabled: (i: number) => boolean;
}) => (
  <nav aria-label="Progress" className="no-print">
    <div className="mb-2 flex items-center justify-between text-xs text-muted sm:hidden">
      <span>
        Step {current + 1} of {STEPS.length}
      </span>
      <span className="font-medium text-navy">{STEPS[current].title}</span>
    </div>
    <div className="h-1 overflow-hidden rounded-full bg-line sm:hidden">
      <div className="h-full bg-navy transition-all" style={{ width: `${((current + 1) / STEPS.length) * 100}%` }} />
    </div>
    <ol className="hidden items-center sm:flex">
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const enabled = isEnabled(i);
        return (
          <li key={step.title} className={cx('flex items-center', i < STEPS.length - 1 && 'flex-1')}>
            <button
              type="button"
              disabled={!enabled}
              onClick={() => onSelect(i)}
              aria-current={active ? 'step' : undefined}
              className={cx('group flex items-center gap-2 rounded-md py-1 pr-2 text-left disabled:cursor-not-allowed')}
            >
              <span
                className={cx(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors',
                  active && 'border-navy bg-navy text-white',
                  done && 'border-navy/30 bg-accent-soft text-navy',
                  !active && !done && 'border-line-strong bg-white text-muted',
                  enabled && !active && 'group-hover:border-navy',
                )}
              >
                {done ? Icon.check('h-3.5 w-3.5') : i + 1}
              </span>
              <span className={cx('hidden text-[13px] leading-tight lg:block', active ? 'font-semibold text-navy' : enabled ? 'text-ink-2' : 'text-muted')}>
                {step.title}
              </span>
              <span className={cx('text-[13px] leading-tight lg:hidden', active ? 'font-semibold text-navy' : 'hidden')}>{step.short}</span>
            </button>
            {i < STEPS.length - 1 && <span className={cx('mx-2 h-px flex-1', i < current ? 'bg-navy/40' : 'bg-line-strong')} aria-hidden />}
          </li>
        );
      })}
    </ol>
  </nav>
);
