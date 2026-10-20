/**
 * Wallet Service: balance verification.
 *
 * Most retailers offer no balance API to third parties, so stored balances are
 * "last known" unless an authorized checker confirms them. The UI always shows
 * which one it is.
 */
import type { BalanceStatus, WalletItem } from "../domain/types";

export interface BalanceChecker {
  readonly retailerId: string;
  check(item: WalletItem): Promise<{ balance: number; status: BalanceStatus }>;
}

/** No authorized balance checkers exist yet. */
export const balanceCheckers: BalanceChecker[] = [];

/** Balances not verified in this many days get an "unverified" notice. */
export const BALANCE_FRESH_DAYS = 30;

export function needsVerification(item: WalletItem, daysSince: (ts: string) => number): boolean {
  const s = item.balanceStatus;
  if (s.kind === "unknown") return true;
  if (s.kind === "verified") return daysSince(s.at) > BALANCE_FRESH_DAYS;
  return true;
}
