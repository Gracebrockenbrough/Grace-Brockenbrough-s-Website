/**
 * Tote domain model.
 *
 * Conventions:
 * - `null` always means "unknown". Never substitute a guess for a null.
 * - Dates are ISO strings. Calendar dates use `YYYY-MM-DD`; moments use full ISO timestamps.
 * - Money amounts are decimal numbers in the record's `currency`.
 * - Expected and confirmed values are stored separately and never merged.
 */

export type DateOnly = string; // YYYY-MM-DD
export type Timestamp = string; // ISO 8601
export type Currency = "USD";

/** Tri-state fact: true, false, or unknown (null). */
export type Tri = boolean | null;

export type Confidence = "high" | "medium" | "low";

// ─── Retailers & policies ────────────────────────────────────────────────

/**
 * How much of a retailer's return process Tote performs.
 * - guided: Tote gives accurate information and opens the retailer's own process. (Built.)
 * - assisted: Tote prepares the request in an authorized customer workflow; the customer
 *   confirms and finishes restricted steps. (Interface only.)
 * - integrated: Tote submits through an approved retailer API after explicit approval.
 *   (Interface only; needs a retailer partnership.)
 * Every retailer is "guided" today. Tote never submits anything without a real integration.
 */
export type ReturnCapability = "guided" | "assisted" | "integrated";

export type CardTone = "navy" | "sage" | "terracotta" | "sand" | "slate" | "ink";

/** What kind of store this is. Drives the small icon on wallet cards. */
export type StoreCategory = "fashion" | "beauty" | "shoes" | "accessories" | "home" | "general";

export interface Retailer {
  id: string;
  name: string;
  /** Official shopping website. "Shop Store" always opens this. */
  websiteUrl: string;
  /** Where the customer starts a return. May be the website when no deep link is known. */
  returnsUrl: string;
  supportUrl: string;
  /** Where the customer can check a gift card balance themselves, when known. */
  balanceCheckUrl: string | null;
  returnCapability: ReturnCapability;
  /** Participates in Send a Gift (demo partners only for now). */
  giftPartner: boolean;
  tone: CardTone;
  category: StoreCategory;
}

export type WindowStart = "delivery" | "purchase" | "shipment" | "unknown";
export type RefundMethod = "original_payment" | "store_credit" | "exchange";
export type DropOffKind = "ups" | "usps" | "fedex" | "store" | "happy_returns";

export interface ReturnFee {
  /** Fee for mail returns. 0 = free. null = unknown. */
  mail: number | null;
  /** Fee for in-store / drop-off returns. 0 = free. null = unknown. */
  inStore: number | null;
  /** Fee usually waived when refund goes to store credit. */
  waivedForStoreCredit: Tri;
}

export interface PolicyException {
  /** Applies to items whose category matches, or to every item when omitted. */
  category?: ItemCategory;
  kind: "final_sale" | "opened_product" | "worn_or_washed" | "shorter_window" | "other";
  description: string;
  /** For `shorter_window` exceptions. */
  windowDays?: number;
}

export interface ReturnPolicy {
  retailerId: string;
  /** Policies are versioned. An order uses the version in effect when it was bought. */
  version: number;
  /** First day this version applies. null = since we started tracking it. */
  effectiveFrom: DateOnly | null;
  /** Standard window in days. null = not known. */
  windowDays: number | null;
  windowStartsAt: WindowStart;
  refundMethods: RefundMethod[];
  /** Typical days from retailer receipt to refund issued. */
  refundTimelineDays: number | null;
  fees: ReturnFee;
  exceptions: PolicyException[];
  initiation: "online_portal" | "contact_support" | "in_store_only";
  shipping: {
    boxRequired: Tri;
    printingRequired: Tri;
    qrCodeAvailable: Tri;
  };
  dropOff: DropOffKind[];
  /** Retailer must approve the request before a label is issued. */
  approvalRequired: Tri;
  /**
   * The three dates a return can have, kept separate:
   * 1. start the return: `windowDays` from `windowStartsAt`;
   * 2. get approval or create the label: `labelWithinDays` after starting;
   * 3. ship or drop off: `shipWithinDays` after the label is issued.
   * null = the retailer doesn't state a separate limit (or we don't know it).
   */
  labelWithinDays: number | null;
  shipWithinDays: number | null;
  /** Rules for purchases made in a physical store, when they differ from online ones. */
  inStore: { accepted: Tri; windowDays: number | null; note: string | null };
  /** Seasonal extensions, e.g. "Holiday purchases can be returned until Jan 31." */
  holidayNote?: string | null;
  sourceUrl: string;
  lastCheckedAt: DateOnly;
  verification: "verified" | "sample" | "needs_review";
}

// ─── Evidence ────────────────────────────────────────────────────────────

export type EvidenceKind =
  | "order_confirmation"
  | "shipping_notice"
  | "delivery_update"
  | "return_confirmation"
  | "return_label"
  | "refund_confirmation"
  | "gift_card_email"
  | "receipt_upload"
  | "manual_entry"
  | "retailer_integration";

export type EvidenceChannel = "gmail" | "outlook" | "forwarded" | "email_upload" | "screenshot" | "pdf_upload" | "shared_text" | "manual" | "sample_inbox";

/** A source document that supports one or more stored facts. */
export interface Evidence {
  id: string;
  kind: EvidenceKind;
  channel: EvidenceChannel;
  title: string;
  from: string | null;
  receivedAt: Timestamp;
  /** Short, user-visible excerpt. Full bodies live in private storage. */
  excerpt: string | null;
  /** An uploaded or scanned receipt image or PDF (private storage in production). */
  attachment?: { name: string; type: string; dataUrl: string } | null;
  /** The email connection this came from, when it came from a connected inbox. */
  connectionId?: string | null;
  /** Read off an image/PDF/text by Tote ("extracted") or checked by the customer ("verified"). */
  verification?: "extracted" | "verified" | null;
}

/** Provenance for an individual extracted field. */
export interface FieldSource {
  evidenceId: string;
  confidence: Confidence;
  method: "deterministic" | "ai_fallback" | "user";
}

// ─── Orders ──────────────────────────────────────────────────────────────

export type ItemCategory = "clothing" | "beauty" | "accessories" | "shoes" | "home" | "other";

export interface OrderItem {
  id: string;
  name: string;
  variant: string | null;
  quantity: number;
  unitPrice: number | null;
  category: ItemCategory;
  /** Marked final sale on the receipt. null = not stated. */
  finalSale: Tri;
}

export type ShipmentStatus = "ordered" | "shipped" | "delivered" | "unknown";

export interface Order {
  id: string;
  retailerId: string;
  orderNumber: string | null;
  purchasedAt: DateOnly | null;
  shippedAt: DateOnly | null;
  deliveredAt: DateOnly | null;
  /** Carrier or retailer estimate. Never shown as a confirmed date. */
  expectedDeliveryAt: DateOnly | null;
  shipmentStatus: ShipmentStatus;
  currency: Currency;
  items: OrderItem[];
  tracking: { carrier: string; number: string } | null;
  /** Money breakdown from the order email. Each is null when the email didn't say. */
  charges: { subtotal: number | null; shipping: number | null; tax: number | null; discount: number | null; total: number | null };
  /** A deadline the retailer itself communicated (e.g. in the order email). */
  statedReturnDeadline: { date: DateOnly; evidenceId: string } | null;
  evidenceIds: string[];
  fieldSources: Partial<Record<"orderNumber" | "purchasedAt" | "shippedAt" | "deliveredAt" | "items", FieldSource>>;
  /** User chose to keep the items; suppresses return reminders. */
  keptItemIds: string[];
  /** The email connection the order was first found in ("Purchased using: Personal Gmail"). */
  sourceConnectionId?: string | null;
  /** Bought in a physical store. In-store return rules may differ from online ones. */
  channel?: "online" | "in_store" | null;
  createdAt: Timestamp;
  demo: boolean;
}

// ─── Returns ─────────────────────────────────────────────────────────────

/**
 * Return lifecycle. Each status says who is waiting on whom.
 * Nothing becomes `submitted_confirmed` or later without retailer evidence.
 */
export type ReturnStatus =
  | "prepared" // Tote prepared it. Nothing has been sent to the retailer.
  | "reported_submitted" // Customer says they submitted it on the retailer's site. Awaiting retailer confirmation.
  | "approval_pending" // Retailer confirmed receipt of the request; approval pending.
  | "label_ready" // Retailer confirmed; label/QR available. Customer must ship.
  | "shipped" // Package is on its way back.
  | "received" // Retailer confirmed it arrived. Refund stage.
  | "completed" // Refund or credit confirmed.
  | "cancelled";

export interface ReturnArtifact {
  id: string;
  kind: "qr_code" | "label_pdf" | "packing_slip";
  carrier: string | null;
  /** Code encoded in the QR / printed on the label. Demo values are fictional. */
  code: string;
  evidenceId: string;
  expiresAt: DateOnly | null;
  /** A label the customer saved (image or PDF). */
  file?: { name: string; type: string; dataUrl: string } | null;
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  itemIds: string[];
  capability: ReturnCapability;
  status: ReturnStatus;
  reason: string | null;
  refundPreference: RefundMethod | null;
  dropOff: DropOffKind | null;
  /** Ship-by date stated by the retailer. */
  shipBy: DateOnly | null;
  createdAt: Timestamp;
  /** Who submitted the request, if anyone. */
  submission: {
    by: "customer_on_retailer_site" | "orbit_integration" | null;
    at: Timestamp | null;
    confirmedByRetailer: boolean;
    confirmationEvidenceId: string | null;
  };
  artifacts: ReturnArtifact[];
  rmaNumber: string | null;
  /** Tracking number for the package going back, entered or scanned by the customer. */
  returnTracking?: { carrier: string | null; number: string } | null;
  history: { at: Timestamp; status: ReturnStatus; note: string }[];
}

// ─── Refunds ─────────────────────────────────────────────────────────────

export interface Refund {
  id: string;
  orderId: string;
  returnId: string | null;
  currency: Currency;
  destination: "original_payment" | "store_credit" | "unknown";
  destinationLabel: string | null;
  /** What we expect, and why. Never shown as received. */
  expected: { amount: number | null; by: DateOnly | null; basis: string } | null;
  /**
   * The refund was issued. Tote has no bank access, so this comes from the
   * retailer's refund email, or from the customer telling us it arrived.
   */
  confirmed: { amount: number; at: DateOnly; by: "retailer_email" | "customer"; evidenceId: string | null } | null;
  /** The customer confirmed the money actually reached their account (optional). */
  arrivedAt?: DateOnly | null;
  /**
   * Refund Asker: the customer's answers to "Did it arrive?". Tote has no bank access,
   * so a card refund is only "received" when the customer says so.
   */
  asker?: {
    /** Last answer. "not_yet" and "later" snooze the question until `remindOn`. */
    answer: "not_yet" | "later" | "missing" | null;
    remindOn: DateOnly | null;
    askedCount: number;
    reportedMissingAt: DateOnly | null;
    resolvedAt: DateOnly | null;
    resolution: string | null;
  };
  milestones: { at: Timestamp; label: string; evidenceId: string | null }[];
}

// ─── Wallet ──────────────────────────────────────────────────────────────

export type CreditType = "purchased_gift_card" | "gift_received" | "return_credit" | "promotional_credit";

export type BalanceStatus =
  | { kind: "verified"; at: Timestamp; source: string }
  | { kind: "last_known"; at: Timestamp; source: string }
  | { kind: "user_reported"; at: Timestamp }
  | { kind: "unknown" };

export type Expiration = { kind: "none" } | { kind: "date"; date: DateOnly } | { kind: "unknown" };

export interface WalletItem {
  id: string;
  retailerId: string;
  type: CreditType;
  currency: Currency;
  /** Last known balance. null = unknown. */
  balance: number | null;
  balanceStatus: BalanceStatus;
  /** Sensitive. Encrypted at rest in production; never rendered in previews. */
  secret: { code: string; pin: string | null } | null;
  redemption: string;
  expiration: Expiration;
  restrictions: string[];
  /** Whether the issuer permits transfer. null = unknown → treat as not transferable. */
  transferable: Tri;
  from: string | null;
  sourceOrderId: string | null;
  /** Recorded balance changes, newest last. Spending is recorded, never inferred. */
  history: { at: DateOnly; amount: number; label: string }[];
  addedAt: Timestamp;
  demo: boolean;
}

// ─── Gifts ───────────────────────────────────────────────────────────────

export interface GiftTransfer {
  id: string;
  retailerId: string;
  amount: number;
  currency: Currency;
  senderName: string;
  recipientName: string;
  recipientContact: string;
  message: string | null;
  status: "demo_created" | "claimed";
  createdAt: Timestamp;
  claimedAt: Timestamp | null;
  provider: "demo";
}

// ─── Connections & preferences ───────────────────────────────────────────

/** Email providers Tote can (eventually) connect to. "sample" is a clearly labeled fictional inbox. */
export type ConnectorId = "gmail" | "outlook" | "sample";

export type ConnectionStatus = "connected" | "disconnected" | "unavailable" | "connecting" | "syncing" | "sync_failed" | "reauth_required";

/** Which kinds of shopping email a connection may import. Customers control this per address. */
export interface ImportSettings {
  orders: boolean;
  shipping: boolean;
  returnsAndRefunds: boolean;
  giftCards: boolean;
  /** Only look at mail received on or after this date. null = provider default (e.g. last 12 months). */
  since: DateOnly | null;
}

/**
 * One authorized email connection. A customer can have several, including several from
 * the same provider. The id, not the address, identifies the connection: an address alone
 * is never treated as authentication. Tokens never live here; production keeps them
 * encrypted server-side, keyed by this id.
 */
export interface ConnectedAccount {
  id: string;
  provider: ConnectorId;
  /** Customer-chosen name, e.g. "Personal Gmail". */
  label: string;
  address: string | null;
  status: ConnectionStatus;
  /** When the last sync finished successfully. */
  lastSyncedAt: Timestamp | null;
  lastError?: string | null;
  importSettings: ImportSettings;
  connectedAt: Timestamp | null;
  demo: boolean;
}

// ─── Saved for Later ─────────────────────────────────────────────────────

/** Something the customer wants to remember: an exact product or a broader idea. Private; never used for ads. */
export interface WishItem {
  id: string;
  kind: "product" | "interest";
  /** "Leather Chelsea Boots" or "a blue dress for a wedding under $150". */
  text: string;
  retailerId: string | null;
  url: string | null;
  /** Small, downscaled image from an upload or screenshot. */
  image: string | null;
  color: string | null;
  maxPrice: number | null;
  occasion: string | null;
  tags: string[];
  source: "text" | "photo" | "voice" | "link";
  /** Temporary interests drop off after this date. */
  until: DateOnly | null;
  status: "active" | "purchased";
  addedAt: Timestamp;
}

export interface NotificationPrefs {
  returnDeadlines: boolean;
  returnActions: boolean;
  refunds: boolean;
  creditExpiry: boolean;
  weeklySummary: boolean;
  /** Packages arriving soon. */
  deliveries?: boolean;
  /** Days before a deadline to remind. */
  leadDays: 3 | 5 | 7;
}
