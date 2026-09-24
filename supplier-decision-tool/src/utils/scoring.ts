// Category scoring (0–100, higher is always better). Pure functions, no UI.
import { SCORE_CATEGORIES } from '../data/options';
import type { CostBreakdown, DecisionWeights, Level, RiskLevel, ScoreSet, Supplier, TriState } from '../types';
import { clamp, UNKNOWN_DEFAULTS } from './costs';

/** Score used when a sub-input is unknown: below neutral, so missing data never flatters a supplier. */
export const UNKNOWN_SCORE = 40;

export interface PeerContext {
  minCost: number; // lowest cost among suppliers on the mode's cost basis
  minLeadTime: number | null;
  evaluatedQuantity: number;
  costBasis: 'direct' | 'risk-adjusted';
}

const tri = (t: TriState, yes: number, no: number, unknown: number) => (t === 'yes' ? yes : t === 'no' ? no : unknown);
const tenScale = (v: number | null) => (v == null ? UNKNOWN_SCORE : clamp(v * 10));

/** 1% above the cheapest option costs 3 points; 33%+ above scores 0. */
export const COST_POINTS_PER_PCT = 3;

export const scoreTotalCost = (cost: number, minCost: number): number => {
  if (minCost <= 0) return 100;
  const pctAbove = ((cost - minCost) / minCost) * 100;
  return clamp(100 - pctAbove * COST_POINTS_PER_PCT);
};

export const certificationScore = (certs: string): number => {
  const text = certs.trim();
  if (!text) return UNKNOWN_SCORE;
  const count = text.split(/[,;\n]+/).filter((c) => c.trim()).length;
  let score = count >= 3 ? 100 : count === 2 ? 80 : 60;
  if (/self[- ]?declared|pending|expired/i.test(text)) score -= 15;
  return clamp(score);
};

export const incidentScore = (incidents: number | null): number => {
  if (incidents == null) return 50;
  return [100, 70, 45, 25][incidents] ?? 10;
};

export const scoreQuality = (s: Supplier): number => {
  const q = s.quality;
  return (
    0.45 * tenScale(q.qualityRating) +
    0.15 * tenScale(s.info.supplierQualityRating) +
    0.2 * tenScale(q.batchConsistency) +
    0.1 * certificationScore(q.certifications) +
    0.1 * incidentScore(q.pastQualityIncidents)
  );
};

export const scoreFailureRisk = (effectiveDefect: number): number => clamp(100 - 60 * effectiveDefect);

export const scoreDeliveryReliability = (s: Supplier): number => {
  const otd = s.delivery.onTimePct ?? UNKNOWN_DEFAULTS.onTimePct;
  const variability = s.delivery.leadTimeVariabilityDays ?? UNKNOWN_DEFAULTS.leadTimeVariabilityDays;
  return 0.8 * clamp(((otd - 80) / 20) * 100) + 0.2 * clamp(100 - variability * 10);
};

export const scoreLeadTime = (s: Supplier, minLead: number | null): number => {
  const lt = s.delivery.leadTimeDays;
  if (lt == null) return UNKNOWN_SCORE;
  if (lt <= 0 || minLead == null) return 100;
  return clamp((Math.max(minLead, 0.5) / lt) * 100);
};

/** Contract protection components — points out of 100. */
export const contractProtectionBreakdown = (s: Supplier): { label: string; points: number; max: number }[] => {
  const p = s.protection;
  const q = s.quote;
  const lin = (v: number | null, full: number, max: number, unknown: number) =>
    v == null ? unknown : clamp((v / full) * max, 0, max);
  const cancellation =
    q.cancellation === 'penalty-free'
      ? 5
      : q.cancellation === 'fee'
        ? clamp(5 * (1 - (q.cancellationFeePct ?? 10) / 20), 0, 5)
        : q.cancellation === 'non-cancellable'
          ? 0
          : 1;
  return [
    { label: 'Return window', points: lin(p.returnWindowDays, 60, 10, 2), max: 10 },
    { label: 'Return freight', points: { supplier: 10, shared: 5, buyer: 0, unknown: 2 }[p.returnShipping], max: 10 },
    {
      label: 'Replacement policy',
      points: { full: 15, 'replacement-only': 10, credit: 7, 'case-by-case': 3, none: 0, unknown: 3 }[p.replacementPolicy],
      max: 15,
    },
    { label: 'Warranty', points: lin(p.warrantyMonths, 12, 10, 2), max: 10 },
    { label: 'Product liability', points: tri(p.productLiability, 10, 0, 3), max: 10 },
    { label: 'Insurance coverage', points: tri(p.insuranceCoverage, 8, 0, 2.4), max: 8 },
    { label: 'Defective material compensation', points: tri(p.defectCompensation, 12, 0, 3.6), max: 12 },
    { label: 'Late-delivery credits', points: tri(p.lateDeliveryCredits, 10, 0, 3), max: 10 },
    { label: 'Price lock', points: lin(q.priceLockMonths, 12, 10, 2), max: 10 },
    { label: 'Cancellation terms', points: cancellation, max: 5 },
  ];
};

export const scoreContractProtection = (s: Supplier): number =>
  clamp(contractProtectionBreakdown(s).reduce((sum, c) => sum + c.points, 0));

/** MOQ burden: an MOQ of ≤25% of your volume is fully flexible; ≥100% scores 0. */
export const moqScore = (moq: number | null, qty: number): number => {
  if (moq == null || qty <= 0) return UNKNOWN_SCORE + 10;
  const r = moq / qty;
  if (r <= 0.25) return 100;
  return clamp(100 * (1 - (r - 0.25) / 0.75));
};

export const scorePaymentTerms = (s: Supplier, qty: number): number => {
  const days = s.quote.paymentTermsDays ?? 30;
  const deposit = s.quote.depositPct ?? 0;
  const termsComponent = clamp((days / 75) * 100);
  const depositComponent = clamp(100 - deposit * 2.5);
  const known = s.quote.paymentTermsDays != null ? 1 : 0.85;
  return (0.7 * termsComponent + 0.2 * depositComponent + 0.1 * moqScore(s.quote.moq, qty)) * known;
};

const RELATIONSHIP_SCORE = { new: 30, limited: 55, existing: 80, strategic: 100 } as const;

export const scoreSupplierStrength = (s: Supplier): number =>
  0.5 * tenScale(s.info.financialStrength) +
  0.25 * (s.info.yearsInBusiness == null ? UNKNOWN_SCORE : clamp((s.info.yearsInBusiness / 25) * 100)) +
  0.25 * RELATIONSHIP_SCORE[s.info.relationship];

const surge = (l: Level | 'unknown') => ({ high: 100, moderate: 60, low: 20, unknown: UNKNOWN_SCORE })[l];

export const scoreFlexibility = (s: Supplier, qty: number): number => {
  const q = s.quote;
  const cancel =
    q.cancellation === 'penalty-free'
      ? 100
      : q.cancellation === 'fee'
        ? clamp(100 - (q.cancellationFeePct ?? 10) * 5)
        : q.cancellation === 'non-cancellable'
          ? 0
          : 30;
  return (
    0.3 * cancel +
    0.3 * surge(s.delivery.surgeCapacity) +
    0.2 * tri(s.delivery.expeditedAvailable, 100, 0, UNKNOWN_SCORE) +
    0.2 * moqScore(q.moq, qty)
  );
};

export const scoreSupplier = (s: Supplier, costs: CostBreakdown, ctx: PeerContext): ScoreSet => {
  const cost = ctx.costBasis === 'direct' ? costs.direct : costs.riskAdjusted;
  return {
    totalCost: scoreTotalCost(cost, ctx.minCost),
    quality: scoreQuality(s),
    failureRisk: scoreFailureRisk(costs.effectiveDefectPct),
    deliveryReliability: scoreDeliveryReliability(s),
    leadTime: scoreLeadTime(s, ctx.minLeadTime),
    contractProtection: scoreContractProtection(s),
    paymentTerms: scorePaymentTerms(s, ctx.evaluatedQuantity),
    supplierStrength: scoreSupplierStrength(s),
    flexibility: scoreFlexibility(s, ctx.evaluatedQuantity),
    supplyContinuity: clamp(100 - costs.disruptionRiskIndex),
  };
};

export const overallScore = (scores: ScoreSet, weights: DecisionWeights): number =>
  SCORE_CATEGORIES.reduce((sum, c) => sum + scores[c] * weights[c], 0);

export const riskLevel = (scores: ScoreSet): RiskLevel => {
  const safety = (scores.failureRisk + scores.deliveryReliability + scores.supplyContinuity + scores.supplierStrength) / 4;
  const risk = 100 - safety;
  if (risk < 20) return 'Low';
  if (risk < 35) return 'Moderate';
  if (risk < 50) return 'Elevated';
  return 'High';
};
