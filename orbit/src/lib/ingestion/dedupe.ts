/**
 * Turns an Extraction into order changes, merging repeated emails about the same order.
 * Orders are matched on retailer + normalized order number only; anything weaker
 * is never auto-merged.
 */
import type { Confidence, DateOnly, Evidence, FieldSource, Order, Retailer, ShipmentStatus } from "../domain/types";
import type { Extracted, Extraction, RawMessage } from "./types";

const rank: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
const shipRank: Record<ShipmentStatus, number> = { unknown: 0, ordered: 1, shipped: 2, delivered: 3 };

export const normalizeOrderNumber = (n: string) => n.toUpperCase().replace(/[^A-Z0-9]/g, "");

export function findDuplicate(orders: Order[], retailerId: string | null, orderNumber: string | null, trackingNumber: string | null = null): Order | null {
  if (!retailerId) return null;
  if (orderNumber) {
    const key = normalizeOrderNumber(orderNumber);
    const hit = orders.find((o) => o.retailerId === retailerId && o.orderNumber && normalizeOrderNumber(o.orderNumber) === key);
    if (hit) return hit;
  }
  // A shipment email without an order number can still match on its tracking number.
  if (trackingNumber) {
    const t = normalizeOrderNumber(trackingNumber);
    return orders.find((o) => o.retailerId === retailerId && o.tracking && normalizeOrderNumber(o.tracking.number) === t) ?? null;
  }
  return null;
}

/** Fields where a new message disagrees with what the order already says, at high confidence. */
export function conflicts(order: Order, x: Extraction): string[] {
  const out: string[] = [];
  if (x.total?.confidence === "high" && order.charges.total != null && Math.round(order.charges.total * 100) !== Math.round(x.total.value * 100)) out.push("total");
  if (x.purchasedAt?.confidence === "high" && order.purchasedAt && order.fieldSources.purchasedAt?.confidence === "high" && order.purchasedAt !== x.purchasedAt.value) out.push("order date");
  return out;
}

/** Same message imported twice (re-forwarded, re-uploaded, re-synced). */
export function isDuplicateMessage(evidence: Evidence[], msg: RawMessage): boolean {
  return evidence.some((e) => e.id === `ev-${msg.id}`);
}

export function evidenceFromMessage(msg: RawMessage, x: Extraction): Evidence {
  return {
    id: `ev-${msg.id}`,
    kind: x.kind === "unknown" ? "receipt_upload" : x.kind,
    channel: msg.channel,
    title: msg.subject ?? "Imported message",
    from: msg.from,
    receivedAt: msg.receivedAt,
    excerpt: msg.body.replace(/\s+/g, " ").trim().slice(0, 180),
    connectionId: msg.connectionId ?? null,
    verification: ["shared_text", "screenshot", "pdf_upload"].includes(msg.channel) ? "extracted" : null,
  };
}

function source(x: Extracted<unknown>, evidenceId: string): FieldSource {
  return { evidenceId, confidence: x.confidence, method: x.method };
}

function shipmentFrom(x: Extraction): ShipmentStatus {
  if (x.deliveredAt || x.kind === "delivery_update") return "delivered";
  if (x.shippedAt || x.kind === "shipping_notice") return "shipped";
  if (x.kind === "order_confirmation") return "ordered";
  return "unknown";
}

type DateField = "purchasedAt" | "shippedAt" | "deliveredAt";

/**
 * Applies an extraction to an existing order (or a fresh one). Known values are
 * only replaced by values of equal or higher confidence.
 */
export function mergeExtraction(order: Order, x: Extraction, evidenceId: string, newId: () => string): Order {
  const next: Order = { ...order, fieldSources: { ...order.fieldSources }, evidenceIds: Array.from(new Set([...order.evidenceIds, evidenceId])) };

  const take = (field: DateField, value: Extracted<DateOnly> | null) => {
    if (!value) return;
    const prev = order.fieldSources[field];
    if (order[field] == null || !prev || rank[value.confidence] >= rank[prev.confidence]) {
      next[field] = value.value;
      next.fieldSources[field] = source(value, evidenceId);
    }
  };
  take("purchasedAt", x.purchasedAt);
  take("shippedAt", x.shippedAt);
  take("deliveredAt", x.deliveredAt);

  if (x.orderNumber && !order.orderNumber) {
    next.orderNumber = x.orderNumber.value;
    next.fieldSources.orderNumber = source(x.orderNumber, evidenceId);
  }
  if (x.items.length && order.items.length === 0) {
    next.items = x.items.map((i) => ({
      id: newId(),
      name: i.value.name,
      variant: null,
      quantity: i.value.quantity,
      unitPrice: i.value.unitPrice,
      category: i.value.category,
      finalSale: null,
    }));
    next.fieldSources.items = source(x.items[0], evidenceId);
  }
  if (x.total && next.charges.total == null) next.charges = { ...next.charges, total: x.total.value };
  if (x.charges) {
    const c = { ...next.charges };
    for (const k of ["subtotal", "shipping", "tax", "discount"] as const) if (x.charges[k] && c[k] == null) c[k] = x.charges[k]!.value;
    next.charges = c;
  }
  if (x.expectedDeliveryAt && !next.deliveredAt) next.expectedDeliveryAt = x.expectedDeliveryAt.value;
  if (x.tracking && !order.tracking) next.tracking = { carrier: x.tracking.value.carrier ?? "Carrier unknown", number: x.tracking.value.number };
  if (x.statedReturnDeadline) next.statedReturnDeadline = { date: x.statedReturnDeadline.value, evidenceId };

  const ship = shipmentFrom(x);
  if (shipRank[ship] > shipRank[order.shipmentStatus]) next.shipmentStatus = ship;
  return next;
}

export function blankOrder(id: string, retailerId: string, createdAt: string): Order {
  return {
    id,
    retailerId,
    orderNumber: null,
    purchasedAt: null,
    shippedAt: null,
    deliveredAt: null,
    expectedDeliveryAt: null,
    shipmentStatus: "unknown",
    currency: "USD",
    items: [],
    tracking: null,
    charges: { subtotal: null, shipping: null, tax: null, discount: null, total: null },
    statedReturnDeadline: null,
    evidenceIds: [],
    fieldSources: {},
    keptItemIds: [],
    createdAt,
    demo: false,
  };
}

/** A retailer we don't have in the directory yet. No policy is assumed for it. */
export function customRetailer(id: string, name: string): Retailer {
  return {
    id,
    name,
    websiteUrl: "",
    returnsUrl: "",
    supportUrl: "",
    balanceCheckUrl: null,
    returnCapability: "guided",
    giftPartner: false,
    tone: "slate",
    category: "general",
  };
}
