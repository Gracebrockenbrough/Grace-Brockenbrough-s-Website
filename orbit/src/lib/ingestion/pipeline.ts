/**
 * Ingestion pipeline: detect → classify → extract (tiered) → match → save.
 *
 * Everything up to "save" is pure and deterministic, so it's cheap, testable and
 * idempotent. Message content is data only: nothing in an email can change which
 * step runs, what gets saved, or what the app does.
 *
 * Cost control:
 * - Tier 0 (rules + merchant templates) handles routine mail for free.
 * - Tier 1/2 (AI) run only for missing required fields, within a monthly budget.
 * - Tier 3 asks the customer when a high-impact field is still uncertain.
 * - The same message (idempotency key) or the same content (hash) is never reprocessed.
 */
import type { EvidenceKind, ImportSettings, Retailer } from "../domain/types";
import { estimateCost, estimateTokens, minimizeForAi, modelClients, type AiTier } from "./ai";
import { MERCHANTS, merchantForDomain, senderDomain, type Merchant } from "./merchants";
import { parseMessage } from "./parse";
import { TEMPLATES } from "./templates";
import type { AiUsageEntry, Extraction, JobStatus, MessageCategory, ProcessingJob, RawMessage } from "./types";

export const BUDGET = {
  /** Default model budget per active customer per month, in USD. */
  monthlyUsdPerUser: 0.1,
  /** Attempts before a failing message moves to the dead-letter list. */
  maxAttempts: 3,
};

// ─── Idempotency ─────────────────────────────────────────────────────────

export const idempotencyKey = (msg: RawMessage) => `${msg.connectionId ?? msg.channel}:${msg.id}`;

/** FNV-1a over the normalized sender, subject and body. Stable across re-forwards and re-uploads. */
export function contentHash(msg: Pick<RawMessage, "from" | "subject" | "body">): string {
  const norm = `${senderDomain(msg.from) ?? ""}\n${(msg.subject ?? "").replace(/^(fwd?|re):\s*/i, "").trim().toLowerCase()}\n${msg.body.replace(/\s+/g, " ").trim().toLowerCase()}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < norm.length; i++) {
    const c = norm.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

// ─── Step 1: detect ──────────────────────────────────────────────────────

export interface Detection {
  merchant: Merchant | null;
  likely: boolean;
  signals: string[];
}

const SHOPPING_SUBJECT = /order|shipped|shipping|delivered|delivery|return|refund|receipt|gift card|store credit|invoice|your package|on (its|the) way|arriving/i;
const ORDER_NUMBER = /order\s*(?:number|no\.?|#|id)?\s*[:#]?\s*#?\s*[A-Z]{0,4}-?\d[A-Z0-9-]{4,}|\b\d{3}-\d{7}-\d{7}\b/i;
const TRACKING = /tracking\s*(?:number|no\.?|#)?\s*[:#]?\s*[A-Z0-9]{10,34}/i;
const PRICE = /\$\s?\d{1,6}(?:,\d{3})*\.\d{2}/;

export function detect(msg: RawMessage, merchants: Merchant[] = MERCHANTS): Detection {
  const merchant = merchantForDomain(senderDomain(msg.from), merchants);
  const text = `${msg.subject ?? ""}\n${msg.body}`;
  const signals: string[] = [];
  if (merchant) signals.push("known merchant domain");
  if (SHOPPING_SUBJECT.test(msg.subject ?? "")) signals.push("shopping subject");
  if (ORDER_NUMBER.test(text)) signals.push("order number");
  if (TRACKING.test(text)) signals.push("tracking number");
  if (PRICE.test(text)) signals.push("price");
  const structured = signals.some((s) => s === "order number" || s === "tracking number" || s === "price");
  // Pasted and uploaded content was chosen by the customer, so the subject rule is relaxed.
  const customerShared = msg.channel === "email_upload" || msg.channel === "shared_text" || msg.channel === "screenshot" || msg.channel === "pdf_upload" || msg.channel === "forwarded";
  const likely = Boolean(merchant) || (structured && (signals.includes("shopping subject") || customerShared));
  return { merchant, likely, signals };
}

// ─── Step 2: classify ────────────────────────────────────────────────────

export function classifyMessage(msg: RawMessage): MessageCategory {
  const t = `${msg.subject ?? ""}\n${msg.body}`.toLowerCase();
  const hasOrder = ORDER_NUMBER.test(t) || TRACKING.test(t);

  if (/refund (of \$[\d.,]+ )?(has been |was )?(issued|processed|sent)|we('ve| have) (issued|processed|sent) (a |your )?refund|refund of \$[\d.,]+ (has been |was )?(issued|processed)/.test(t))
    return /(issued|refunded|added) (to|as) (your )?(store credit|gift card|.{0,20}credit)|as store credit|store credit (has been |was )?issued/.test(t) ? "store_credit_issued" : "refund_issued";
  if (/store credit (has been |was )?(issued|added)|issued (you )?(a |an )?store credit/.test(t)) return "store_credit_issued";
  if (/refund (is )?(being processed|initiated|pending|on its way)|we('ll| will) (issue|process) your refund/.test(t)) return "refund_initiated";
  if (/return label|return qr|qr code for your return|drop.?off code/.test(t)) return "return_label";
  if (/we('ve| have)? received your return|return (was |has been )?(received|delivered to us)|(your )?return (was |has been )?processed/.test(t)) return "return_received";
  if (/return (request )?(has been |was |is )?(approved|accepted)/.test(t)) return "return_approved";
  if (/return (is )?(on its way|in transit)|your return (has )?shipped/.test(t)) return "return_in_transit";
  if (/return (request )?(received|started|initiated|submitted)|you('ve| have) started a return|return confirmation/.test(t)) return "return_initiated";
  if (/\b(has been |was )?delivered\b/.test(t) && hasOrder) return "delivery";
  if (/\bshipped\b|on (the|its) way|out for delivery|tracking (number|#)|arriving/.test(t) && hasOrder) return "shipment";
  if (/e-?gift card|gift card (balance|number|code)|you('ve| have) (received|been sent) a gift/.test(t)) return "gift_card_received";
  if (/order (has been )?(updated|changed|cancell?ed)|item (was )?cancell?ed/.test(t) && hasOrder) return "purchase_update";
  if (/order (confirmation|confirmed|received|number|#)|thanks for (your|the) order|thank you for (your order|shopping)|\breceipt\b/.test(t) && (hasOrder || PRICE.test(t))) return "new_purchase";
  if (/\d{1,2}% off|\bsale\b|limited time|shop now|new arrivals|promo code|use code|members get/.test(t) && !hasOrder) return "promotion";
  if (hasOrder && PRICE.test(t)) return "new_purchase";
  return "irrelevant";
}

const KIND: Record<MessageCategory, EvidenceKind | null> = {
  new_purchase: "order_confirmation",
  purchase_update: "order_confirmation",
  shipment: "shipping_notice",
  delivery: "delivery_update",
  return_initiated: "return_confirmation",
  return_approved: "return_confirmation",
  return_label: "return_label",
  return_in_transit: "return_confirmation",
  return_received: "return_confirmation",
  refund_initiated: "refund_confirmation",
  refund_issued: "refund_confirmation",
  store_credit_issued: "refund_confirmation",
  gift_card_received: "gift_card_email",
  promotion: null,
  irrelevant: null,
};

export const categoryLabel: Record<MessageCategory, string> = {
  new_purchase: "New purchase",
  purchase_update: "Purchase update",
  shipment: "Shipment",
  delivery: "Delivery",
  return_initiated: "Return initiated",
  return_approved: "Return approved",
  return_label: "Return label issued",
  return_in_transit: "Return in transit",
  return_received: "Return received",
  refund_initiated: "Refund initiated",
  refund_issued: "Refund issued",
  store_credit_issued: "Store credit issued",
  gift_card_received: "Gift card received",
  promotion: "Shopping promotion",
  irrelevant: "Irrelevant or unknown",
};

export function allowedBySettings(cat: MessageCategory, s: ImportSettings | undefined, receivedAt: string): boolean {
  if (!s) return true;
  if (s.since && receivedAt.slice(0, 10) < s.since) return false;
  if (cat === "new_purchase" || cat === "purchase_update") return s.orders;
  if (cat === "shipment" || cat === "delivery") return s.shipping;
  if (cat === "gift_card_received") return s.giftCards;
  return s.returnsAndRefunds;
}

// ─── Step 3: extract ─────────────────────────────────────────────────────

/** Fields that must be known for this kind of message to be saved without review. */
export function requiredFields(cat: MessageCategory, x: Extraction): string[] {
  const need: string[] = [];
  if (!x.retailer || x.retailer.confidence === "low") need.push("retailer");
  if (cat === "new_purchase") {
    if (!x.orderNumber) need.push("order number");
    if (x.items.length === 0) need.push("items");
  } else if (cat === "shipment" || cat === "delivery") {
    if (!x.orderNumber && !x.tracking) need.push("order number");
  } else if (cat === "refund_issued" || cat === "store_credit_issued") {
    if (!x.orderNumber) need.push("order number");
    if (!x.refundAmount) need.push("refund amount");
  } else if (cat !== "gift_card_received") {
    if (!x.orderNumber) need.push("order number");
  }
  return need;
}

export function tier0(msg: RawMessage, retailers: Retailer[], merchant: Merchant | null, cat: MessageCategory): Extraction {
  const x = parseMessage(msg, retailers);
  const kind = KIND[cat];
  if (kind) x.kind = kind;
  if (merchant) {
    const r = retailers.find((rt) => rt.id === merchant.retailerId);
    x.retailer = { value: { id: r ? r.id : null, name: merchant.name }, confidence: "high", method: "deterministic", sourceText: msg.from };
    const tpl = merchant.template ? TEMPLATES[merchant.template] : null;
    if (tpl) {
      const t = tpl(msg);
      for (const [k, v] of Object.entries(t)) if (v != null && !(Array.isArray(v) && v.length === 0)) (x as unknown as Record<string, unknown>)[k] = v;
    }
  }
  // Generic parsing reads items only from order emails.
  if (cat !== "new_purchase" && cat !== "purchase_update") x.items = merchant?.template ? x.items : [];
  x.missing = requiredFields(cat, x);
  return x;
}

// ─── Decision ────────────────────────────────────────────────────────────

export interface PipelineContext {
  retailers: Retailer[];
  jobs: ProcessingJob[];
  aiUsage: AiUsageEntry[];
  settings?: ImportSettings;
  merchants?: Merchant[];
  now: string;
  /** Monthly budget for this customer, in USD. */
  budgetUsd?: number;
}

export interface PipelineDecision {
  job: Omit<ProcessingJob, "id" | "orderId">;
  extraction: Extraction | null;
  category: MessageCategory;
  /** True when the store should match and save the extraction. */
  save: boolean;
  /** An AI tier that would run if a client were configured and the budget allows. */
  escalation: { tier: AiTier; fields: string[]; estimatedCostUsd: number } | null;
}

export const monthOf = (ts: string) => ts.slice(0, 7);

export function spentThisMonth(usage: AiUsageEntry[], now: string): number {
  const m = monthOf(now);
  return usage.filter((u) => monthOf(u.at) === m).reduce((s, u) => s + u.costUsd, 0);
}

function draftOf(x: Extraction): ProcessingJob["draft"] {
  return {
    retailerName: x.retailer?.value.name ?? null,
    orderNumber: x.orderNumber?.value ?? null,
    date: (x.purchasedAt ?? x.deliveredAt ?? x.shippedAt)?.value ?? null,
    total: x.total?.value ?? x.refundAmount?.value ?? null,
    items: x.items.slice(0, 8).map((i) => ({ name: i.value.name.slice(0, 80), price: i.value.unitPrice })),
  };
}

export function processMessage(msg: RawMessage, ctx: PipelineContext): PipelineDecision {
  const key = idempotencyKey(msg);
  const hash = contentHash(msg);
  const prior = ctx.jobs.filter((j) => j.idempotencyKey === key);
  const attempts = prior.length ? Math.max(...prior.map((j) => j.attempts)) : 0;
  const base = {
    idempotencyKey: key,
    contentHash: hash,
    connectionId: msg.connectionId ?? null,
    channel: msg.channel,
    subject: (msg.subject ?? "(no subject)").slice(0, 90),
    receivedAt: msg.receivedAt,
    processedAt: ctx.now,
    attempts: attempts + 1,
    missing: [] as string[],
    draft: null as ProcessingJob["draft"],
    merchant: null as string | null,
    tier: 0 as const,
  };
  const done = (status: JobStatus, category: MessageCategory, reason: string | null, extra: Partial<PipelineDecision["job"]> = {}): PipelineDecision => ({
    job: { ...base, status, category, reason, ...extra },
    extraction: null,
    category,
    save: false,
    escalation: null,
  });

  // Idempotency: a message that already finished (or gave up) is never reprocessed.
  const finished = prior.find((j) => j.status !== "failed");
  if (finished) return done("duplicate", finished.category, "Already processed", { attempts: finished.attempts });
  const sameContent = ctx.jobs.find((j) => j.contentHash === hash && j.status !== "failed" && j.status !== "duplicate");
  if (sameContent) return done("duplicate", sameContent.category, "Same content already imported");
  if (attempts >= BUDGET.maxAttempts) return done("dead_letter", "irrelevant", "Retry limit reached");

  // 1. Detect
  const det = detect(msg, ctx.merchants);
  base.merchant = det.merchant?.name ?? null;
  if (!det.likely) return done("skipped_irrelevant", "irrelevant", "Not shopping mail");

  // 2. Classify
  const category = classifyMessage(msg);
  if (category === "promotion") return done("skipped_promotion", category, "Promotions aren't imported");
  if (category === "irrelevant") return done("skipped_irrelevant", category, "No purchase details found");
  if (!allowedBySettings(category, ctx.settings, msg.receivedAt)) return done("skipped_settings", category, "Excluded by this account's import settings");

  // 3. Extract, Tier 0
  const x = tier0(msg, ctx.retailers, det.merchant, category);
  base.draft = draftOf(x);
  base.missing = x.missing;
  if (x.missing.length === 0) return { job: { ...base, status: "merged", category, reason: null }, extraction: x, category, save: true, escalation: null };

  // Escalation: Tier 1 for a narrow gap, Tier 2 for ambiguous multi-item or conflicting content.
  const ambiguous = x.items.length > 3 || (x.total != null && x.items.length > 0 && Math.abs(x.items.reduce((s, i) => s + (i.value.unitPrice ?? 0) * i.value.quantity, 0) - x.total.value) > x.total.value * 0.25);
  const tier: AiTier = ambiguous ? 2 : 1;
  const estimatedCostUsd = estimateCost(tier, estimateTokens(minimizeForAi(msg)) + 150);
  const budget = ctx.budgetUsd ?? BUDGET.monthlyUsdPerUser;
  const client = modelClients[tier];
  const overBudget = spentThisMonth(ctx.aiUsage, ctx.now) + estimatedCostUsd > budget;

  // Unknown order numbers on customer-shared receipts are normal (in-store); save what we have.
  const lowImpact = x.missing.every((m) => m === "order number") && (msg.channel === "shared_text" || msg.channel === "screenshot" || msg.channel === "pdf_upload" || msg.channel === "manual");
  if (lowImpact) return { job: { ...base, status: "merged", category, reason: null }, extraction: x, category, save: true, escalation: null };

  if (client && !overBudget) {
    return { job: { ...base, status: "failed", category, reason: "Waiting for AI extraction", tier }, extraction: x, category, save: false, escalation: { tier, fields: x.missing, estimatedCostUsd } };
  }
  // Tier 3: ask the customer. Never dropped.
  return {
    job: { ...base, status: "needs_review", category, tier: 3, reason: client ? "Monthly AI budget reached. Queued for your review instead." : `We couldn't read the ${x.missing.join(" and ")}.` },
    extraction: x,
    category,
    save: false,
    escalation: null,
  };
}

// ─── Metrics for the developer dashboard ─────────────────────────────────

export function pipelineMetrics(jobs: ProcessingJob[], usage: AiUsageEntry[], activeUsers = 1) {
  const total = jobs.length;
  const dupes = jobs.filter((j) => j.status === "duplicate").length;
  const processed = jobs.filter((j) => j.status !== "duplicate");
  const shopping = processed.filter((j) => !j.status.startsWith("skipped"));
  const recognized = processed.filter((j) => (j.status === "saved" || j.status === "merged") && j.orderId);
  const noAi = shopping.filter((j) => j.tier === 0 && (j.status === "saved" || j.status === "merged"));
  const cost = usage.reduce((s, u) => s + u.costUsd, 0);
  const failed = processed.filter((j) => j.status === "failed" || j.status === "dead_letter").length;
  const reviewed = jobs.filter((j) => j.tier === 3);
  const corrected = jobs.filter((j) => j.status === "saved" && j.tier === 3 && j.reason === "Corrected by you").length;
  const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);
  return {
    total,
    processed: processed.length,
    shopping: shopping.length,
    skippedPromotions: processed.filter((j) => j.status === "skipped_promotion").length,
    skippedIrrelevant: processed.filter((j) => j.status === "skipped_irrelevant").length,
    recognizedOrders: recognized.length,
    aiCalls: usage.length,
    aiCallsPer100: processed.length ? Math.round((usage.length / processed.length) * 1000) / 10 : 0,
    pctWithoutAi: pct(noAi.length, shopping.length),
    costUsd: cost,
    costPerMessage: processed.length ? cost / processed.length : 0,
    costPerOrder: recognized.length ? cost / recognized.length : 0,
    costPerUser: cost / Math.max(1, activeUsers),
    duplicateRate: pct(dupes, total),
    failureRate: pct(failed, processed.length),
    needsReview: jobs.filter((j) => j.status === "needs_review").length,
    deadLetter: jobs.filter((j) => j.status === "dead_letter").length,
    correctionRate: pct(corrected, reviewed.length),
  };
}

/** What the queued Tier 3 items would have cost with AI enabled, using placeholder prices. */
export function projectedAiCost(jobs: ProcessingJob[]): number {
  return jobs.filter((j) => j.tier === 3).length * estimateCost(1, 900);
}

