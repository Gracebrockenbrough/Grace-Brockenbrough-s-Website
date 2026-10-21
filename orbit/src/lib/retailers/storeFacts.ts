/**
 * "Before You Buy": the return facts a shopper wants before purchasing, read only from
 * the policy record. Community opinion never becomes policy, and unknowns stay unknown.
 */
import { refundMethodLabel } from "../domain/format";
import type { ReturnPolicy, Retailer, StoreCategory } from "../domain/types";
import { money } from "../domain/format";

export interface StoreFact {
  label: string;
  value: string;
  known: boolean;
}

const startLabel = { delivery: "the day it arrives", purchase: "the day you buy", shipment: "the day it ships", unknown: "not stated" } as const;

export function beforeYouBuy(policy: ReturnPolicy | null): StoreFact[] {
  if (!policy) return [];
  const fee = (n: number | null) => (n == null ? "Not confirmed" : n === 0 ? "Free" : money(n));
  const finalSale = policy.exceptions.filter((e) => e.kind === "final_sale").map((e) => e.description);
  return [
    { label: "Return window", value: policy.windowDays ? `${policy.windowDays} days` : "Not confirmed", known: policy.windowDays != null },
    { label: "Window starts", value: startLabel[policy.windowStartsAt], known: policy.windowStartsAt !== "unknown" },
    { label: "Refund to original payment", value: policy.refundMethods.includes("original_payment") ? "Available" : "Not offered", known: true },
    { label: "Store credit", value: policy.refundMethods.includes("store_credit") ? (policy.refundMethods.length === 1 ? "Store credit only" : "Optional") : "Not offered", known: true },
    { label: "Mail return fee", value: fee(policy.fees.mail) + (policy.fees.waivedForStoreCredit ? " (free with store credit)" : ""), known: policy.fees.mail != null },
    { label: "In-store returns", value: policy.inStore.accepted === false ? "Not accepted" : policy.inStore.accepted ? fee(policy.fees.inStore) : "Not confirmed", known: policy.inStore.accepted != null },
    { label: "Label options", value: policy.shipping.qrCodeAvailable ? "QR code, no printer" : policy.shipping.printingRequired ? "Printed label" : "Not confirmed", known: policy.shipping.qrCodeAvailable === true || policy.shipping.printingRequired != null },
    { label: "Final sale", value: finalSale.length ? finalSale[0] : "No final-sale rule on file", known: true },
  ];
}

/** The one or two facts worth showing on a small store card. */
export function headlineFacts(policy: ReturnPolicy | null): string[] {
  if (!policy) return ["Return policy not on file"];
  const out: string[] = [];
  if (policy.windowDays) out.push(`${policy.windowDays}-day returns`);
  if (policy.fees.mail === 0) out.push("Free mail returns");
  else if (policy.refundMethods.includes("original_payment")) out.push("Refunds to card");
  return out.slice(0, 2);
}

export type StoreFilter = "all" | "clothing" | "beauty" | "home" | "accessories" | "free_returns" | "cash_refunds";

export const storeFilterLabel: Record<StoreFilter, string> = {
  all: "All",
  clothing: "Clothing",
  beauty: "Beauty",
  home: "Home",
  accessories: "Accessories",
  free_returns: "Free mail returns",
  cash_refunds: "Refunds to card",
};

const CATEGORY: Partial<Record<StoreFilter, StoreCategory[]>> = {
  clothing: ["fashion"],
  beauty: ["beauty"],
  home: ["home", "general"],
  accessories: ["accessories", "shoes"],
};

/** Filters only use facts we hold: the store's category and its policy record. */
export function matchesStoreFilter(r: Retailer, policy: ReturnPolicy | null, f: StoreFilter): boolean {
  if (f === "all") return true;
  if (f === "free_returns") return policy?.fees.mail === 0;
  if (f === "cash_refunds") return Boolean(policy?.refundMethods.includes("original_payment"));
  return CATEGORY[f]?.includes(r.category) ?? false;
}

export const storeCategoryLabel: Record<StoreCategory, string> = {
  fashion: "Clothing",
  beauty: "Beauty",
  shoes: "Shoes",
  accessories: "Accessories",
  home: "Home",
  general: "Everything store",
};

export { refundMethodLabel };
