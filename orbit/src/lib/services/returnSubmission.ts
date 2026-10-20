/**
 * Return Workflow Service: submission adapters, one per capability level.
 *
 * Orbit is read-only: it never submits a return. A request only moves past "prepared"
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
  | { submitted: false; reason: "customer_completes_on_retailer_site"; message: string };

export interface ReturnSubmissionAdapter {
  readonly capability: ReturnCapability;
  /** Requires explicit customer approval; callers must pass the approval timestamp. */
  submit(request: ReturnRequest, details: PreparedReturnDetails, approvedAt: string): Promise<SubmissionResult>;
}

/** Level 1: Orbit prepares; the customer submits on the retailer's site. */
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

export function adapterFor(_capability: ReturnCapability): ReturnSubmissionAdapter {
  return guidedAdapter;
}

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
