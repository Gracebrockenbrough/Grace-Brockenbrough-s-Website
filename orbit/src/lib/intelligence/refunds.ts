/**
 * Refund Asker (pure logic). Follows a refund from the return to the money arriving,
 * using only retailer messages and the customer's own answers. Never a bank connection.
 */
import { addDays, daysBetween } from "../domain/dates";
import type { DateOnly, Refund, ReturnRequest } from "../domain/types";

export type RefundAskerStatus =
  | "return_in_progress" // 1
  | "return_received" // 2
  | "refund_pending" // 3
  | "refund_issued" // 4: the retailer says it's issued; too soon to ask
  | "needs_check" // 5: time to ask the customer
  | "confirmed_received" // 6
  | "reported_missing" // 7
  | "resolved"; // 8

export const askerLabel: Record<RefundAskerStatus, string> = {
  return_in_progress: "Return in progress",
  return_received: "Return received",
  refund_pending: "Refund pending",
  refund_issued: "Refund issued by the store",
  needs_check: "Check that it arrived",
  confirmed_received: "You confirmed it arrived",
  reported_missing: "Reported missing",
  resolved: "Resolved",
};

/** Banks usually need a couple of days after the store issues a card refund. */
export const ASK_AFTER_DAYS = 2;

export function refundAskerStatus(f: Refund, r: ReturnRequest | null, today: DateOnly): RefundAskerStatus {
  if (f.asker?.resolvedAt) return "resolved";
  if (f.asker?.answer === "missing") return "reported_missing";
  if (f.arrivedAt || f.confirmed?.by === "customer") return "confirmed_received";
  if (f.confirmed) {
    // Store credit lands in the wallet the moment it's issued; nothing to check at a bank.
    if (f.destination === "store_credit") return "confirmed_received";
    const snoozed = f.asker?.remindOn && f.asker.remindOn > today;
    if (snoozed || daysBetween(f.confirmed.at, today) < ASK_AFTER_DAYS) return "refund_issued";
    return "needs_check";
  }
  if (r && (r.status === "received" || r.status === "completed")) return f.expected ? "refund_pending" : "return_received";
  if (r && r.status !== "cancelled") return "return_in_progress";
  return "refund_pending";
}

/** The question to ask, in plain words. null when there's nothing to ask. */
export function askerPrompt(f: Refund, retailerName: string, status: RefundAskerStatus): { title: string; body: string } | null {
  if (status !== "needs_check" || !f.confirmed) return null;
  const where = f.destinationLabel ?? "your original payment method";
  return {
    title: `${retailerName} says your ${moneyText(f.confirmed.amount)} refund was issued.`,
    body: `Have you checked whether it arrived on ${where}?`,
  };
}

const moneyText = (n: number) => `$${n.toFixed(2).replace(/\.00$/, "")}`;

/** When a snoozed question comes back. */
export const remindOnFor = (answer: "not_yet" | "later", today: DateOnly) => addDays(today, answer === "not_yet" ? 3 : 1);
