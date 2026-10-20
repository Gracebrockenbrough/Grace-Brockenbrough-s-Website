/**
 * Return Workflow Service: submission adapters, one per capability level.
 *
 * The workflow never marks a return as submitted on its own. A request only moves past
 * "prepared" when the customer says they submitted it on the retailer's site, or when
 * an integrated adapter returns a retailer confirmation id.
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
  | { submitted: false; reason: "customer_completes_on_retailer_site" | "demo_mode" | "integration_unavailable"; message: string };

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

/**
 * Level 2: Orbit fills the retailer's form in an authorized session, and the customer
 * approves the final submission. The prototype has no authorized retailer sessions,
 * so it prepares the request and stops.
 */
export const assistedAdapter: ReturnSubmissionAdapter = {
  capability: "assisted",
  async submit() {
    return {
      submitted: false,
      reason: "demo_mode",
      message: "Preview mode: Orbit prepared your request but didn't send anything to the retailer.",
    };
  },
};

/** Level 3: authorized retailer integration (e.g. a platform return-request API). Not yet available. */
export const integratedAdapter: ReturnSubmissionAdapter = {
  capability: "integrated",
  async submit() {
    return { submitted: false, reason: "integration_unavailable", message: "This retailer's integration isn't available yet." };
  },
};

export function adapterFor(capability: ReturnCapability): ReturnSubmissionAdapter {
  return { guided: guidedAdapter, assisted: assistedAdapter, integrated: integratedAdapter }[capability];
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
