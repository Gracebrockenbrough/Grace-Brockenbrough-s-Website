import { modeById } from '../data/modes';
import { PRIORITY_FACTORS, SCORE_CATEGORIES } from '../data/options';
import type { DecisionMode, DecisionWeights, Priorities, PriorityFactor, Purchase, ScoreCategory, Severity } from '../types';

/** Rating → points. "Critical" is deliberately more than one step above "Very Important". */
export const PRIORITY_POINTS = [0, 1, 2, 3, 5] as const;

/** How each user-facing priority factor feeds the ten scoring categories. Each row sums to 1. */
export const FACTOR_TO_CATEGORY: Record<PriorityFactor, Partial<Record<ScoreCategory, number>>> = {
  quality: { quality: 1 },
  defectRisk: { failureRisk: 1 },
  totalCost: { totalCost: 1 },
  fastDelivery: { leadTime: 1 },
  reliableDelivery: { deliveryReliability: 0.6, supplyContinuity: 0.4 },
  contractProtection: { contractProtection: 1 },
  returnFlexibility: { contractProtection: 0.6, flexibility: 0.4 },
  insurance: { contractProtection: 1 },
  financialStrength: { supplierStrength: 0.7, supplyContinuity: 0.3 },
  paymentTerms: { paymentTerms: 1 },
  priceStability: { contractProtection: 0.5, totalCost: 0.5 },
  flexibility: { flexibility: 1 },
  lowInspection: { quality: 0.4, totalCost: 0.3, failureRisk: 0.3 },
};

const SEVERITY_MULTIPLIER: Record<Severity, number> = { low: 0.85, moderate: 1, high: 1.2, critical: 1.4 };

export const zeroWeights = (): DecisionWeights =>
  Object.fromEntries(SCORE_CATEGORIES.map((c) => [c, 0])) as DecisionWeights;

export const normalizeWeights = (w: DecisionWeights): DecisionWeights => {
  const total = SCORE_CATEGORIES.reduce((s, c) => s + Math.max(0, w[c] || 0), 0);
  if (total <= 0) {
    const eq = 1 / SCORE_CATEGORIES.length;
    return Object.fromEntries(SCORE_CATEGORIES.map((c) => [c, eq])) as DecisionWeights;
  }
  return Object.fromEntries(SCORE_CATEGORIES.map((c) => [c, Math.max(0, w[c] || 0) / total])) as DecisionWeights;
};

/** Derive category weights (normalised) from the Step 2 ratings and the Step 1 consequences. */
export const weightsFromPriorities = (priorities: Priorities, purchase: Purchase): DecisionWeights => {
  const w = zeroWeights();
  for (const { key } of PRIORITY_FACTORS) {
    const pts = PRIORITY_POINTS[priorities[key]] ?? 0;
    for (const [cat, share] of Object.entries(FACTOR_TO_CATEGORY[key]) as [ScoreCategory, number][]) {
      w[cat] += pts * share;
    }
  }
  const dq = SEVERITY_MULTIPLIER[purchase.defectConsequence];
  const di = SEVERITY_MULTIPLIER[purchase.interruptionConsequence];
  w.quality *= dq;
  w.failureRisk *= dq;
  w.deliveryReliability *= di;
  w.supplyContinuity *= di;
  w.leadTime *= 1 + (di - 1) / 2;
  return normalizeWeights(w);
};

/** The effective, normalised weights for a decision mode. */
export const getWeights = (
  mode: DecisionMode,
  priorities: Priorities,
  purchase: Purchase,
  advancedWeights: DecisionWeights | null,
): DecisionWeights => {
  if (mode === 'custom') {
    return advancedWeights ? normalizeWeights(advancedWeights) : weightsFromPriorities(priorities, purchase);
  }
  return normalizeWeights(modeById(mode).weights!);
};

/** Cash Preservation scores cost on actual cash outlay; all other modes on risk-adjusted cost. */
export const costBasisForMode = (mode: DecisionMode): 'direct' | 'risk-adjusted' =>
  mode === 'cash-preservation' ? 'direct' : 'risk-adjusted';

const GROUPS: { label: string; factors: PriorityFactor[] }[] = [
  { label: 'quality', factors: ['quality', 'defectRisk', 'lowInspection'] },
  { label: 'supply reliability', factors: ['reliableDelivery', 'fastDelivery'] },
  { label: 'contract and supplier protection', factors: ['contractProtection', 'returnFlexibility', 'insurance', 'financialStrength'] },
  { label: 'cash and payment terms', factors: ['paymentTerms'] },
];

/** A short plain-English read-out of what the ratings imply. */
export const prioritySummary = (priorities: Priorities): string => {
  const avg = (fs: PriorityFactor[]) => fs.reduce((s, f) => s + PRIORITY_POINTS[priorities[f]], 0) / fs.length;
  const cost = (PRIORITY_POINTS[priorities.totalCost] + PRIORITY_POINTS[priorities.priceStability] * 0.5) / 1.5;
  const scored = GROUPS.map((g) => ({ label: g.label, value: avg(g.factors) })).sort((a, b) => b.value - a.value);
  const all = Object.values(priorities);
  if (all.every((v) => v === all[0])) {
    return 'All factors are rated equally, so the evaluation will weigh cost, quality, delivery and protection evenly.';
  }
  const top = scored.filter((g) => g.value >= scored[0].value - 1 && g.value > 0).slice(0, 2);
  const topText = top.map((g) => g.label).join(' and ');
  const topVal = top[0]?.value ?? 0;
  if (cost >= topVal + 0.5) {
    return `Your priorities indicate that total cost matters more than ${topText}. Expected failure and disruption costs are still included in the total cost figure.`;
  }
  if (topVal - cost >= 1.2) {
    return `Your priorities indicate that ${topText} ${top.length > 1 ? 'matter' : 'matters'} significantly more than headline price.`;
  }
  if (topVal - cost >= 0.4) {
    return `Your priorities lean toward ${topText}, while still giving meaningful weight to total cost.`;
  }
  return `Your priorities balance total cost with ${topText}.`;
};
