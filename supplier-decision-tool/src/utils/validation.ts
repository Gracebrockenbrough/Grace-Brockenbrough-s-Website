// Friendly, non-technical validation rules for numeric inputs.

export interface NumberRule {
  min?: number;
  max?: number;
  /** Min is exclusive (value must be greater than min). */
  exclusiveMin?: boolean;
  integer?: boolean;
  message: string;
  /** Soft warning (value accepted) when above this threshold. */
  warnAbove?: number;
  warnMessage?: string;
}

export const RULES = {
  cost: { min: 0, message: 'Costs can’t be negative. Enter 0 if there is no charge, or mark it Unknown.' },
  price: { min: 0, exclusiveMin: true, message: 'Enter a unit price greater than zero.' },
  quantity: { min: 0, exclusiveMin: true, message: 'Quantity needs to be greater than zero.' },
  percent: { min: 0, max: 100, message: 'Enter a percentage between 0 and 100.' },
  onTime: { min: 0, max: 100, message: 'On-time delivery must be between 0% and 100%.' },
  defect: {
    min: 0,
    max: 100,
    message: 'Defect rate can’t be below 0% or above 100%.',
    warnAbove: 10,
    warnMessage: 'That is an unusually high defect rate — double-check it is a percentage (e.g. 0.65 for 0.65%).',
  },
  rating: { min: 1, max: 10, message: 'Use a rating from 1 (poor) to 10 (excellent).' },
  paymentDays: { min: 0, max: 365, message: 'Payment terms can’t be negative. Use 0 for payment due on receipt.' },
  days: { min: 0, max: 730, message: 'Enter a number of days between 0 and 730.' },
  months: { min: 0, max: 120, message: 'Enter a number of months between 0 and 120.' },
  years: { min: 0, max: 400, message: 'Years in business can’t be negative.' },
  count: { min: 0, integer: true, message: 'Enter a whole number of 0 or more.' },
  fx: { min: 0, exclusiveMin: true, message: 'Exchange rate must be greater than zero.' },
  positive: { min: 0, exclusiveMin: true, message: 'Enter a value greater than zero.' },
} satisfies Record<string, NumberRule>;

export const checkNumber = (value: number, rule?: NumberRule): { error?: string; warning?: string } => {
  if (!rule) return {};
  if (!Number.isFinite(value)) return { error: 'Please enter a number.' };
  if (rule.min != null && (rule.exclusiveMin ? value <= rule.min : value < rule.min)) return { error: rule.message };
  if (rule.max != null && value > rule.max) return { error: rule.message };
  if (rule.integer && !Number.isInteger(value)) return { error: rule.message };
  if (rule.warnAbove != null && value > rule.warnAbove) return { warning: rule.warnMessage };
  return {};
};

/** Parses "1,250,000", "$2.48", "12%" → number. Returns null for blank input. */
export const parseNumberInput = (raw: string): number | null | typeof NaN => {
  const cleaned = raw.replace(/[,$€£¥%\s]/g, '');
  if (cleaned === '') return null;
  const v = Number(cleaned);
  return v;
};
