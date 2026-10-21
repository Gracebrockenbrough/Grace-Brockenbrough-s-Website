/**
 * Tier 0 merchant templates: deterministic readers for retailers whose emails have a
 * known layout. Once a template is reliable, those emails never cost an AI call.
 */
import type { Extracted, ExtractedItem, Extraction, RawMessage } from "./types";
import { parseDate } from "./parse";

const det = <T>(value: T, sourceText: string, confidence: Extracted<T>["confidence"] = "high"): Extracted<T> => ({
  value,
  confidence,
  method: "deterministic",
  sourceText: sourceText.trim().slice(0, 160),
});

const money = (s: string) => Number(s.replace(/,/g, ""));

/**
 * Amazon order and shipment emails. Items appear as a name line followed by
 * "Quantity: N" and a price line. Order numbers look like 112-1234567-1234567.
 */
function amazon(msg: RawMessage): Partial<Extraction> {
  const text = `${msg.subject ?? ""}\n${msg.body}`;
  const out: Partial<Extraction> = {};
  const no = text.match(/\b(\d{3}-\d{7}-\d{7})\b/);
  if (no) out.orderNumber = det(no[1], no[0]);
  const placed = text.match(/(?:placed on|order date:?)\s+([A-Za-z]+\.? \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i);
  const placedDate = placed ? parseDate(placed[1]) : null;
  if (placed && placedDate) out.purchasedAt = det(placedDate, placed[0]);
  const arriving = text.match(/(?:arriving|estimated delivery:?)\s+([A-Za-z]+\.? \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2})/i);
  const arrivingDate = arriving ? parseDate(arriving[1]) : null;
  if (arriving && arrivingDate) out.expectedDeliveryAt = det(arrivingDate, arriving[0], "medium");

  const lines = msg.body.split(/\r?\n/).map((l) => l.trim());
  const items: Extracted<ExtractedItem>[] = [];
  for (let i = 0; i < lines.length - 2; i++) {
    const q = lines[i + 1].match(/^Quantity:\s*(\d+)$/i);
    const p = lines[i + 2].match(/^\$\s?(\d{1,5}(?:,\d{3})*\.\d{2})$/);
    if (q && p && lines[i] && !/^(order|subtotal|total|shipping|tax)/i.test(lines[i])) {
      const quantity = Number(q[1]);
      const lineTotal = money(p[1]);
      items.push(det({ name: lines[i], quantity, unitPrice: quantity > 1 ? Math.round((lineTotal / quantity) * 100) / 100 : lineTotal, category: "other" }, `${lines[i]} · Qty ${quantity} · $${p[1]}`));
    }
  }
  if (items.length) out.items = items;

  const read = (label: string) => {
    const m = text.match(new RegExp(`(?:${label})\\s*:?\\s*\\$\\s?(\\d{1,6}(?:,\\d{3})*\\.\\d{2})`, "i"));
    return m ? det(money(m[1]), m[0]) : null;
  };
  out.total = read("order total|grand total");
  out.charges = { subtotal: read("item\\(s\\) subtotal|subtotal"), shipping: read("shipping & handling|shipping"), tax: read("estimated tax|tax"), discount: null };
  return out;
}

export const TEMPLATES: Record<string, (msg: RawMessage) => Partial<Extraction>> = { amazon };
