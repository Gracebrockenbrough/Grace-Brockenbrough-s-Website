/**
 * Customer-shared receipts: pasted receipt text, text messages (SMS) and text copied from
 * a PDF or screenshot. Tote can't read anyone's text messages in the background (phones
 * don't allow it, and we wouldn't), so the customer shares what they want imported.
 *
 * Printed receipts write prices without "$" and use shouty item names; this normalizes
 * them into the same shape the email parser reads, so one pipeline handles everything.
 */
import type { Retailer } from "../domain/types";
import type { RawMessage } from "./types";

const AMOUNT = /(-?\d{1,5}(?:,\d{3})*\.\d{2})\s*[A-Z]?\s*$/;
const SUMMARY = /^(sub\s?-?total|total|tax|sales tax|change|cash|visa|mastercard|amex|debit|credit|balance|tender)/i;

const title = (s: string) => s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());

export type SharedKind = "receipt" | "sms";

/** Guess whether pasted text is a text message or a receipt. */
export function sharedKind(text: string): SharedKind {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  return lines.length <= 4 && text.length < 400 && !/\btotal\b/i.test(text) ? "sms" : "receipt";
}

export function receiptToMessage(text: string, opts: { id: string; inStore: boolean; retailers: Retailer[]; receivedAt: string; channel?: RawMessage["channel"] }): RawMessage {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const kind = sharedKind(text);
  // The store's name is usually in the first few lines, or the SMS sender prefix ("Sephora: …").
  const head = lines.slice(0, 4).join(" ");
  const retailer = opts.retailers.find((r) => new RegExp(`\\b${r.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(head));
  const storeName = retailer?.name ?? (kind === "sms" ? text.match(/^([A-Z][\w&' .-]{1,30}):/)?.[1] : lines[0]) ?? null;

  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(AMOUNT);
    if (m && !line.includes("$")) {
      const name = line.slice(0, m.index).replace(/\s{2,}.*/, "").replace(/[.\s]+$/, "").trim();
      const label = SUMMARY.test(name) ? name.replace(/^sales tax/i, "Tax").replace(/^sub\s?-?total/i, "Subtotal") : title(name);
      if (/^total/i.test(label)) out.push(`Order total: $${m[1]}`);
      else if (name) out.push(`${label} $${m[1]}`);
      continue;
    }
    out.push(line);
  }
  const from = storeName ? `${storeName} <receipt@shared.local>` : null;
  return {
    id: opts.id,
    channel: opts.channel ?? "shared_text",
    from,
    subject: kind === "sms" ? `Text message from ${storeName ?? "a store"}` : `Receipt from ${storeName ?? "a store"}`,
    receivedAt: opts.receivedAt,
    body: out.join("\n"),
    inStore: opts.inStore,
  };
}
