/**
 * Deterministic purchase-email parser.
 *
 * Reads order confirmations, shipping/delivery notices, return confirmations,
 * labels, refunds and gift card emails using plain patterns. Message content is
 * treated strictly as data: nothing in an email can trigger an action.
 */
import { toDateOnly } from "../domain/dates";
import type { DateOnly, ItemCategory, Retailer } from "../domain/types";
import type { Extracted, ExtractedItem, Extraction, RawMessage } from "./types";

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

const DATE_PATTERN =
  "(\\d{4}-\\d{2}-\\d{2}|\\d{1,2}/\\d{1,2}/\\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s+\\d{4})";

/** Parses "2026-10-03", "10/03/2026" (US) or "October 3, 2026". */
export function parseDate(raw: string): DateOnly | null {
  const s: string = raw.trim().toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return iso(+m[3], +m[1], +m[2]);
  m = s.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/);
  if (m) {
    const month = MONTHS[m[1].slice(0, 4)] ?? MONTHS[m[1].slice(0, 3)];
    if (month) return iso(+m[3], month, +m[2]);
  }
  return null;
}

function iso(y: number, m: number, d: number): DateOnly | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const det = <T>(value: T, sourceText: string | null, confidence: Extracted<T>["confidence"] = "high"): Extracted<T> => ({
  value,
  confidence,
  method: "deterministic",
  sourceText: sourceText?.trim().slice(0, 160) ?? null,
});

function findDate(text: string, labels: string): Extracted<DateOnly> | null {
  const re = new RegExp(`(?:${labels})\\s*(?:on|date)?\\s*[:\\-]?\\s*${DATE_PATTERN}`, "i");
  const m = text.match(re);
  if (!m) return null;
  const date = parseDate(m[1]);
  return date ? det(date, m[0]) : null;
}

function classify(subject: string, body: string): Extraction["kind"] {
  const t = `${subject}\n${body}`.toLowerCase();
  if (/refund (has been |was )?(issued|processed)|refund of \$|we('ve| have) refunded/.test(t)) return "refund_confirmation";
  if (/return label|return qr|qr code/.test(t)) return "return_label";
  if (/return (was |has been )?(received|processed|confirmed|approved)|we received your return|return processed/.test(t)) return "return_confirmation";
  if (/\bdelivered\b/.test(t)) return "delivery_update";
  if (/\bshipped\b|on (the|its) way|out for delivery|tracking (number|#)/.test(t)) return "shipping_notice";
  if (/e-?gift card|gift card (balance|number)/.test(t)) return "gift_card_email";
  if (/order (confirmation|confirmed|received|number|#)|thanks for (your|the) order|thank you for your order/.test(t)) return "order_confirmation";
  return "unknown";
}

function detectRetailer(msg: RawMessage, retailers: Retailer[]): Extraction["retailer"] {
  const from = (msg.from ?? "").toLowerCase();
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  for (const r of retailers) {
    const key = slug(r.name);
    if (key && from.replace(/[^a-z0-9@.]/g, "").includes(key)) return det({ id: r.id, name: r.name }, msg.from, "high");
  }
  const text = `${msg.subject ?? ""}\n${msg.body}`;
  for (const r of retailers) {
    const re = new RegExp(`\\b${r.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    const m = text.match(re);
    if (m) return det({ id: r.id, name: r.name }, m[0], "medium");
  }
  // Unknown retailer: fall back to the sender's display name or domain.
  const display = msg.from?.match(/^\s*"?([^"<@]+?)"?\s*</)?.[1];
  const domain = from.match(/@([a-z0-9-]+)\./)?.[1];
  const name = display ?? (domain ? domain[0].toUpperCase() + domain.slice(1) : null);
  return name ? det({ id: null, name }, msg.from, "low") : null;
}

const SKIP_LINE = /\b(sub-?total|total|tax|shipping|delivery fee|discount|promo|savings|refund|balance|paid|payment|card ending)\b/i;

function guessCategory(name: string): ItemCategory {
  const n = name.toLowerCase();
  if (/serum|blush|lipstick|mascara|cream|cleanser|foundation|palette|fragrance|perfume|moisturi[sz]er|balm/.test(n)) return "beauty";
  if (/shoe|boot|sneaker|flat|heel|sandal|loafer|mule|glove\b/.test(n)) return "shoes";
  if (/bag|scarf|belt|hat|earring|necklace|bracelet|sunglass|wallet|tote/.test(n)) return "accessories";
  if (/candle|pillow|throw|mug|vase/.test(n)) return "home";
  if (/dress|sweater|pant|jean|shirt|top|skirt|blazer|coat|jacket|tee|cardigan|short|crewneck|hoodie/.test(n)) return "clothing";
  return "other";
}

function parseItems(body: string): Extracted<ExtractedItem>[] {
  const items: Extracted<ExtractedItem>[] = [];
  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || SKIP_LINE.test(line)) continue;
    const m = line.match(/^(?:[-•*]\s*)?(.+?)\s*(?:[,·|–-]\s*)?(?:(?:qty|quantity)\s*:?\s*(\d+)|x\s?(\d+)|(\d+)\s?x)?\s*(?:[,·|–-]\s*)?\$\s?(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)\s*$/i);
    if (!m) continue;
    const name = m[1].replace(/\s*(?:qty|quantity)\s*:?\s*\d+\s*$/i, "").replace(/[\s,·|–-]+$/, "").trim();
    if (name.length < 2 || /^\$/.test(name)) continue;
    const quantity = Number(m[2] ?? m[3] ?? m[4] ?? 1);
    const price = Number(m[5].replace(/,/g, ""));
    items.push(det({ name, quantity, unitPrice: quantity > 1 ? Math.round((price / quantity) * 100) / 100 : price, category: guessCategory(name) }, line, "medium"));
  }
  return items;
}

function carrierFor(num: string, text: string): string | null {
  if (/^1Z[0-9A-Z]{16}$/i.test(num)) return "UPS";
  if (/^(94|93|92|95)\d{18,20}$/.test(num)) return "USPS";
  if (/^\d{12}$|^\d{15}$/.test(num)) return "FedEx";
  const named = text.match(/\b(UPS|USPS|FedEx|DHL)\b/i)?.[1];
  return named ? named.toUpperCase().replace("FEDEX", "FedEx") : null;
}

export function parseMessage(msg: RawMessage, retailers: Retailer[]): Extraction {
  const subject = msg.subject ?? "";
  const body = msg.body;
  const text = `${subject}\n${body}`;
  const kind = classify(subject, body);
  const received = toDateOnly(new Date(msg.receivedAt));

  const orderNo = text.match(/order\s*(?:number|no\.?|#|id)?\s*[:#]?\s*#?\s*([A-Z]{0,4}-?\d[A-Z0-9-]{4,})/i);
  const totalM = text.match(/(?:order\s+)?total\s*[:\-]?\s*\$\s?(\d{1,6}(?:,\d{3})*(?:\.\d{2})?)/i);
  const refundM = text.match(/refund of\s*\$\s?(\d{1,6}(?:,\d{3})*(?:\.\d{2})?)/i);
  const trackM = text.match(/tracking\s*(?:number|no\.?|#)?\s*[:#]?\s*([A-Z0-9]{10,34})/i);
  const deadlineM = text.match(new RegExp(`return(?:s)?(?:\\s+accepted)?\\s+(?:by|until|before|through)\\s+${DATE_PATTERN}`, "i"));
  const links = Array.from(text.matchAll(/https?:\/\/[^\s<>"')]+/gi), (m) => m[0]).filter((u) => /return/i.test(u));

  let purchasedAt = findDate(text, "order date|ordered|placed|purchase date|date of purchase");
  let shippedAt = findDate(text, "shipped|ship date|dispatched");
  let deliveredAt = findDate(text, "delivered|delivery date");
  // A delivery or shipping notice without an explicit date: use the message date, at lower confidence.
  if (!deliveredAt && kind === "delivery_update") deliveredAt = det(received, "Date of the delivery email", "medium");
  if (!shippedAt && kind === "shipping_notice") shippedAt = det(received, "Date of the shipping email", "medium");
  if (!purchasedAt && kind === "order_confirmation") purchasedAt = det(received, "Date of the order email", "medium");

  const extraction: Extraction = {
    kind,
    retailer: detectRetailer(msg, retailers),
    orderNumber: orderNo ? det(orderNo[1].toUpperCase(), orderNo[0]) : null,
    purchasedAt,
    shippedAt,
    deliveredAt,
    items: kind === "order_confirmation" || kind === "unknown" ? parseItems(body) : [],
    currency: /\$/.test(text) ? "USD" : null,
    total: totalM ? det(Number(totalM[1].replace(/,/g, "")), totalM[0]) : null,
    tracking: trackM ? det({ carrier: carrierFor(trackM[1], text), number: trackM[1] }, trackM[0]) : null,
    returnLinks: links,
    statedReturnDeadline: deadlineM && parseDate(deadlineM[1]) ? det(parseDate(deadlineM[1])!, deadlineM[0]) : null,
    refundAmount: refundM ? det(Number(refundM[1].replace(/,/g, "")), refundM[0]) : null,
    missing: [],
  };

  if (!extraction.retailer) extraction.missing.push("retailer");
  if (!extraction.orderNumber) extraction.missing.push("order number");
  if (kind === "order_confirmation" && extraction.items.length === 0) extraction.missing.push("items");
  if (kind === "refund_confirmation" && !extraction.refundAmount) extraction.missing.push("refund amount");
  return extraction;
}
