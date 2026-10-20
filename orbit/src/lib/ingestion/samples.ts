/** Fictional sample emails for trying the import flow. Hollis & Pine is an invented retailer. */
import { addDays, formatDate } from "../domain/dates";
import type { DateOnly } from "../domain/types";
import type { RawMessage } from "./types";

export function sampleMessages(today: DateOnly): (RawMessage & { label: string; hint: string })[] {
  const long = (d: DateOnly) => {
    const dt = new Date(`${d}T12:00:00Z`);
    return dt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  };
  return [
    {
      id: "sample-everlane-delivered",
      label: "Everlane delivery update",
      hint: "Matches an order you already have and fills in the missing delivery date.",
      channel: "email_upload",
      from: "Everlane <support@everlane.example>",
      subject: "Your Everlane order has been delivered",
      receivedAt: `${addDays(today, -1)}T15:04:00.000Z`,
      body: [
        "Good news — your package was delivered.",
        "",
        "Order number: EV-1180344",
        `Delivered on ${long(addDays(today, -2))}`,
        "Tracking number: 9400100000000000000000 (USPS)",
        "",
        "Need to make a return? Visit https://www.everlane.example/returns",
      ].join("\n"),
    },
    {
      id: "sample-hollis-order",
      label: "Hollis & Pine order confirmation",
      hint: "A new retailer Orbit doesn't have a policy for yet.",
      channel: "email_upload",
      from: "Hollis & Pine <orders@hollisandpine.example>",
      subject: "Thank you for your order",
      receivedAt: `${addDays(today, -2)}T10:20:00.000Z`,
      body: [
        "Thanks for your order, Alex!",
        "",
        "Order #HP-204518",
        `Order date: ${long(addDays(today, -2))}`,
        "",
        "Linen Button-Down Shirt · Qty: 1 · $88.00",
        "Leather Belt · Qty: 1 · $54.00",
        "",
        "Subtotal: $142.00",
        "Shipping: $0.00",
        "Order total: $142.00",
        "",
        `We'll email you when it ships. Questions? Reply to this email. (Sent ${formatDate(today)})`,
      ].join("\n"),
    },
    {
      id: "sample-sephora-refund",
      label: "Sephora refund email",
      hint: "Confirms the refund Orbit has been tracking.",
      channel: "email_upload",
      from: "Sephora <beauty@sephora.example>",
      subject: "Your refund has been issued",
      receivedAt: `${today}T08:15:00.000Z`,
      body: [
        "We've processed your return.",
        "",
        "Order number: SE-77310428",
        "A refund of $95.00 has been issued to your Visa ending in 4242.",
        "Please allow 3–5 business days for it to appear on your statement.",
      ].join("\n"),
    },
  ];
}
