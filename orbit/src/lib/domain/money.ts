/**
 * Money-safe arithmetic. Amounts are stored as decimal dollars for readability, but every
 * sum, difference and product goes through integer cents so 0.1 + 0.2 is 0.30, not
 * 0.30000000000000004. The database stores `numeric(12,2)`, never floating point.
 */

/** Dollars → integer cents. Rounds half away from zero at the third decimal. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount)) throw new RangeError(`Not a money amount: ${amount}`);
  return Math.sign(amount) * Math.round(Math.abs(amount) * 100 + 1e-6);
}

export const fromCents = (cents: number): number => cents / 100;

/** Sum of amounts; null and undefined values are skipped (unknown is not zero, so callers decide). */
export function sumMoney(values: readonly (number | null | undefined)[]): number {
  return fromCents(values.reduce<number>((s, v) => s + (v == null ? 0 : toCents(v)), 0));
}

export const addMoney = (a: number, b: number): number => fromCents(toCents(a) + toCents(b));
export const subMoney = (a: number, b: number): number => fromCents(toCents(a) - toCents(b));

/** Unit price × quantity. */
export const mulMoney = (amount: number, qty: number): number => fromCents(Math.round(toCents(amount) * qty));

/** Splits a total into `n` parts that add back up exactly (the first parts take the extra cents). */
export function splitMoney(total: number, n: number): number[] {
  const cents = toCents(total);
  const base = Math.trunc(cents / n);
  const extra = cents - base * n;
  return Array.from({ length: n }, (_, i) => fromCents(base + (i < extra ? 1 : 0)));
}

/** True when two amounts are the same to the cent. */
export const sameMoney = (a: number, b: number): boolean => toCents(a) === toCents(b);
