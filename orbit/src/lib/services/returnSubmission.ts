/**
 * Return Workflow Service: submission adapters, one per capability level.
 *
 * Penny is read-only: it never submits a return. A request only moves past "prepared"
 * when the customer says they submitted it on the retailer's site, and only becomes
 * "confirmed" when the retailer's own email arrives.
 */
import type { Order, Retailer, ReturnCapability, ReturnRequest } from "../domain/types";

export interface PreparedReturnDetails {
  orderNumber: string | null;
  email: string;
  items: { name: string; variant: string | null; quantity: number }[];
  reason: string | null;
  refundPreference: string | null;
  dropOff: string | null;
}

export type SubmissionResult =
  | { submitted: true; retailerConfirmationId: string }
  | { submitted: false; reason: "customer_completes_on_retailer_site" | "integration_unavailable" | "approval_missing"; message: string };

export interface ReturnSubmissionAdapter {
  readonly capability: ReturnCapability;
  /** Requires explicit customer approval; callers must pass the approval timestamp. */
  submit(request: ReturnRequest, details: PreparedReturnDetails, approvedAt: string): Promise<SubmissionResult>;
}

/** Level 1: Penny prepares; the customer submits on the retailer's site. */
export const guidedAdapter: ReturnSubmissionAdapter = {
  capability: "guided",
  async submit(_r, _d, _approvedAt) {
    return {
      submitted: false,
      reason: "customer_completes_on_retailer_site",
      message: "Finish on the retailer's site using the details below.",
    };
  },
};

/**
 * Level 2: prepares the request inside an authorized customer workflow (for example a
 * retailer's customer-account API) and hands the protected steps to the customer.
 * Not connected to any retailer yet, so it reports that honestly.
 */
export const assistedAdapter: ReturnSubmissionAdapter = {
  capability: "assisted",
  async submit(_r, _d, approvedAt) {
    if (!approvedAt) return { submitted: false, reason: "approval_missing", message: "You need to approve this return first." };
    return { submitted: false, reason: "integration_unavailable", message: "Assisted returns aren't available for this store yet." };
  },
};

/**
 * Level 3: submits through an approved retailer API after explicit approval. Requires a
 * partnership agreement and credentials held server-side. None exist yet.
 */
export const integratedAdapter: ReturnSubmissionAdapter = {
  capability: "integrated",
  async submit(_r, _d, approvedAt) {
    if (!approvedAt) return { submitted: false, reason: "approval_missing", message: "You need to approve this return first." };
    return { submitted: false, reason: "integration_unavailable", message: "This store isn't connected to Penny, so the return wasn't submitted." };
  },
};

export function adapterFor(capability: ReturnCapability): ReturnSubmissionAdapter {
  return capability === "integrated" ? integratedAdapter : capability === "assisted" ? assistedAdapter : guidedAdapter;
}

/**
 * Placeholder for an officially authorized Amazon returns integration, should one ever be
 * offered. Until then Amazon returns are guided: Penny links to Your Orders and never
 * automates amazon.com.
 */
export const amazonReturnsAdapter: ReturnSubmissionAdapter = { ...integratedAdapter };

export function prepareDetails(order: Order, request: Pick<ReturnRequest, "itemIds" | "reason" | "refundPreference" | "dropOff">, email: string): PreparedReturnDetails {
  return {
    orderNumber: order.orderNumber,
    email,
    items: order.items.filter((i) => request.itemIds.includes(i.id)).map((i) => ({ name: i.name, variant: i.variant, quantity: i.quantity })),
    reason: request.reason,
    refundPreference: request.refundPreference,
    dropOff: request.dropOff,
  };
}

export function retailerHasPortal(r: Retailer): boolean {
  return Boolean(r.returnsUrl);
}
