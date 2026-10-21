import type { CreditType, DropOffKind, Order, RefundMethod, ReturnCapability } from "./types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const usdWhole = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** "$180" for whole amounts, "$94.50" otherwise. Unknown amounts render as "Amount unknown". */
export function money(amount: number | null | undefined): string {
  if (amount == null) return "Amount unknown";
  return Number.isInteger(amount) ? usdWhole.format(amount) : usd.format(amount);
}

export function orderTotal(order: Order, itemIds?: string[]): number | null {
  const items = itemIds ? order.items.filter((i) => itemIds.includes(i.id)) : order.items;
  let total = 0;
  for (const i of items) {
    if (i.unitPrice == null) return null;
    total += i.unitPrice * i.quantity;
  }
  return Math.round(total * 100) / 100;
}

export const creditTypeLabel: Record<CreditType, string> = {
  purchased_gift_card: "Gift card",
  gift_received: "Gift received",
  return_credit: "Return credit",
  promotional_credit: "Promotional credit",
};

export const refundMethodLabel: Record<RefundMethod, string> = {
  original_payment: "Original payment method",
  store_credit: "Store credit",
  exchange: "Exchange",
};

export const dropOffLabel: Record<DropOffKind, string> = {
  ups: "UPS",
  usps: "USPS",
  fedex: "FedEx",
  store: "In store",
  happy_returns: "Happy Returns",
};

export const capabilityLabel: Record<ReturnCapability, { name: string; summary: string }> = {
  guided: {
    name: "Guided",
    summary: "Tote prepares your details and links you to the store. You finish on their site.",
  },
  assisted: {
    name: "Assisted",
    summary: "Tote prepares the request in the store's own process. You confirm and finish any protected steps.",
  },
  integrated: {
    name: "Integrated",
    summary: "Tote submits the return through the store's approved system, only after you approve it.",
  },
};

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
export function countWord(n: number): string {
  return words[n] ?? String(n);
}
