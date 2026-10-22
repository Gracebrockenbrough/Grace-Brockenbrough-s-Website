/**
 * Retailer compatibility registry: what Penny can and can't do with each store.
 *
 * The UI reads this instead of assuming. If a capability is "no", the feature isn't shown
 * as working. "partial" means it works from evidence the customer has (emails, receipts)
 * rather than from the retailer directly.
 */
import type { Retailer, ReturnCapability, ReturnPolicy } from "../domain/types";
import { MERCHANTS } from "../ingestion/merchants";

export type Support = "yes" | "partial" | "no";

export interface RetailerCapabilities {
  retailerId: string;
  detectPurchaseEmail: Support;
  extractItems: Support;
  identifyPolicy: Support;
  determineDeadline: Support;
  officialReturnLink: Support;
  retrieveExistingLabel: Support;
  guidedReturn: Support;
  /** Submitting a return for the customer. Needs an approved integration; "no" everywhere today. */
  approvedReturnSubmission: Support;
  /** "partial" = from the retailer's refund emails; never from a bank. */
  refundStatus: Support;
  /** Automatic balance checks need an issuer integration; "partial" = a link to check yourself. */
  verifyGiftCardBalance: Support;
  /** Buying a new gift card through a partner. "demo" = the clearly simulated flow only. */
  sendGift: "demo" | "no";
  returnLevel: ReturnCapability;
  emailFormats: string[];
  apis: string[];
  partnership: "none" | "exploring" | "partner";
  limitations: string[];
}

const OVERRIDES: Partial<Record<string, Partial<RetailerCapabilities>>> = {
  amazon: {
    emailFormats: ["Order confirmation", "Shipment", "Delivery", "Refund"],
    apis: [],
    limitations: [
      "No access to Amazon order history. Amazon's Selling Partner API is for sellers, not shoppers.",
      "Returns start on Amazon's Your Orders page. Penny never submits them.",
      "Third-party sellers can have different return terms.",
    ],
  },
};

export function capabilitiesOf(retailer: Retailer, policy: ReturnPolicy | null): RetailerCapabilities {
  const merchant = MERCHANTS.find((m) => m.retailerId === retailer.id);
  const known = Boolean(merchant);
  const base: RetailerCapabilities = {
    retailerId: retailer.id,
    detectPurchaseEmail: known ? "yes" : "partial",
    extractItems: merchant?.template ? "yes" : "partial",
    identifyPolicy: policy ? (policy.verification === "verified" ? "yes" : "partial") : "no",
    determineDeadline: policy?.windowDays ? "yes" : "no",
    officialReturnLink: retailer.returnsUrl ? (retailer.returnsUrl !== retailer.websiteUrl ? "yes" : "partial") : "no",
    retrieveExistingLabel: "partial",
    guidedReturn: retailer.returnsUrl || retailer.websiteUrl ? "yes" : "partial",
    approvedReturnSubmission: "no",
    refundStatus: "partial",
    verifyGiftCardBalance: retailer.balanceCheckUrl ? "partial" : "no",
    sendGift: retailer.giftPartner ? "demo" : "no",
    returnLevel: retailer.returnCapability,
    emailFormats: known ? ["Order confirmation", "Shipping", "Delivery", "Return", "Refund"] : [],
    apis: [],
    partnership: "none",
    limitations: [
      ...(policy?.verification === "sample" ? ["Return policy is a sample, not verified with the store."] : []),
      ...(!policy ? ["No return policy on file."] : []),
    ],
  };
  const o = OVERRIDES[retailer.id];
  return o ? { ...base, ...o, limitations: [...base.limitations, ...(o.limitations ?? [])] } : base;
}

export const capabilityRows: { key: keyof RetailerCapabilities; label: string; partial: string }[] = [
  { key: "detectPurchaseEmail", label: "Find purchases in your email", partial: "If you forward or paste them" },
  { key: "extractItems", label: "Read items and prices", partial: "Usually; you confirm anything unclear" },
  { key: "identifyPolicy", label: "Know the return policy", partial: "Sample policy, not verified" },
  { key: "determineDeadline", label: "Work out the return deadline", partial: "Estimated" },
  { key: "officialReturnLink", label: "Link to the official returns page", partial: "Links to the store's homepage" },
  { key: "retrieveExistingLabel", label: "Keep your return label or QR code", partial: "When it's in an email or you save it" },
  { key: "guidedReturn", label: "Guide you through the return", partial: "Basic guidance" },
  { key: "approvedReturnSubmission", label: "Submit the return for you", partial: "" },
  { key: "refundStatus", label: "Track the refund", partial: "From the store's emails, plus your confirmation" },
  { key: "verifyGiftCardBalance", label: "Check a gift card balance", partial: "Link to check it yourself" },
];

export function supportText(row: (typeof capabilityRows)[number], v: Support): string {
  return v === "yes" ? "Yes" : v === "no" ? "Not available" : row.partial;
}
