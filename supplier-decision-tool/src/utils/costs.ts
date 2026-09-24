// Cost-bucket and risk-adjustment formulas. Pure functions, no UI.
import type { Assumptions, CostBreakdown, Level, Purchase, PurchaseFrequency, Severity, Supplier, TriState } from '../types';

export const clamp = (v: number, lo = 0, hi = 100): number => Math.min(hi, Math.max(lo, v));
const n = (v: number | null | undefined): number => (v == null || !Number.isFinite(v) ? 0 : v);

/** Defaults used only when the user leaves the corresponding input as Unknown. */
export const DEFAULT_QUALITY_FAILURE_SHARE: Record<Severity, number> = { low: 0.05, moderate: 0.1, high: 0.15, critical: 0.25 };
export const DEFAULT_DAILY_DISRUPTION_SHARE: Record<Severity, number> = { low: 0.002, moderate: 0.006, high: 0.02, critical: 0.05 };
export const FREQUENCY_DISRUPTION_FACTOR: Record<PurchaseFrequency, number> = {
  'one-time': 0.5,
  monthly: 1,
  quarterly: 1,
  annual: 1,
  ongoing: 1,
};

/** Assumed values substituted when a risk input is unknown (conservative, never flattering). */
export const UNKNOWN_DEFAULTS = {
  onTimePct: 90,
  leadTimeVariabilityDays: 5,
  financialStrength: 5,
  defectPctNoData: 1.0,
};

export interface CostContext {
  qualityFailureCostBasis: number;
  qualityFailureCostAssumed: boolean;
  dailyDisruptionCost: number;
  dailyDisruptionCostAssumed: boolean;
  evaluatedQuantity: number;
  typicalPurchaseValue: number;
}

export const fxRateFor = (s: Supplier, purchase: Purchase): number =>
  s.quote.currency === purchase.baseCurrency ? 1 : n(s.quote.fxRate) || 1;

export const evaluatedQuantityFor = (purchase: Purchase, suppliers: Supplier[]): number => {
  if (purchase.quantity && purchase.quantity > 0) return purchase.quantity;
  const q = suppliers.map((s) => s.quote.quotedQuantity).find((v) => v && v > 0);
  return q ?? 0;
};

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Purchase-level cost assumptions shared by every supplier so the comparison is like-for-like. */
export const buildCostContext = (purchase: Purchase, suppliers: Supplier[]): CostContext => {
  const qty = evaluatedQuantityFor(purchase, suppliers);
  const values = suppliers
    .filter((s) => s.quote.unitPrice != null && s.quote.unitPrice > 0)
    .map((s) => n(s.quote.unitPrice) * fxRateFor(s, purchase) * qty);
  const typical = median(values);
  const qfAssumed = purchase.qualityFailureImpact == null;
  const ddAssumed = purchase.dailyDisruptionCost == null;
  return {
    evaluatedQuantity: qty,
    typicalPurchaseValue: typical,
    qualityFailureCostBasis: qfAssumed
      ? Math.round(typical * DEFAULT_QUALITY_FAILURE_SHARE[purchase.defectConsequence])
      : n(purchase.qualityFailureImpact),
    qualityFailureCostAssumed: qfAssumed,
    dailyDisruptionCost: ddAssumed
      ? Math.max(1000, Math.round(typical * DEFAULT_DAILY_DISRUPTION_SHARE[purchase.interruptionConsequence]))
      : n(purchase.dailyDisruptionCost),
    dailyDisruptionCostAssumed: ddAssumed,
  };
};

/** Effective defect rate: the higher of estimated and historical (conservative). */
export const effectiveDefectPct = (s: Supplier): { value: number; assumed: boolean } => {
  const est = s.quality.estimatedDefectPct;
  const hist = s.quality.historicalDefectPct;
  if (est != null && hist != null) return { value: Math.max(est, hist), assumed: false };
  if (hist != null) return { value: hist, assumed: false };
  if (est != null) return { value: est, assumed: false };
  // No defect data: infer from the material quality rating, otherwise a conservative 1%.
  const q = s.quality.qualityRating;
  if (q != null) return { value: Math.max(0.1, (10 - q) * 0.25), assumed: true };
  return { value: UNKNOWN_DEFAULTS.defectPctNoData, assumed: true };
};

/** Share of expected quality-failure cost the supplier's protections would recover (0–35%). */
export const protectionOffsetPct = (s: Supplier): number => {
  const p = s.protection;
  let pct = { full: 15, 'replacement-only': 8, credit: 6, 'case-by-case': 3, none: 0, unknown: 0 }[p.replacementPolicy];
  pct += { supplier: 5, shared: 2, buyer: 0, unknown: 0 }[p.returnShipping];
  if (p.defectCompensation === 'yes') pct += 10;
  if (p.warrantyMonths != null) pct += p.warrantyMonths >= 12 ? 5 : p.warrantyMonths >= 6 ? 3 : p.warrantyMonths > 0 ? 1 : 0;
  return Math.min(35, pct);
};

const levelValue = (l: Level | 'unknown'): number => ({ low: 0, moderate: 0.5, high: 1, unknown: 0.5 })[l];
const tri = (t: TriState, yes: number, no: number, unknown: number): number =>
  t === 'yes' ? yes : t === 'no' ? no : unknown;

export interface DisruptionFactors {
  lateDelivery: number;
  variability: number;
  financialWeakness: number;
  concentration: number;
  geographic: number;
  rawMaterial: number;
}

export const DISRUPTION_FACTOR_WEIGHTS: Record<keyof DisruptionFactors, number> = {
  lateDelivery: 35,
  variability: 15,
  financialWeakness: 15,
  concentration: 15,
  geographic: 10,
  rawMaterial: 10,
};

export const DISRUPTION_FACTOR_LABELS: Record<keyof DisruptionFactors, string> = {
  lateDelivery: 'Late-delivery rate (100% − on-time %, 15%+ late = max)',
  variability: 'Lead-time variability (10+ days = max)',
  financialWeakness: 'Supplier financial weakness (rating 5/10 or lower = max)',
  concentration: 'Supply concentration (single source, facilities, backup)',
  geographic: 'Geographic risk',
  rawMaterial: 'Raw material availability risk',
};

/** Each factor is 0 (no risk) to 1 (maximum risk). */
export const disruptionFactors = (s: Supplier): DisruptionFactors => {
  const otd = s.delivery.onTimePct ?? UNKNOWN_DEFAULTS.onTimePct;
  const variability = s.delivery.leadTimeVariabilityDays ?? UNKNOWN_DEFAULTS.leadTimeVariabilityDays;
  const strength = s.info.financialStrength ?? UNKNOWN_DEFAULTS.financialStrength;
  const structural =
    tri(s.risk.singleSource, 0.5, 0, 0.25) +
    tri(s.risk.multipleFacilities, 0, 0.25, 0.125) +
    tri(s.risk.backupProduction, 0, 0.25, 0.125);
  return {
    lateDelivery: clamp((100 - otd) / 15, 0, 1),
    variability: clamp(variability / 10, 0, 1),
    financialWeakness: clamp((10 - strength) / 5, 0, 1),
    concentration: clamp(0.6 * structural + 0.4 * levelValue(s.risk.supplyChainConcentration), 0, 1),
    geographic: levelValue(s.risk.geographicRisk),
    rawMaterial: levelValue(s.risk.rawMaterialAvailabilityRisk),
  };
};

/** Relative disruption risk index 0–100 (an estimate, not a probability). */
export const disruptionRiskIndex = (s: Supplier): number => {
  const f = disruptionFactors(s);
  return (Object.keys(f) as (keyof DisruptionFactors)[]).reduce(
    (sum, k) => sum + f[k] * DISRUPTION_FACTOR_WEIGHTS[k],
    0,
  );
};

export const LATE_CREDIT_OFFSET_PCT = 15;

export const computeCosts = (
  s: Supplier,
  purchase: Purchase,
  assumptions: Assumptions,
  ctx: CostContext,
): CostBreakdown => {
  const fx = fxRateFor(s, purchase);
  const qty = ctx.evaluatedQuantity;
  const quoted = s.quote.quotedQuantity && s.quote.quotedQuantity > 0 ? s.quote.quotedQuantity : qty;
  // Per-shipment costs quoted for a different quantity are scaled to the required volume.
  const scale = quoted > 0 ? qty / quoted : 1;

  const unitPriceBase = n(s.quote.unitPrice) * fx;
  const purchaseCost = unitPriceBase * qty * (1 - clamp(n(s.quote.volumeDiscountPct), 0, 100) / 100);
  const q = s.quote;
  const logistics =
    (n(q.freight) + n(q.insurance) + n(q.duties) + n(q.handling) + n(q.warehousing) + n(q.otherLogistics)) * fx * scale;
  // Inspection, testing and certification review are the buyer's own costs (base currency).
  const inspection = s.quality.inspectionRequired === 'no' ? 0 : n(s.quality.inspectionCost);
  const qualityControl = (inspection + n(s.quality.testingCost) + n(s.quality.certificationReviewCost)) * scale;
  const contractAdmin = n(q.adminFees) * fx + n(s.info.onboardingCost);

  const landed = purchaseCost + logistics;
  const direct = landed + qualityControl + contractAdmin;

  const defect = effectiveDefectPct(s);
  const refRate = assumptions.referenceDefectRate > 0 ? assumptions.referenceDefectRate : 1;
  const qfGross = (defect.value / refRate) * ctx.qualityFailureCostBasis;
  const offset = protectionOffsetPct(s);
  const qfNet = qfGross * (1 - offset / 100);

  const riskIndex = disruptionRiskIndex(s);
  const expectedDays =
    (riskIndex / 100) * assumptions.expectedDisruptionDaysAtMaxRisk * FREQUENCY_DISRUPTION_FACTOR[purchase.frequency];
  const disruptionGross = expectedDays * ctx.dailyDisruptionCost;
  const lateOffset = s.protection.lateDeliveryCredits === 'yes' ? LATE_CREDIT_OFFSET_PCT : 0;
  const disruptionNet = disruptionGross * (1 - lateOffset / 100);

  return {
    evaluatedQuantity: qty,
    scaleFactor: scale,
    unitPriceBase,
    purchase: purchaseCost,
    logistics,
    qualityControl,
    contractAdmin,
    landed,
    direct,
    expectedQualityFailure: qfNet,
    expectedQualityFailureGross: qfGross,
    protectionOffsetPct: offset,
    expectedDisruption: disruptionNet,
    expectedDisruptionGross: disruptionGross,
    lateCreditOffsetPct: lateOffset,
    disruptionRiskIndex: riskIndex,
    expectedDisruptionDays: expectedDays,
    effectiveDefectPct: defect.value,
    defectRateAssumed: defect.assumed,
    riskAdjusted: direct + qfNet + disruptionNet,
    upfrontCash: purchaseCost * (clamp(n(s.quote.depositPct), 0, 100) / 100),
  };
};

/** Annual value of the extra payable float from `days` of payment terms. */
export const workingCapitalValue = (annualSpend: number, extraDays: number, costOfCapitalPct: number): {
  cashFreed: number;
  financingValue: number;
} => {
  const cashFreed = (annualSpend * extraDays) / 365;
  return { cashFreed, financingValue: cashFreed * (costOfCapitalPct / 100) };
};
