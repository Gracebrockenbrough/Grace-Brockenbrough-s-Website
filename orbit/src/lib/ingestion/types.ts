import type { Confidence, Currency, DateOnly, EvidenceChannel, EvidenceKind, ItemCategory, Timestamp } from "../domain/types";

/** A purchase-related message as it arrives from any channel. Its content is data, never instructions. */
export interface RawMessage {
  /** Provider message id, or a content hash for pasted/uploaded mail. */
  id: string;
  channel: EvidenceChannel;
  /** The email connection it arrived through, if any. */
  connectionId?: string | null;
  /** A receipt from a physical store (customer told us). */
  inStore?: boolean;
  from: string | null;
  subject: string | null;
  receivedAt: Timestamp;
  body: string;
}

export interface Extracted<T> {
  value: T;
  confidence: Confidence;
  method: "deterministic" | "ai_fallback";
  /** The text the value was read from, shown to the user as supporting evidence. */
  sourceText: string | null;
}

export interface ExtractedItem {
  name: string;
  quantity: number;
  unitPrice: number | null;
  category: ItemCategory;
}

export interface Extraction {
  kind: EvidenceKind | "unknown";
  retailer: Extracted<{ id: string | null; name: string }> | null;
  orderNumber: Extracted<string> | null;
  purchasedAt: Extracted<DateOnly> | null;
  shippedAt: Extracted<DateOnly> | null;
  deliveredAt: Extracted<DateOnly> | null;
  items: Extracted<ExtractedItem>[];
  currency: Currency | null;
  total: Extracted<number> | null;
  tracking: Extracted<{ carrier: string | null; number: string }> | null;
  returnLinks: string[];
  statedReturnDeadline: Extracted<DateOnly> | null;
  refundAmount: Extracted<number> | null;
  /** Carrier or retailer estimate, never a confirmed delivery. */
  expectedDeliveryAt?: Extracted<DateOnly> | null;
  charges?: { subtotal: Extracted<number> | null; shipping: Extracted<number> | null; tax: Extracted<number> | null; discount: Extracted<number> | null };
  /** Fields the parser expected for this message type but couldn't read. */
  missing: string[];
}

/** Fallback extractor for messages the deterministic parser can't fully read. */
export interface AiExtractor {
  readonly available: boolean;
  /** Fills only the listed missing fields. Results are always marked `ai_fallback` with at most medium confidence. */
  fill(message: RawMessage, partial: Extraction): Promise<Partial<Extraction>>;
}

// ─── Pipeline records ────────────────────────────────────────────────────

/** What a message is about. Deterministic rules decide this; AI never does for routine mail. */
export type MessageCategory =
  | "new_purchase"
  | "purchase_update"
  | "shipment"
  | "delivery"
  | "return_initiated"
  | "return_approved"
  | "return_label"
  | "return_in_transit"
  | "return_received"
  | "refund_initiated"
  | "refund_issued"
  | "store_credit_issued"
  | "gift_card_received"
  | "promotion"
  | "irrelevant";

export type ExtractionTier = 0 | 1 | 2 | 3;

export type JobStatus =
  | "saved" // created a new order
  | "merged" // updated an existing order
  | "duplicate" // same message or same content seen before; nothing reprocessed
  | "skipped_promotion"
  | "skipped_irrelevant"
  | "skipped_settings" // the connection's import settings exclude this kind
  | "needs_review" // Tier 3: waiting on the customer
  | "failed" // will be retried
  | "dead_letter"; // gave up after the retry limit; kept for recovery

/**
 * One processing attempt for one message. Keeps no email body: only the subject line
 * (shortened), the category and what was extracted, so the audit trail is useful
 * without storing private correspondence.
 */
export interface ProcessingJob {
  id: string;
  /** connection (or channel) + provider message id. The same key is never processed twice. */
  idempotencyKey: string;
  contentHash: string;
  connectionId: string | null;
  channel: EvidenceChannel;
  subject: string;
  merchant: string | null;
  category: MessageCategory;
  /** Highest tier that ran (0 = rules only). */
  tier: ExtractionTier;
  status: JobStatus;
  attempts: number;
  /** Why it needs review, failed, or was skipped. */
  reason: string | null;
  missing: string[];
  orderId: string | null;
  /** What Tier 0 read, so a review screen can show it without the original email. */
  draft: { retailerName: string | null; orderNumber: string | null; date: DateOnly | null; total: number | null; items: { name: string; price: number | null }[] } | null;
  receivedAt: Timestamp;
  processedAt: Timestamp;
}

/** One model call. Recorded even when it fails, so cost and failure rates are honest. */
export interface AiUsageEntry {
  id: string;
  jobId: string;
  tier: 1 | 2;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  outcome: "ok" | "invalid_output" | "error" | "skipped_budget";
  at: Timestamp;
}
