const currencyFormatters = new Map<string, Intl.NumberFormat>();

const currencyFormatter = (currency: string, digits: number): Intl.NumberFormat => {
  const key = `${currency}:${digits}`;
  let f = currencyFormatters.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    } catch {
      f = new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
    }
    currencyFormatters.set(key, f);
  }
  return f;
};

/** $1,290,000 */
export const money = (value: number | null | undefined, currency = 'USD'): string =>
  value == null || !Number.isFinite(value) ? '—' : currencyFormatter(currency, 0).format(Math.round(value));

/** $2.48 (unit prices keep cents; sub-dollar prices keep up to 4 decimals). */
export const unitMoney = (value: number | null | undefined, currency = 'USD'): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  const digits = Math.abs(value) < 1 ? 4 : 2;
  return currencyFormatter(currency, digits).format(value);
};

/** $1.29M / $72K */
export const compactMoney = (value: number | null | undefined, currency = 'USD'): string => {
  if (value == null || !Number.isFinite(value)) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: Math.abs(value) >= 1_000_000 ? 2 : 0,
    }).format(value);
  } catch {
    return money(value, currency);
  }
};

export const num = (value: number | null | undefined, digits = 0): string =>
  value == null || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);

export const pct = (value: number | null | undefined, digits = 1): string =>
  value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(digits)}%`;

/** Defect rates are small numbers: 0.15% */
export const defectPct = (value: number | null | undefined): string =>
  value == null || !Number.isFinite(value) ? '—' : `${value < 1 ? value.toFixed(2) : value.toFixed(2)}%`;

export const days = (value: number | null | undefined): string =>
  value == null || !Number.isFinite(value) ? '—' : `${num(value, 1)} day${value === 1 ? '' : 's'}`;

export const netTerms = (value: number | null | undefined): string =>
  value == null || !Number.isFinite(value) ? 'Unknown' : value === 0 ? 'Due on receipt' : `Net ${value}`;

export const months = (value: number | null | undefined): string =>
  value == null || !Number.isFinite(value) ? 'Unknown' : `${num(value)} month${value === 1 ? '' : 's'}`;

export const signedMoney = (value: number, currency = 'USD'): string =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${money(Math.abs(value), currency)}`;

/** "A, B and C" */
export const joinList = (items: string[]): string => {
  if (items.length <= 1) return items.join('');
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
};

export const capitalize = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Strip a trailing "s" for unit phrasing ("per lb"). */
export const singularUnit = (unit: string): string => {
  const u = unit.trim();
  if (!u) return 'unit';
  if (/^(lbs)$/i.test(u)) return 'lb';
  if (/^(units|kilograms|pounds|tons|tonnes|meters|metres|liters|litres|gallons|pieces|rolls|pallets|bags)$/i.test(u))
    return u.replace(/s$/i, '');
  return u;
};

/** "Apex Metals'" / "National Alloy Supply's" */
export const possessive = (name: string): string => (/s$/i.test(name.trim()) ? `${name}'` : `${name}'s`);

/** "a 12-month" / "an 18-month" */
export const article = (n: number): string => {
  const s = String(Math.round(n));
  return /^8/.test(s) || s === '11' || s === '18' ? 'an' : 'a';
};
