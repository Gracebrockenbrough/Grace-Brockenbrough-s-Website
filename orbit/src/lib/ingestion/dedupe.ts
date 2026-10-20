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

export function findDuplicate(orders: Order[], retailerId: string | null, orderNumber: string | null): Order | null {
  if (!retailerId || !orderNumber) return null;
  const key = normalizeOrderNumber(orderNumber);
  return orders.find((o) => o.retailerId === retailerId && o.orderNumber && normalizeOrderNumber(o.orderNumber) === key) ?? null;
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
    shipmentStatus: "unknown",
    currency: "USD",
    items: [],
    tracking: null,
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
  };
}
