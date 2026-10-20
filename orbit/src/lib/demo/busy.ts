/**
 * A busy month: ~20 extra fictional orders across stores and categories, used to
 * check that Today and Returns stay readable for someone with many returns going.
 * Ids start with "d-" so dates stay relative like the rest of the demo.
 */
import { addDays } from "../domain/dates";
import type { DateOnly, ItemCategory, Order, Refund, ReturnRequest } from "../domain/types";

type Spec = [retailerId: string, name: string, variant: string, price: number, category: ItemCategory, deliveredDaysAgo: number | null, kind?: "label" | "waiting" | "refund"];

const SPECS: Spec[] = [
  ["jcrew", "Oxford Shirt", "Blue · M", 79, "clothing", 25],
  ["jcrew", "Slim Chinos", "Khaki · 32", 89, "clothing", 12],
  ["everlane", "Court Sneaker", "White · 10", 98, "shoes", 28],
  ["everlane", "Cashmere Beanie", "Charcoal", 55, "accessories", 6],
  ["cos", "Wool Overcoat", "Navy · L", 290, "clothing", 27],
  ["cos", "Leather Tote", "Black", 175, "accessories", 20],
  ["zara", "Linen Shirt", "White · M", 46, "clothing", 9],
  ["zara", "Satin Midi Skirt", "Green · S", 50, "clothing", 15],
  ["madewell", "Denim Jacket", "Indigo · M", 128, "clothing", 3],
  ["madewell", "Leather Belt", "Brown", 48, "accessories", 18, "label"],
  ["aritzia", "Puffer Jacket", "Black · M", 250, "clothing", 10, "waiting"],
  ["aritzia", "Ribbed Tank", "White · S", 38, "clothing", 1],
  ["reformation", "Linen Trousers", "Oat · 6", 148, "clothing", 22],
  ["reformation", "Silk Cami", "Ivory · S", 98, "clothing", 26, "refund"],
  ["sephora", "Fragrance 50 ml", "Eau de parfum", 110, "beauty", 8],
  ["sephora", "Hair Dryer", "Travel size", 189, "home", 16],
  ["sephora", "Moisturizer", "50 ml", 42, "beauty", 4],
  ["jcrew", "Merino Sweater", "Grey · L", 98, "clothing", null],
  ["everlane", "Running Shorts", "Black · M", 45, "clothing", null],
];

export function buildBusyMonth(today: DateOnly): { orders: Order[]; returns: ReturnRequest[]; refunds: Refund[] } {
  const d = (n: number) => addDays(today, n);
  const ts = (n: number) => `${d(n)}T10:00:00.000Z`;
  const orders: Order[] = [];
  const returns: ReturnRequest[] = [];
  const refunds: Refund[] = [];

  SPECS.forEach(([retailerId, name, variant, price, category, delivered, kind], i) => {
    const id = `d-b-o${i}`;
    const itemId = `d-b-i${i}`;
    const purchased = (delivered ?? 0) + 3;
    orders.push({
      id,
      retailerId,
      orderNumber: `${retailerId.slice(0, 2).toUpperCase()}-${700100 + i * 37}`,
      purchasedAt: d(-purchased),
      shippedAt: d(-(purchased - 1)),
      deliveredAt: delivered == null ? null : d(-delivered),
      shipmentStatus: delivered == null ? "shipped" : "delivered",
      currency: "USD",
      items: [{ id: itemId, name, variant, quantity: 1, unitPrice: price, category, finalSale: false }],
      tracking: null,
      statedReturnDeadline: null,
      evidenceIds: [],
      fieldSources: {},
      keptItemIds: [],
      createdAt: ts(-purchased),
      demo: true,
    });
    if (!kind) return;
    const rid = `d-b-r${i}`;
    const status = kind === "label" ? "label_ready" : kind === "waiting" ? "reported_submitted" : "received";
    returns.push({
      id: rid,
      orderId: id,
      itemIds: [itemId],
      capability: "guided",
      status,
      reason: null,
      refundPreference: "original_payment",
      dropOff: "ups",
      shipBy: kind === "label" ? d(1) : null,
      createdAt: ts(-2),
      submission: { by: "customer_on_retailer_site", at: ts(-2), confirmedByRetailer: kind !== "waiting", confirmationEvidenceId: kind !== "waiting" ? "d-b-ev" : null },
      artifacts: kind === "label" ? [{ id: `d-b-a${i}`, kind: "qr_code", carrier: "UPS", code: `ORBIT-DEMO-${i}-4471`, evidenceId: "d-b-ev", expiresAt: d(1) }] : [],
      rmaNumber: null,
      history: [{ at: ts(-2), status, note: "Demo return." }],
    });
    if (kind === "refund")
      refunds.push({
        id: `d-b-f${i}`,
        orderId: id,
        returnId: rid,
        currency: "USD",
        destination: "original_payment",
        destinationLabel: "Visa ending 4242",
        expected: { amount: price, by: d(-1), basis: "Typically refunded within 10 days of receipt." },
        confirmed: null,
        milestones: [{ at: ts(-11), label: "Received by the store", evidenceId: null }],
      });
  });
  return { orders, returns, refunds };
}
