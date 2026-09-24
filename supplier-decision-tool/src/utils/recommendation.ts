// Builds the procurement decision memo from an evaluation.
import { MODES, modeById } from '../data/modes';
import { CATEGORY_LABELS } from '../data/options';
import type { ConfidenceItem, ConfidenceResult, Evaluation, Recommendation, ScoreCategory, SupplierScore } from '../types';
import { confidenceLabel } from './confidence';
import { evaluate, rawEvaluate, winnersByMode, type EvalInput } from './evaluate';
import { compactMoney, defectPct, joinList, money, netTerms, pct, possessive } from './format';
import { GAP_PHRASES, LEAD_PHRASES, weightedGaps } from './insights';

export interface Sensitivity {
  scenario: string;
  winner: string;
  changed: boolean;
}

/** Re-runs the ranking with the key risk assumptions halved and doubled. */
export const sensitivityAnalysis = (input: EvalInput, baseline: Evaluation): Sensitivity[] => {
  const base = baseline.results[0]?.supplierId;
  const scenarios: { scenario: string; opts: { qualityFailureMultiplier?: number; disruptionMultiplier?: number } }[] = [
    { scenario: 'Quality-failure cost halved', opts: { qualityFailureMultiplier: 0.5 } },
    { scenario: 'Quality-failure cost doubled', opts: { qualityFailureMultiplier: 2 } },
    { scenario: 'Disruption cost halved', opts: { disruptionMultiplier: 0.5 } },
    { scenario: 'Disruption cost doubled', opts: { disruptionMultiplier: 2 } },
    { scenario: 'Both risk costs set to zero', opts: { qualityFailureMultiplier: 0, disruptionMultiplier: 0 } },
  ];
  return scenarios.map(({ scenario, opts }) => {
    const top = rawEvaluate(input, { ...opts, rankOnly: true }).raw[0];
    return { scenario, winner: top?.name ?? '—', changed: top?.supplier.id !== base };
  });
};

export const recommendationConfidence = (
  evaluation: Evaluation,
  sensitivity: Sensitivity[],
): ConfidenceResult => {
  const [top, second] = evaluation.results;
  const items: ConfidenceItem[] = top.confidence.items.map((i) => ({ ...i }));
  if (second) {
    const gap = top.overall - second.overall;
    if (gap < 2)
      items.push({ reason: `${top.name} and ${second.name} are nearly tied (${gap.toFixed(1)} points apart).`, penalty: 20, importance: 'major' });
    else if (gap < 5)
      items.push({ reason: `Only ${gap.toFixed(1)} points separate ${top.name} from ${second.name}.`, penalty: 10, importance: 'major' });
    else if (gap < 8) items.push({ reason: `${possessive(top.name)} lead over ${second.name} is moderate (${gap.toFixed(1)} points).`, penalty: 4, importance: 'minor' });
  }
  // Scenarios where only the zero-risk-cost case flips are expected and are reported separately as a risk.
  const flips = sensitivity.filter((s) => s.changed && s.scenario !== 'Both risk costs set to zero');
  if (flips.length)
    items.push({
      reason: `The recommendation changes if risk-cost assumptions move (${flips.map((f) => f.scenario.toLowerCase()).join('; ')}).`,
      penalty: Math.min(20, 10 * flips.length),
      importance: 'major',
    });
  items.sort((a, b) => b.penalty - a.penalty);
  const score = Math.max(0, 100 - items.reduce((s, i) => s + i.penalty, 0));
  return { score, label: confidenceLabel(score), items };
};

const pctDiff = (a: number, b: number) => (b === 0 ? 0 : ((a - b) / b) * 100);

/** A concrete, data-backed phrase for why `a` beats `b` in a category. */
const advantagePhrase = (c: ScoreCategory, a: SupplierScore, b: SupplierScore, input: EvalInput): string => {
  const sa = input.suppliers.find((s) => s.id === a.supplierId)!;
  const sb = input.suppliers.find((s) => s.id === b.supplierId)!;
  switch (c) {
    case 'failureRisk':
      return `lower estimated defect rate (${defectPct(a.costs.effectiveDefectPct)} vs ${defectPct(b.costs.effectiveDefectPct)})`;
    case 'deliveryReliability':
      return sa.delivery.onTimePct != null && sb.delivery.onTimePct != null
        ? `stronger on-time delivery (${pct(sa.delivery.onTimePct)} vs ${pct(sb.delivery.onTimePct)})`
        : 'more reliable delivery';
    case 'quality':
      return a.costs.qualityControl < b.costs.qualityControl * 0.9
        ? 'higher material quality and lower inspection requirements'
        : 'higher material quality';
    case 'contractProtection':
      return 'stronger return protections and contract terms';
    case 'totalCost':
      return 'lower risk-adjusted total cost';
    case 'leadTime':
      return `shorter lead time (${sa.delivery.leadTimeDays ?? '?'} vs ${sb.delivery.leadTimeDays ?? '?'} days)`;
    case 'supplyContinuity':
      return 'lower supply-disruption risk';
    case 'supplierStrength':
      return 'stronger financial position and track record';
    case 'paymentTerms':
      return `better payment terms (${netTerms(sa.quote.paymentTermsDays)} vs ${netTerms(sb.quote.paymentTermsDays)})`;
    case 'flexibility':
      return 'more flexible cancellation and capacity terms';
  }
};

export const buildRecommendation = (input: EvalInput, evaluation: Evaluation): Recommendation | null => {
  const results = evaluation.results;
  if (!results.length) return null;
  const top = results[0];
  const next = results[1] ?? null;
  const cur = input.purchase.baseCurrency;
  const modeLabel = modeById(evaluation.mode).label;
  const sensitivity = sensitivityAnalysis(input, evaluation);
  const confidence = recommendationConfidence(evaluation, sensitivity);
  const w = evaluation.weights;

  // ---- Why this supplier
  let why = `${top.name} is the strongest option under the ${modeLabel} strategy.`;
  const benefitsFromGaps: string[] = [];
  if (next) {
    const gaps = weightedGaps(top, next, w).filter((g) => g.gap > 0.3 && g.category !== 'totalCost');
    const phrases = gaps.slice(0, 4).map((g) => advantagePhrase(g.category, top, next, input));
    benefitsFromGaps.push(...phrases);
    const priceDiff = pctDiff(top.costs.unitPriceBase, next.costs.unitPriceBase);
    const cheaperRisk = top.costs.riskAdjusted < next.costs.riskAdjusted;
    why = `${top.name} is the strongest ${cheaperRisk ? 'risk-adjusted ' : ''}option under the ${modeLabel} strategy.`;
    if (priceDiff > 0.5 && phrases.length) {
      why += ` Its unit price is ${priceDiff.toFixed(1)}% higher than ${next.name}, but its ${joinList(phrases)} ${
        cheaperRisk
          ? 'more than offset the upfront premium.'
          : `justify the premium under these priorities, even though its risk-adjusted cost is ${compactMoney(top.costs.riskAdjusted - next.costs.riskAdjusted, cur)} higher.`
      }`;
    } else if (priceDiff < -0.5) {
      why += ` It is also ${Math.abs(priceDiff).toFixed(1)}% cheaper per unit than ${next.name}${phrases.length ? `, with ${joinList(phrases)}` : ''}.`;
    } else if (phrases.length) {
      why += ` At a similar unit price to ${next.name}, it offers ${joinList(phrases)}.`;
    }
  }

  // ---- Financial reasoning
  const cheapestLanded = Math.min(...results.map((r) => r.costs.landed));
  let financialSummary = `${possessive(top.name)} risk-adjusted total cost is ${money(top.costs.riskAdjusted, cur)}.`;
  let qcSavings: number | null = null;
  if (next) {
    const landedDiff = top.costs.landed - next.costs.landed;
    const riskSide = (r: SupplierScore) => r.costs.qualityControl + r.costs.expectedQualityFailure + r.costs.expectedDisruption;
    qcSavings = riskSide(next) - riskSide(top);
    const raDiff = top.costs.riskAdjusted - next.costs.riskAdjusted;
    if (landedDiff > 0 && qcSavings > 0) {
      financialSummary = `${top.name} costs ${money(landedDiff, cur)} more in purchase price and logistics than ${next.name}, but is estimated to save ${money(qcSavings, cur)} in quality-control, failure and disruption costs — a net risk-adjusted advantage of ${money(-raDiff, cur)}.`;
    } else if (landedDiff <= 0 && qcSavings >= 0) {
      financialSummary = `${top.name} is ${money(-landedDiff, cur)} cheaper in purchase price and logistics than ${next.name} and also carries ${money(qcSavings, cur)} less in quality-control, failure and disruption cost — ${money(-raDiff, cur)} lower on a risk-adjusted basis.`;
    } else if (raDiff > 0) {
      financialSummary = `${possessive(top.name)} risk-adjusted cost is ${money(raDiff, cur)} higher than ${possessive(next.name)}. It is recommended because of its non-cost advantages under the ${modeLabel} strategy, not because it is cheapest.`;
    } else {
      financialSummary = `${top.name} is ${money(-raDiff, cur)} lower than ${next.name} on a risk-adjusted basis.`;
    }
  }

  // ---- Benefits (3–5)
  const benefits = [...new Set([...top.strengths, ...benefitsFromGaps.map((p) => p[0].toUpperCase() + p.slice(1))])].slice(0, 5);

  // ---- Risks (always shown)
  const risks: string[] = [...top.weaknesses];
  const cheapestUnit = Math.min(...results.map((r) => r.costs.unitPriceBase).filter((v) => v > 0));
  if (top.costs.unitPriceBase > cheapestUnit * 1.005) {
    const premium = (top.costs.unitPriceBase - cheapestUnit) * evaluation.evaluatedQuantity;
    risks.push(`Paying a price premium of about ${compactMoney(premium, cur)} over the lowest unit-price quote`);
  }
  const zeroRisk = sensitivity.find((s) => s.scenario === 'Both risk costs set to zero');
  if (top.costs.landed > cheapestLanded * 1.001 || zeroRisk?.changed) {
    risks.push(
      `Advantage depends partly on estimated failure and disruption costs${
        evaluation.qualityFailureCostAssumed || evaluation.dailyDisruptionCostAssumed ? ', which use default assumptions' : ''
      }`,
    );
  }
  const flips = sensitivity.filter((s) => s.changed && s.scenario !== 'Both risk costs set to zero');
  for (const f of flips) risks.push(`Recommendation changes to ${f.winner} if ${f.scenario.toLowerCase()}`);
  if (next && top.overall - next.overall < 5) risks.push(`Narrow lead over ${next.name} (${(top.overall - next.overall).toFixed(1)} points)`);
  for (const item of top.confidence.items.filter((i) => i.importance === 'major').slice(0, 2)) risks.push(item.reason);
  if (risks.length < 2) {
    risks.push('Relying on a single supplier concentrates supply risk — see the optional order-splitting analysis');
    risks.push('Supplier-reported figures should be verified before contract signature');
  }

  // ---- Next best alternative
  let nextBestAnalysis: Recommendation['nextBestAnalysis'] = null;
  if (next) {
    const behind = weightedGaps(top, next, w).filter((g) => g.gap > 0.3).slice(0, 3);
    const ahead = weightedGaps(next, top, w).filter((g) => g.gap > 0);
    const whySecond = `${next.name} ranked second (${next.overall.toFixed(0)}/100 vs ${top.overall.toFixed(0)}/100) mainly because of ${
      behind.length ? joinList(behind.map((g) => GAP_PHRASES[g.category])) : 'small differences across several categories'
    } relative to ${top.name}.${
      results.length > 2 ? ` It still ranks ahead of ${results.slice(2).map((r) => r.name).join(' and ')}.` : ''
    }`;
    const modeWins = winnersByMode(input, MODES.map((m) => m.id)).filter((m) => m.id === next.supplierId);
    let whenToChoose: string;
    if (next.costs.direct < top.costs.direct) {
      whenToChoose = `${next.name} is the best alternative if management becomes more price-sensitive or cash-constrained. Its direct cost is ${money(top.costs.direct - next.costs.direct, cur)} lower, but it carries ${
        behind.length ? joinList(behind.slice(0, 2).map((g) => GAP_PHRASES[g.category])) : 'more risk'
      }.`;
    } else if (modeWins.length) {
      whenToChoose = `${next.name} is the better choice if priorities shift — it ranks first under ${joinList(modeWins.map((m) => modeById(m.mode).label))}.`;
    } else if (ahead.length) {
      whenToChoose = `Choose ${next.name} if ${LEAD_PHRASES[ahead[0].category]} becomes the deciding factor, or as a qualified backup source to reduce dependence on ${top.name}.`;
    } else {
      whenToChoose = `${next.name} is best kept as a qualified backup source to reduce dependence on ${top.name}, or reconsidered if ${possessive(top.name)} terms deteriorate.`;
    }
    nextBestAnalysis = {
      whySecond,
      whenToChoose,
      biggestStrength: ahead.length
        ? `${advantagePhrase(ahead[0].category, next, top, input).replace(/^./, (c) => c.toUpperCase())} compared with ${top.name}`
        : next.strengths[0] ?? 'No category where it outperforms the recommended supplier',
      biggestWeakness: behind.length
        ? `${GAP_PHRASES[behind[0].category].replace(/^./, (c) => c.toUpperCase())} — ${CATEGORY_LABELS[behind[0].category]} score ${next.scores[behind[0].category].toFixed(0)} vs ${top.scores[behind[0].category].toFixed(0)} for ${top.name}`
        : next.weaknesses[0] ?? 'No major weakness identified',
    };
  }

  return {
    recommended: top,
    nextBest: next,
    confidence,
    headline: `Recommend ${top.name}`,
    whyThisSupplier: why,
    financial: {
      directCost: top.costs.direct,
      riskAdjustedCost: top.costs.riskAdjusted,
      nextBestName: next?.name ?? null,
      directDiffVsNext: next ? top.costs.direct - next.costs.direct : null,
      riskAdjustedDiffVsNext: next ? top.costs.riskAdjusted - next.costs.riskAdjusted : null,
      qcAndFailureSavingsVsNext: qcSavings,
      summary: financialSummary,
    },
    benefits,
    risks: [...new Set(risks)].slice(0, 7),
    nextBestAnalysis,
  };
};

/** Convenience: evaluate + recommendation in one call. */
export const analyse = (input: EvalInput) => {
  const evaluation = evaluate(input);
  return { evaluation, recommendation: buildRecommendation(input, evaluation) };
};
