// Orchestrates costs → scores → overall ranking for all suppliers under one decision mode.
import type {
  Assumptions,
  CostBreakdown,
  DecisionMode,
  DecisionWeights,
  Evaluation,
  Priorities,
  Purchase,
  ScoreSet,
  Supplier,
  SupplierScore,
} from '../types';
import { buildCostContext, computeCosts, type CostContext } from './costs';
import { supplierConfidence } from './confidence';
import { buildInsights, rankExplanation } from './insights';
import { overallScore, riskLevel, scoreSupplier } from './scoring';
import { costBasisForMode, getWeights } from './weights';

export interface EvalInput {
  purchase: Purchase;
  suppliers: Supplier[];
  assumptions: Assumptions;
  priorities: Priorities;
  mode: DecisionMode;
  advancedWeights: DecisionWeights | null;
  today?: Date;
}

export interface EvalOptions {
  /** Multiplies the quality-failure cost basis (sensitivity testing). */
  qualityFailureMultiplier?: number;
  /** Multiplies the daily disruption cost (sensitivity testing). */
  disruptionMultiplier?: number;
  /** Skip text insights and confidence — used by break-even search loops. */
  rankOnly?: boolean;
  /** Reuse a fixed cost context (so hypothetical changes don't move shared assumptions). */
  context?: CostContext;
}

/** Only quotes with a unit price can be compared; incomplete cards are left out until priced. */
export const evaluableSuppliers = (suppliers: Supplier[]): Supplier[] =>
  suppliers.filter((s) => s.quote.unitPrice != null && s.quote.unitPrice > 0);

export const displayName = (s: Supplier, index: number): string => s.info.name.trim() || `Supplier ${index + 1}`;

export interface RawResult {
  supplier: Supplier;
  name: string;
  costs: CostBreakdown;
  scores: ScoreSet;
  overall: number;
}

export const rawEvaluate = (input: EvalInput, opts: EvalOptions = {}): { raw: RawResult[]; weights: DecisionWeights; ctx: CostContext } => {
  const suppliers = evaluableSuppliers(input.suppliers);
  const base = opts.context ?? buildCostContext(input.purchase, suppliers);
  const ctx: CostContext = {
    ...base,
    qualityFailureCostBasis: base.qualityFailureCostBasis * (opts.qualityFailureMultiplier ?? 1),
    dailyDisruptionCost: base.dailyDisruptionCost * (opts.disruptionMultiplier ?? 1),
  };
  const weights = getWeights(input.mode, input.priorities, input.purchase, input.advancedWeights);
  const costBasis = costBasisForMode(input.mode);
  const costs = suppliers.map((s) => computeCosts(s, input.purchase, input.assumptions, ctx));
  const costValues = costs.map((c) => (costBasis === 'direct' ? c.direct : c.riskAdjusted)).filter((v) => v > 0);
  const leads = suppliers.map((s) => s.delivery.leadTimeDays).filter((v): v is number => v != null && v > 0);
  const peer = {
    minCost: costValues.length ? Math.min(...costValues) : 0,
    minLeadTime: leads.length ? Math.min(...leads) : null,
    evaluatedQuantity: ctx.evaluatedQuantity,
    costBasis,
  };
  const raw = suppliers.map((s, i) => {
    const scores = scoreSupplier(s, costs[i], peer);
    return {
      supplier: s,
      name: displayName(s, input.suppliers.indexOf(s)),
      costs: costs[i],
      scores,
      overall: overallScore(scores, weights),
    };
  });
  raw.sort((a, b) => b.overall - a.overall || a.costs.riskAdjusted - b.costs.riskAdjusted);
  return { raw, weights, ctx };
};

export const evaluate = (input: EvalInput, opts: EvalOptions = {}): Evaluation => {
  const { raw, weights, ctx } = rawEvaluate(input, opts);
  const today = input.today ?? new Date();
  const results: SupplierScore[] = raw.map((r, i) => ({
    supplierId: r.supplier.id,
    name: r.name,
    costs: r.costs,
    scores: r.scores,
    overall: r.overall,
    rank: i + 1,
    confidence: opts.rankOnly
      ? { score: 0, label: 'Low', items: [] }
      : supplierConfidence({ ...r.supplier, info: { ...r.supplier.info, name: r.name } }, input.purchase, today),
    riskLevel: riskLevel(r.scores),
    strengths: [],
    weaknesses: [],
    rankExplanation: '',
    assumedInputs: [],
  }));

  if (!opts.rankOnly) {
    for (const res of results) {
      const insight = buildInsights(res, raw, weights, input.purchase);
      res.strengths = insight.strengths;
      res.weaknesses = insight.weaknesses;
      res.assumedInputs = insight.assumed;
    }
    for (const res of results) res.rankExplanation = rankExplanation(res, results, raw, weights, input.mode);
  }

  return {
    mode: input.mode,
    weights,
    results,
    qualityFailureCostBasis: ctx.qualityFailureCostBasis,
    qualityFailureCostAssumed: ctx.qualityFailureCostAssumed,
    dailyDisruptionCost: ctx.dailyDisruptionCost,
    dailyDisruptionCostAssumed: ctx.dailyDisruptionCostAssumed,
    evaluatedQuantity: ctx.evaluatedQuantity,
  };
};

/** Winner under every decision mode — used for the mode-comparison strip. */
export const winnersByMode = (input: EvalInput, modes: DecisionMode[]): { mode: DecisionMode; name: string; id: string; score: number }[] =>
  modes.map((mode) => {
    const { raw } = rawEvaluate({ ...input, mode }, { rankOnly: true });
    const top = raw[0];
    return { mode, name: top?.name ?? '—', id: top?.supplier.id ?? '', score: top?.overall ?? 0 };
  });
