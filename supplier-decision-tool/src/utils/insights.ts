// Fact-based strengths, weaknesses and ranking explanations.
import { modeById } from '../data/modes';
import type { DecisionMode, DecisionWeights, Purchase, ScoreCategory, SupplierScore } from '../types';
import { UNKNOWN_DEFAULTS } from './costs';
import type { RawResult } from './evaluate';
import { compactMoney, defectPct, joinList, netTerms, pct, singularUnit, unitMoney } from './format';

interface Metric {
  category: ScoreCategory;
  better: 'low' | 'high';
  value: (r: RawResult) => number | null;
  strength: (v: number, r: RawResult) => string;
  weakness: (v: number, r: RawResult) => string;
}

const metrics = (purchase: Purchase): Metric[] => {
  const cur = purchase.baseCurrency;
  const unit = singularUnit(purchase.unit);
  return [
    {
      category: 'totalCost',
      better: 'low',
      value: (r) => r.costs.riskAdjusted,
      strength: (v) => `Lowest risk-adjusted total cost (${compactMoney(v, cur)})`,
      weakness: (v) => `Highest risk-adjusted total cost (${compactMoney(v, cur)})`,
    },
    {
      category: 'totalCost',
      better: 'low',
      value: (r) => (r.supplier.quote.unitPrice == null ? null : r.costs.unitPriceBase),
      strength: (v) => `Lowest quoted unit price (${unitMoney(v, cur)}/${unit})`,
      weakness: (v) => `Highest quoted unit price (${unitMoney(v, cur)}/${unit})`,
    },
    {
      category: 'totalCost',
      better: 'low',
      value: (r) => r.costs.direct,
      strength: (v) => `Lowest direct cost before risk adjustments (${compactMoney(v, cur)})`,
      weakness: (v) => `Highest direct cost before risk adjustments (${compactMoney(v, cur)})`,
    },
    {
      category: 'failureRisk',
      better: 'low',
      value: (r) => r.costs.effectiveDefectPct,
      strength: (v, r) => `Lowest expected defect rate (${defectPct(v)}) and defect cost (${compactMoney(r.costs.expectedQualityFailure, cur)})`,
      weakness: (v, r) => `Highest defect rate (${defectPct(v)}), adding an expected ${compactMoney(r.costs.expectedQualityFailure, cur)} in failure costs`,
    },
    {
      category: 'quality',
      better: 'low',
      value: (r) => r.costs.qualityControl,
      strength: (v) => `Lowest inspection and testing requirement (${compactMoney(v, cur)})`,
      weakness: (v) => `Highest inspection and testing cost (${compactMoney(v, cur)})`,
    },
    {
      category: 'quality',
      better: 'high',
      value: (r) => r.supplier.quality.qualityRating,
      strength: (v) => `Highest material quality rating (${v}/10)`,
      weakness: (v) => `Lowest material quality rating (${v}/10)`,
    },
    {
      category: 'deliveryReliability',
      better: 'high',
      value: (r) => r.supplier.delivery.onTimePct,
      strength: (v) => `Strongest on-time delivery record (${pct(v)})`,
      weakness: (v) => `Weakest on-time delivery record (${pct(v)})`,
    },
    {
      category: 'leadTime',
      better: 'low',
      value: (r) => r.supplier.delivery.leadTimeDays,
      strength: (v) => `Fastest lead time (${v} days)`,
      weakness: (v) => `Longest lead time (${v} days)`,
    },
    {
      category: 'paymentTerms',
      better: 'high',
      value: (r) => r.supplier.quote.paymentTermsDays,
      strength: (v) => `Best payment terms (${netTerms(v)})`,
      weakness: (v) => `Shortest payment terms (${netTerms(v)})`,
    },
    {
      category: 'contractProtection',
      better: 'high',
      value: (r) => r.supplier.quote.priceLockMonths,
      strength: (v) => `Longest price lock (${v} months)`,
      weakness: (v) => `Shortest price lock (${v} months)`,
    },
    {
      category: 'contractProtection',
      better: 'high',
      value: (r) => r.scores.contractProtection,
      strength: () => 'Strongest overall contract protection',
      weakness: () => 'Weakest contractual protection',
    },
    {
      category: 'supplierStrength',
      better: 'high',
      value: (r) => r.supplier.info.financialStrength,
      strength: (v) => `Strongest financial position (${v}/10)`,
      weakness: (v) => `Weakest financial position (${v}/10)`,
    },
    {
      category: 'supplyContinuity',
      better: 'low',
      value: (r) => r.costs.disruptionRiskIndex,
      strength: (_v, r) => `Lowest supply-disruption risk (expected cost ${compactMoney(r.costs.expectedDisruption, cur)})`,
      weakness: (_v, r) => `Highest supply-disruption risk (expected cost ${compactMoney(r.costs.expectedDisruption, cur)})`,
    },
  ];
};

interface Tagged {
  text: string;
  category: ScoreCategory;
}

/** Absolute (non-comparative) observations that matter regardless of peers. */
const absoluteNotes = (r: RawResult): { strengths: Tagged[]; weaknesses: Tagged[] } => {
  const s = r.supplier;
  const strengths: Tagged[] = [];
  const weaknesses: Tagged[] = [];
  const p = s.protection;
  if (p.replacementPolicy === 'full' && p.returnShipping === 'supplier')
    strengths.push({ text: 'Strong return protection: full replacement with supplier-paid return freight', category: 'contractProtection' });
  else if (p.replacementPolicy === 'full')
    strengths.push({ text: 'Full replacement or refund for verified defects', category: 'contractProtection' });
  if (p.returnShipping === 'buyer')
    weaknesses.push({ text: 'Buyer pays return freight on defective material', category: 'contractProtection' });
  if (p.replacementPolicy === 'case-by-case' || p.replacementPolicy === 'none')
    weaknesses.push({ text: `Returns ${p.replacementPolicy === 'none' ? 'not accepted' : 'handled only case-by-case'}`, category: 'contractProtection' });
  if (s.quote.cancellation === 'penalty-free')
    strengths.push({ text: 'Penalty-free cancellation with notice', category: 'flexibility' });
  if (s.quote.cancellation === 'non-cancellable')
    weaknesses.push({ text: 'Non-cancellable once production begins', category: 'flexibility' });
  if (s.quote.cancellation === 'fee' && (s.quote.cancellationFeePct ?? 0) > 0)
    weaknesses.push({ text: `${s.quote.cancellationFeePct}% cancellation fee`, category: 'flexibility' });
  if (p.lateDeliveryCredits === 'yes')
    strengths.push({ text: 'Late-delivery penalties or credits in the contract', category: 'contractProtection' });
  if (s.risk.singleSource === 'yes' && s.risk.backupProduction !== 'yes')
    weaknesses.push({ text: 'Single-source manufacturing with no backup production', category: 'supplyContinuity' });
  if (s.risk.multipleFacilities === 'yes' && s.risk.backupProduction === 'yes')
    strengths.push({ text: 'Multiple production facilities with backup capacity', category: 'supplyContinuity' });
  if (s.risk.geographicRisk === 'high') weaknesses.push({ text: 'High geographic risk', category: 'supplyContinuity' });
  if (s.info.relationship === 'new') weaknesses.push({ text: 'New supplier — no purchasing history with your company', category: 'supplierStrength' });
  if (s.info.relationship === 'strategic') strengths.push({ text: 'Established strategic supplier relationship', category: 'supplierStrength' });
  if ((s.quote.depositPct ?? 0) > 0) weaknesses.push({ text: `Requires a ${s.quote.depositPct}% deposit`, category: 'paymentTerms' });
  if ((s.quality.pastQualityIncidents ?? 0) > 0)
    weaknesses.push({
      text: `${s.quality.pastQualityIncidents} past quality incident${s.quality.pastQualityIncidents === 1 ? '' : 's'}`,
      category: 'quality',
    });
  if (s.quality.qualityDataSource === 'self-reported')
    weaknesses.push({ text: 'Quality metrics are self-reported', category: 'failureRisk' });
  return { strengths, weaknesses };
};

export const buildInsights = (
  res: SupplierScore,
  all: RawResult[],
  weights: DecisionWeights,
  purchase: Purchase,
): { strengths: string[]; weaknesses: string[]; assumed: string[] } => {
  const me = all.find((r) => r.supplier.id === res.supplierId)!;
  const strengths: Tagged[] = [];
  const weaknesses: Tagged[] = [];
  if (all.length >= 2) {
    for (const m of metrics(purchase)) {
      const vals = all.map((r) => m.value(r)).filter((v): v is number => v != null && Number.isFinite(v));
      const mine = m.value(me);
      if (mine == null || vals.length < 2) continue;
      const best = m.better === 'low' ? Math.min(...vals) : Math.max(...vals);
      const worst = m.better === 'low' ? Math.max(...vals) : Math.min(...vals);
      if (Math.abs(best - worst) < 1e-9) continue;
      if (Math.abs(mine - best) < 1e-9) strengths.push({ text: m.strength(mine, me), category: m.category });
      else if (Math.abs(mine - worst) < 1e-9) weaknesses.push({ text: m.weakness(mine, me), category: m.category });
    }
  }
  const abs = absoluteNotes(me);
  strengths.push(...abs.strengths);
  weaknesses.push(...abs.weaknesses);

  const byWeight = (a: Tagged, b: Tagged) => weights[b.category] - weights[a.category];
  const dedupe = (xs: Tagged[]) => [...new Map(xs.map((x) => [x.text, x])).values()];

  const s = me.supplier;
  const assumed: string[] = [];
  if (me.costs.defectRateAssumed)
    assumed.push(`Defect rate unknown — assumed ${defectPct(me.costs.effectiveDefectPct)} for expected failure cost.`);
  if (s.delivery.onTimePct == null) assumed.push(`On-time delivery unknown — assumed ${UNKNOWN_DEFAULTS.onTimePct}%.`);
  if (s.delivery.leadTimeVariabilityDays == null)
    assumed.push(`Lead-time variability unknown — assumed ${UNKNOWN_DEFAULTS.leadTimeVariabilityDays} days.`);
  if (s.info.financialStrength == null)
    assumed.push(`Financial strength unknown — assumed ${UNKNOWN_DEFAULTS.financialStrength}/10.`);
  if (s.quote.paymentTermsDays == null) assumed.push('Payment terms unknown — assumed Net 30 (scored slightly below known Net 30).');

  return {
    strengths: dedupe(strengths).sort(byWeight).slice(0, 6).map((t) => t.text),
    weaknesses: dedupe(weaknesses).sort(byWeight).slice(0, 6).map((t) => t.text),
    assumed,
  };
};

export const GAP_PHRASES: Record<ScoreCategory, string> = {
  totalCost: 'higher risk-adjusted total cost',
  quality: 'lower material quality',
  failureRisk: 'higher defect risk',
  deliveryReliability: 'weaker delivery reliability',
  leadTime: 'longer lead times',
  contractProtection: 'limited contractual protection',
  paymentTerms: 'less favorable payment terms',
  supplierStrength: 'weaker supplier financial strength',
  flexibility: 'less contract and volume flexibility',
  supplyContinuity: 'greater supply-continuity risk',
};

export const LEAD_PHRASES: Record<ScoreCategory, string> = {
  totalCost: 'risk-adjusted cost',
  quality: 'material quality',
  failureRisk: 'defect risk',
  deliveryReliability: 'delivery reliability',
  leadTime: 'lead time',
  contractProtection: 'contract protection',
  paymentTerms: 'payment terms',
  supplierStrength: 'supplier strength',
  flexibility: 'flexibility',
  supplyContinuity: 'supply continuity',
};

/** Weighted score gaps between two suppliers, largest first (positive = `a` is ahead). */
export const weightedGaps = (a: SupplierScore, b: SupplierScore, weights: DecisionWeights) =>
  (Object.keys(weights) as ScoreCategory[])
    .map((c) => ({ category: c, gap: (a.scores[c] - b.scores[c]) * weights[c] }))
    .sort((x, y) => y.gap - x.gap);

export const rankExplanation = (
  res: SupplierScore,
  results: SupplierScore[],
  raw: RawResult[],
  weights: DecisionWeights,
  mode: DecisionMode,
): string => {
  const modeLabel = modeById(mode).label;
  const leader = results[0];
  if (res.rank === 1) {
    if (results.length < 2) return `${res.name} is the only supplier evaluated.`;
    const leads = weightedGaps(res, results[1], weights)
      .filter((g) => g.gap > 0.3)
      .slice(0, 3)
      .map((g) => LEAD_PHRASES[g.category]);
    return leads.length
      ? `${res.name} ranks first under ${modeLabel}, leading on ${joinList(leads)}.`
      : `${res.name} ranks first under ${modeLabel}, narrowly ahead of ${results[1].name}.`;
  }
  const gaps = weightedGaps(leader, res, weights).filter((g) => g.gap > 0.3);
  const reasons = gaps.slice(0, 3).map((g) => GAP_PHRASES[g.category]);
  const advantages = weightedGaps(res, leader, weights)
    .filter((g) => g.gap > 0.5)
    .slice(0, 2)
    .map((g) => LEAD_PHRASES[g.category]);

  const prices = raw.filter((r) => r.supplier.quote.unitPrice != null).map((r) => r.costs.unitPriceBase);
  const mine = raw.find((r) => r.supplier.id === res.supplierId);
  const lowestPrice =
    mine && mine.supplier.quote.unitPrice != null && prices.length > 1 && mine.costs.unitPriceBase === Math.min(...prices);
  const lowestDirect = raw.length > 1 && res.costs.direct === Math.min(...raw.map((r) => r.costs.direct));

  const why = reasons.length ? joinList(reasons) : 'small differences across several categories';
  let text: string;
  if (lowestPrice) text = `${res.name} has the lowest headline price but ranks lower because of ${why}.`;
  else if (lowestDirect) text = `${res.name} has the lowest direct cost but ranks lower because of ${why}.`;
  else text = `${res.name} ranks #${res.rank} behind ${leader.name}, mainly because of ${why}.`;
  if (advantages.length) text += ` It does outperform ${leader.name} on ${joinList(advantages)}.`;
  return text;
};
