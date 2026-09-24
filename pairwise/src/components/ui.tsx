// Small reusable building blocks: buttons, cards, pills, sections, modal, drawer, toast, empty states.
import { ChevronDown, X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react';

export const cx = (...xs: (string | false | null | undefined)[]) => xs.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet' | 'danger';
export const Button = ({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) => (
  <button
    type="button"
    className={cx(
      'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
      size === 'sm' && 'min-h-9 px-3.5 text-sm',
      size === 'md' && 'min-h-11 px-5 text-[15px]',
      size === 'lg' && 'min-h-12 px-6 text-base',
      variant === 'primary' && 'bg-accent text-on-accent hover:bg-accent-strong',
      variant === 'secondary' && 'border border-line bg-surface text-heading hover:border-accent/40 hover:bg-soft',
      variant === 'ghost' && 'text-accent hover:bg-soft',
      variant === 'quiet' && 'text-muted hover:bg-soft hover:text-heading',
      variant === 'danger' && 'border border-red-200 bg-white text-red-700 hover:bg-red-50',
      className,
    )}
    {...rest}
  >
    {children}
  </button>
);

/** Status pill — always icon/dot + text, never color alone. */
export const StatusPill = ({ tone, children }: { tone: 'on' | 'soft' | 'off' | 'warn'; children: ReactNode }) => (
  <span
    className={cx(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
      tone === 'on' && 'bg-accent text-on-accent',
      tone === 'soft' && 'bg-soft text-accent-strong',
      tone === 'off' && 'bg-stone-100 text-stone-600',
      tone === 'warn' && 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
    )}
  >
    <span
      aria-hidden
      className={cx('h-1.5 w-1.5 rounded-full', tone === 'on' ? 'bg-white' : tone === 'soft' ? 'bg-accent' : tone === 'warn' ? 'bg-amber-500' : 'border border-stone-400')}
    />
    {children}
  </span>
);

export const ExpandableSection = ({
  title,
  children,
  defaultOpen = false,
  icon,
  hint,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  icon?: ReactNode;
  hint?: ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="border-b border-line last:border-0">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 py-4 text-left">
        {icon && <span className="text-accent">{icon}</span>}
        <span className="flex-1">
          <span className="block text-[15px] font-semibold text-heading">{title}</span>
          {hint && !open && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
        </span>
        <ChevronDown className={cx('h-5 w-5 text-muted transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div id={id} className="rise pb-5 text-[15px] leading-relaxed text-ink">
          {children}
        </div>
      )}
    </section>
  );
};

const useEscape = (onClose: () => void) => {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
};

const useFocusFirst = (ref: React.RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('button, input, textarea, select, [tabindex]')?.focus();
    return () => prev?.focus?.();
  }, [ref]);
};

export const Modal = ({ title, onClose, children, footer, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) => {
  useEscape(onClose);
  const ref = useRef<HTMLDivElement>(null);
  useFocusFirst(ref);
  const id = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className={cx('rise flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-surface shadow-2xl sm:rounded-3xl', wide ? 'sm:max-w-2xl' : 'sm:max-w-lg')}>
        <div className="flex items-center justify-between gap-4 px-6 pt-5 pb-3">
          <h2 id={id} className="text-lg font-bold text-heading">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-soft">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
};

export const Drawer = ({ title, subtitle, onClose, children }: { title: ReactNode; subtitle?: ReactNode; onClose: () => void; children: ReactNode }) => {
  useEscape(onClose);
  const ref = useRef<HTMLDivElement>(null);
  useFocusFirst(ref);
  const id = useId();
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/25" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={id} className="flex h-full w-full max-w-xl flex-col bg-bg shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line bg-surface px-6 pt-[calc(env(safe-area-inset-top,0px)+20px)] pb-4">
          <div>
            <h2 id={id} className="text-xl font-bold text-heading">
              {title}
            </h2>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-2 text-muted hover:bg-soft">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

// ---------- Toast ----------
interface ToastItem {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}
const ToastCtx = createContext<(text: string, action?: ToastItem['action']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((text: string, action?: ToastItem['action']) => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs.slice(-2), { id, text, action }]);
    window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+84px)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6">
        {items.map((t) => (
          <div key={t.id} className="rise pointer-events-auto flex items-center gap-4 rounded-full bg-[#1d2227] px-5 py-3 text-sm text-white shadow-xl">
            <span>{t.text}</span>
            {t.action && (
              <button
                type="button"
                className="font-semibold text-white underline underline-offset-2"
                onClick={() => {
                  t.action!.run();
                  setItems((xs) => xs.filter((x) => x.id !== t.id));
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

/** Row of mutually exclusive choice chips (e.g. Yes / Maybe / No). */
export function ConfirmationChips<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string; icon?: ReactNode }[];
  value?: T | null;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex min-h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors',
            value === o.value ? 'border-accent bg-accent text-on-accent' : 'border-line bg-surface text-heading hover:border-accent/50 hover:bg-soft',
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const EmptyState = ({ title, body, actions, icon }: { title: string; body?: ReactNode; actions?: ReactNode; icon?: ReactNode }) => (
  <div className="card flex flex-col items-center px-6 py-12 text-center">
    {icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-soft text-accent">{icon}</div>}
    <h3 className="max-w-md text-lg font-semibold text-heading">{title}</h3>
    {body && <p className="mt-2 max-w-md text-[15px] text-muted">{body}</p>}
    {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
  </div>
);

export const Spinner = ({ label }: { label: string }) => (
  <p className="flex items-center gap-3 text-[15px] text-muted" role="status">
    <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" aria-hidden />
    {label}
  </p>
);

export const Toggle = ({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) => {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-6 py-4">
      <div>
        <label htmlFor={id} className="block text-[15px] font-semibold text-heading">
          {label}
        </label>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-stone-300')}
      >
        <span className={cx('absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform', checked && 'translate-x-5')} />
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  );
};
