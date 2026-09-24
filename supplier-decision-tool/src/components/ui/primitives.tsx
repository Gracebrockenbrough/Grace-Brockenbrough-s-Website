import { useId, useState, type ReactNode } from 'react';

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

export const Card = ({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) => (
  <As className={cx('card', className)}>{children}</As>
);

export const CardHeader = ({ title, subtitle, action, eyebrow }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; eyebrow?: string }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
    <div className="min-w-0">
      {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
    </div>
    {action}
  </div>
);

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export const Button = ({
  children,
  variant = 'secondary',
  size = 'md',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: 'sm' | 'md' }) => (
  <button
    type="button"
    className={cx(
      'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm',
      variant === 'primary' && 'bg-navy text-white hover:bg-navy-2',
      variant === 'secondary' && 'border border-line-strong bg-white text-ink hover:bg-subtle',
      variant === 'ghost' && 'text-ink-2 hover:bg-subtle',
      variant === 'danger' && 'text-risk hover:bg-risk-soft',
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

export type Tone = 'neutral' | 'good' | 'caution' | 'risk' | 'accent' | 'navy';
const toneClasses: Record<Tone, string> = {
  neutral: 'bg-subtle text-ink-2 border-line',
  good: 'bg-good-soft text-good border-good/20',
  caution: 'bg-caution-soft text-caution border-caution/25',
  risk: 'bg-risk-soft text-risk border-risk/20',
  accent: 'bg-accent-soft text-accent border-accent/20',
  navy: 'bg-navy text-white border-navy',
};

export const Badge = ({ children, tone = 'neutral', className }: { children: ReactNode; tone?: Tone; className?: string }) => (
  <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', toneClasses[tone], className)}>
    {children}
  </span>
);

export const FictionalBadge = () => <Badge tone="caution">FICTIONAL TEST EXAMPLE</Badge>;

/** Accessible hover/focus/tap tooltip. */
export const InfoTip = ({ text, label = 'More information' }: { text: ReactNode; label?: string }) => {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={open ? id : undefined}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-line-strong text-[10px] font-semibold leading-none text-muted hover:border-accent hover:text-accent"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          id={id}
          className="absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-md bg-ink px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-white shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
};

export const Collapsible = ({
  title,
  subtitle,
  children,
  defaultOpen = false,
  badge,
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: ReactNode;
  className?: string;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={cx('card', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-navy">
            {title}
            {badge}
          </span>
          {subtitle && <span className="mt-0.5 block text-xs text-muted">{subtitle}</span>}
        </span>
        <svg className={cx('h-4 w-4 shrink-0 text-muted transition-transform', open && 'rotate-180')} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div id={id} className="border-t border-line px-5 py-4">
          {children}
        </div>
      )}
    </div>
  );
};

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  size = 'md',
}: {
  tabs: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="tablist" className={cx('flex gap-1 overflow-x-auto rounded-lg bg-subtle p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          type="button"
          aria-selected={t.value === value}
          onClick={() => onChange(t.value)}
          className={cx(
            'shrink-0 whitespace-nowrap rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            t.value === value ? 'bg-white text-navy shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export const scoreTone = (score: number): Tone => (score >= 75 ? 'good' : score >= 55 ? 'caution' : 'risk');

/** Horizontal 0–100 bar. Color carries meaning (good / caution / risk) and the number is always shown. */
export const ScoreBar = ({ score, showValue = true, className }: { score: number; showValue?: boolean; className?: string }) => {
  const tone = scoreTone(score);
  const fill = tone === 'good' ? 'bg-good' : tone === 'caution' ? 'bg-[#c98a00]' : 'bg-risk';
  const track = tone === 'good' ? 'bg-good-soft' : tone === 'caution' ? 'bg-caution-soft' : 'bg-risk-soft';
  return (
    <div className={cx('flex items-center gap-2', className)}>
      <div className={cx('h-1.5 flex-1 overflow-hidden rounded-full', track)} role="meter" aria-valuenow={Math.round(score)} aria-valuemin={0} aria-valuemax={100}>
        <div className={cx('h-full rounded-full', fill)} style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />
      </div>
      {showValue && <span className="tabular w-7 text-right text-xs font-semibold text-ink-2">{Math.round(score)}</span>}
    </div>
  );
};

export const Stat = ({ label, value, sub, emphasis = false }: { label: ReactNode; value: ReactNode; sub?: ReactNode; emphasis?: boolean }) => (
  <div>
    <div className="eyebrow">{label}</div>
    <div className={cx('tabular mt-1 font-semibold text-navy', emphasis ? 'text-3xl' : 'text-xl')}>{value}</div>
    {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
  </div>
);

export const Callout = ({ tone = 'neutral', title, children, className }: { tone?: Tone; title?: ReactNode; children: ReactNode; className?: string }) => {
  const cls: Record<Tone, string> = {
    neutral: 'border-line bg-subtle text-ink-2',
    good: 'border-good/25 bg-good-soft text-ink',
    caution: 'border-caution/30 bg-caution-soft text-ink',
    risk: 'border-risk/25 bg-risk-soft text-ink',
    accent: 'border-accent/25 bg-accent-soft text-ink',
    navy: 'border-navy bg-navy text-white',
  };
  return (
    <div className={cx('rounded-lg border px-4 py-3 text-sm', cls[tone], className)}>
      {title && <div className="mb-1 font-semibold">{title}</div>}
      {children}
    </div>
  );
};

export const Icon = {
  check: (cls = 'h-4 w-4') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0l-3.5-3.5a1 1 0 111.4-1.4l2.8 2.79 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
    </svg>
  ),
  warn: (cls = 'h-4 w-4') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M8.26 3.1c.77-1.33 2.7-1.33 3.47 0l6.02 10.4c.77 1.33-.19 3-1.73 3H3.97c-1.54 0-2.5-1.67-1.73-3L8.26 3.1zM10 7a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 7zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
  ),
  minus: (cls = 'h-4 w-4') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
    </svg>
  ),
  plus: (cls = 'h-4 w-4') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
    </svg>
  ),
  arrow: (cls = 'h-4 w-4') => (
    <svg className={cls} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.64l-4.2-3.96a.75.75 0 111.02-1.1l5.5 5.25a.75.75 0 010 1.1l-5.5 5.25a.75.75 0 11-1.02-1.1l4.2-3.94H3.75A.75.75 0 013 10z" clipRule="evenodd" />
    </svg>
  ),
};
