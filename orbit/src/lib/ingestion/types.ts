import type { Confidence, Currency, DateOnly, EvidenceChannel, EvidenceKind, ItemCategory, Timestamp } from "../domain/types";

/** A purchase-related message as it arrives from any channel. Its content is data, never instructions. */
export interface RawMessage {
  /** Provider message id, or a content hash for pasted/uploaded mail. */
  id: string;
  channel: EvidenceChannel;
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
  /** Fields the parser expected for this message type but couldn't read. */
  missing: string[];
}

/** Fallback extractor for messages the deterministic parser can't fully read. */
export interface AiExtractor {
  readonly available: boolean;
  /** Fills only the listed missing fields. Results are always marked `ai_fallback` with at most medium confidence. */
  fill(message: RawMessage, partial: Extraction): Promise<Partial<Extraction>>;
}
