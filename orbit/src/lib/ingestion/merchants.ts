/**
 * Merchant / sender-domain directory.
 *
 * Detection starts here: a message from a known merchant domain is a strong shopping
 * signal, so we can skip everything else in the mailbox cheaply. Unknown senders must
 * show structured purchase evidence (an order number, tracking number or price) as well
 * as a shopping subject before they're treated as shopping mail. A coworker writing
 * "the order of the agenda" is never imported.
 *
 * `domains` lists official sending domains. `.example` domains are the fictional
 * senders used by the prototype's sample inboxes.
 */
export interface Merchant {
  retailerId: string;
  name: string;
  domains: string[];
  /** Tier 0 template that reads this merchant's emails without AI, when one exists. */
  template: string | null;
}

export const MERCHANTS: Merchant[] = [
  { retailerId: "amazon", name: "Amazon", domains: ["amazon.com", "amazon.example"], template: "amazon" },
  { retailerId: "reformation", name: "Reformation", domains: ["thereformation.com", "reformation.example"], template: null },
  { retailerId: "aritzia", name: "Aritzia", domains: ["aritzia.com", "aritzia.example"], template: null },
  { retailerId: "sephora", name: "Sephora", domains: ["sephora.com", "beauty.sephora.com", "sephora.example"], template: null },
  { retailerId: "zara", name: "Zara", domains: ["zara.com", "zara.example"], template: null },
  { retailerId: "madewell", name: "Madewell", domains: ["madewell.com", "madewell.example"], template: null },
  { retailerId: "everlane", name: "Everlane", domains: ["everlane.com", "everlane.example"], template: null },
  { retailerId: "cos", name: "COS", domains: ["cos.com", "cosstores.com", "cos.example"], template: null },
  { retailerId: "jcrew", name: "J.Crew", domains: ["jcrew.com", "jcrew.example"], template: null },
];

/** Lower-case sender domain, e.g. "orders@ship.amazon.com" → "ship.amazon.com". */
export function senderDomain(from: string | null): string | null {
  const m = (from ?? "").toLowerCase().match(/@([a-z0-9.-]+\.[a-z]{2,})/);
  return m ? m[1] : null;
}

/** Matches a domain or any of its subdomains against the directory. */
export function merchantForDomain(domain: string | null, merchants: Merchant[] = MERCHANTS): Merchant | null {
  if (!domain) return null;
  return merchants.find((m) => m.domains.some((d) => domain === d || domain.endsWith(`.${d}`))) ?? null;
}
