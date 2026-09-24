import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { TriState } from '../../types';
import { checkNumber, parseNumberInput, type NumberRule } from '../../utils/validation';
import { cx, InfoTip } from './primitives';

interface FieldShellProps {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  tooltip?: ReactNode;
  error?: string;
  warning?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export const FieldShell = ({ label, htmlFor, hint, tooltip, error, warning, required, className, children }: FieldShellProps) => (
  <div className={className}>
    <div className="mb-1 flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
        {label}
        {required && <span className="ml-0.5 text-risk" aria-hidden>*</span>}
      </label>
      {tooltip && <InfoTip text={tooltip} />}
    </div>
    {children}
    {error ? (
      <p className="mt-1 text-xs text-risk" role="alert">
        {error}
      </p>
    ) : warning ? (
      <p className="mt-1 text-xs text-caution">{warning}</p>
    ) : hint ? (
      <p className="mt-1 text-xs text-muted">{hint}</p>
    ) : null}
  </div>
);

const formatForInput = (v: number | null) => (v == null ? '' : String(v));

export interface NumberFieldProps {
  label: ReactNode;
  value: number | null;
  onChange: (v: number | null) => void;
  rule?: NumberRule;
  prefix?: string;
  suffix?: string;
  hint?: ReactNode;
  tooltip?: ReactNode;
  required?: boolean;
  allowUnknown?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * Numeric input where an empty value means "Unknown". Invalid input shows a
 * friendly message and is treated as Unknown until corrected, so stale values
 * never silently feed the analysis.
 */
export const NumberField = ({
  label,
  value,
  onChange,
  rule,
  prefix,
  suffix,
  hint,
  tooltip,
  required,
  allowUnknown = true,
  placeholder,
  className,
}: NumberFieldProps) => {
  const id = useId();
  const [text, setText] = useState(formatForInput(value));
  const [error, setError] = useState<string>();
  const [warning, setWarning] = useState<string>();
  const lastCommitted = useRef<number | null>(value);

  // Sync when the value changes from outside this input (e.g. loading the demo).
  useEffect(() => {
    if (value !== lastCommitted.current) {
      lastCommitted.current = value;
      setText(formatForInput(value));
      setError(undefined);
      setWarning(undefined);
    }
  }, [value]);

  const emit = (v: number | null) => {
    lastCommitted.current = v;
    onChange(v);
  };

  const commit = (raw: string) => {
    setText(raw);
    const parsed = parseNumberInput(raw);
    if (parsed === null) {
      setError(required ? 'This field is required.' : undefined);
      setWarning(undefined);
      emit(null);
      return;
    }
    if (Number.isNaN(parsed)) {
      setError('Please enter a number, for example 2.48 or 38,000.');
      emit(null);
      return;
    }
    const res = checkNumber(parsed, rule);
    setError(res.error);
    setWarning(res.warning);
    emit(res.error ? null : parsed);
  };

  const isUnknown = value == null && text === '';
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} tooltip={tooltip} error={error} warning={warning} required={required} className={className}>
      <div className="relative flex items-center">
        {prefix && <span className="pointer-events-none absolute left-3 text-sm text-muted">{prefix}</span>}
        <input
          id={id}
          inputMode="decimal"
          className={cx('input tabular', prefix && 'pl-7', (suffix || (allowUnknown && !isUnknown)) && 'pr-16', error && 'input-error')}
          value={text}
          placeholder={placeholder ?? (required ? 'Required' : allowUnknown ? 'Unknown' : '')}
          aria-invalid={!!error}
          onChange={(e) => commit(e.target.value)}
        />
        <span className="absolute right-2 flex items-center gap-1">
          {suffix && <span className="pointer-events-none text-xs text-muted">{suffix}</span>}
          {allowUnknown && !required && !isUnknown && (
            <button
              type="button"
              title="Mark as unknown"
              aria-label="Clear value and mark as unknown"
              className="rounded px-1 text-xs text-muted hover:bg-subtle hover:text-ink"
              onClick={() => commit('')}
            >
              ×
            </button>
          )}
        </span>
      </div>
    </FieldShell>
  );
};

export const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  hint,
  tooltip,
  required,
  type = 'text',
  className,
  error,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  tooltip?: ReactNode;
  required?: boolean;
  type?: 'text' | 'date';
  className?: string;
  error?: string;
}) => {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} tooltip={tooltip} required={required} className={className} error={error}>
      <input id={id} type={type} className={cx('input', error && 'input-error')} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </FieldShell>
  );
};

export const TextAreaField = ({
  label,
  value,
  onChange,
  placeholder,
  hint,
  tooltip,
  rows = 3,
  className,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  tooltip?: ReactNode;
  rows?: number;
  className?: string;
}) => {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} tooltip={tooltip} className={className}>
      <textarea id={id} rows={rows} className="input resize-y" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </FieldShell>
  );
};

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
  tooltip,
  className,
}: {
  label: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: ReactNode;
  tooltip?: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <FieldShell label={label} htmlFor={id} hint={hint} tooltip={tooltip} className={className}>
      <select id={id} className="input pr-8" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; title?: string }[];
  ariaLabel: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-subtle p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-md font-medium transition-colors',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            o.value === value ? 'bg-white text-navy shadow-sm ring-1 ring-line' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const TRI_OPTIONS: { value: TriState; label: string }[] = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' },
];

export const TriStateField = ({
  label,
  value,
  onChange,
  tooltip,
  className,
}: {
  label: ReactNode;
  value: TriState;
  onChange: (v: TriState) => void;
  tooltip?: ReactNode;
  className?: string;
}) => (
  <FieldShell label={label} tooltip={tooltip} className={className}>
    <Segmented value={value} onChange={onChange} options={TRI_OPTIONS} ariaLabel={typeof label === 'string' ? label : 'Choice'} size="sm" />
  </FieldShell>
);
