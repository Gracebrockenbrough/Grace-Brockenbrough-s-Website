// Optional advanced analysis: would splitting volume between the top two suppliers reduce risk?
import type { Evaluation, Level, SplitSuggestion, Supplier, SupplierScore } from '../types';
import type { EvalInput } from './evaluate';
import { compactMoney, money, possessive } from './format';

/** Share of a disrupted supplier's volume the other supplier could cover. */
export const SURGE_COVER: Record<Level | 'unknown', number> = { high: 0.6, moderate: 0.4, low: 0.15, unknown: 0.25 };
export const SPLIT_SHARES = [0.9, 0.8, 0.7, 0.6];
/** Illustrative severe outage at the primary supplier, used for the worst-case comparison. */
export const OUTAGE_DAYS = 30;

export interface SplitScenario {
  primaryShare: number;
  cost: number;
  disruption: number;
  feasible: boolean;
}

export const splitScenario = (
  a: SupplierScore,
  b: SupplierScore,
  sa: Supplier,
  sb: Supplier,
  share: number,
  qty: number,
): SplitScenario => {
  const fixedA = a.costs.contractAdmin;
  const fixedB = b.costs.contractAdmin;
  const variable = (r: SupplierScore) => r.costs.direct - r.costs.contractAdmin + r.costs.expectedQualityFailure;
  const coverByB = SURGE_COVER[sb.delivery.surgeCapacity];
  const coverByA = SURGE_COVER[sa.delivery.surgeCapacity];
  const disruption = share * a.costs.expectedDisruption * (1 - coverByB) + (1 - share) * b.costs.expectedDisruption * (1 - coverByA);
  // Dual sourcing also carries its own overhead: a second contract, audits and scheduling.
  const overhead = 0.0025 * (1 - share) * b.costs.purchase;
  const cost = share * variable(a) + (1 - share) * variable(b) + fixedA + fixedB + disruption + overhead;
  const moqB = sb.quote.moq;
  const moqA = sa.quote.moq;
  const feasible = (moqB == null || (1 - share) * qty >= moqB) && (moqA == null || share * qty >= moqA);
  return { primaryShare: share, cost, disruption, feasible };
};

export const buildSplitSuggestion = (input: EvalInput, evaluation: Evaluation): SplitSuggestion | null => {
  const [a, b] = evaluation.results;
  if (!a || !b) return null;
  const sa = input.suppliers.find((s) => s.id === a.supplierId)!;
  const sb = input.suppliers.find((s) => s.id === b.supplierId)!;
  const cur = input.purchase.baseCurrency;
  const qty = evaluation.evaluatedQuantity;
  const single = a.costs.riskAdjusted;
  const outageDays = OUTAGE_DAYS;
  const worstCaseSingle = outageDays * evaluation.dailyDisruptionCost;
  const base: Omit<SplitSuggestion, 'show' | 'explanation' | 'primaryShare' | 'splitCost' | 'premium' | 'disruptionReduction' | 'worstCaseSplit'> = {
    primaryName: a.name,
    secondaryName: b.name,
    singleSourceCost: single,
    outageDays,
    worstCaseSingle,
  };

  if (input.purchase.frequency === 'one-time') {
    return {
      ...base,
      show: false,
      primaryShare: 1,
      splitCost: single,
      premium: 0,
      disruptionReduction: 0,
      explanation: '',
      worstCaseSplit: worstCaseSingle,
      reasonNotShown: 'This is a one-time purchase, so the ongoing benefit of a second qualified source is limited.',
    };
  }

  const scenarios = SPLIT_SHARES.map((s) => splitScenario(a, b, sa, sb, s, qty)).filter((s) => s.feasible);
  if (!scenarios.length) {
    return {
      ...base,
      show: false,
      primaryShare: 1,
      splitCost: single,
      premium: 0,
      disruptionReduction: 0,
      explanation: '',
      worstCaseSplit: worstCaseSingle,
      reasonNotShown: `Minimum order quantities make a meaningful split between ${a.name} and ${b.name} impractical at this volume.`,
    };
  }

  const severe = input.purchase.interruptionConsequence === 'high' || input.purchase.interruptionConsequence === 'critical';
  const singleSourceRisk = sa.risk.singleSource === 'yes' || sa.risk.backupProduction === 'no' || a.riskLevel !== 'Low';
  const secondaryAcceptable = b.riskLevel !== 'High' && b.scores.failureRisk >= 40;

  // Choose the split with the best balance: lowest cost, preferring more diversification when costs are close.
  const scored = scenarios.map((s) => ({
    ...s,
    premium: s.cost - single,
    reduction: a.costs.expectedDisruption - s.disruption,
  }));
  const tolerance = single * (severe ? 0.015 : 0.005);
  const acceptable = scored.filter((s) => s.premium <= tolerance && s.reduction > 0);
  const pick = acceptable.length
    ? acceptable.sort((x, y) => x.primaryShare - y.primaryShare)[0] // most diversified within tolerance
    : scored.sort((x, y) => x.cost - y.cost)[0];

  const reductionPct = a.costs.expectedDisruption > 0 ? (pick.reduction / a.costs.expectedDisruption) * 100 : 0;
  const logical =
    secondaryAcceptable && pick.reduction > 0 && pick.premium <= tolerance && (severe || singleSourceRisk || pick.premium <= 0);

  const share = Math.round(pick.primaryShare * 100);
  const worstCaseSplit = worstCaseSingle * pick.primaryShare * (1 - SURGE_COVER[sb.delivery.surgeCapacity]);
  const explanation = logical
    ? `A ${share}/${100 - share} split between ${a.name} and ${b.name} may reduce dependence on a single supplier while maintaining most of ${possessive(a.name)} quality advantage. It is estimated to cut expected disruption cost by ${compactMoney(pick.reduction, cur)} (${reductionPct.toFixed(0)}%) for a net ${
        pick.premium > 0 ? `premium of about ${money(pick.premium, cur)}` : `saving of about ${money(-pick.premium, cur)}`
      } versus single-sourcing. The larger benefit is in the worst case: a ${outageDays}-day outage at ${a.name} would cost about ${compactMoney(worstCaseSingle, cur)} if single-sourced, versus roughly ${compactMoney(worstCaseSplit, cur)} with ${b.name} already qualified and supplying.`
    : '';

  let reasonNotShown: string | undefined;
  if (!logical) {
    if (!secondaryAcceptable) reasonNotShown = `${possessive(b.name)} risk profile is too weak to make it a sensible secondary source; splitting would add more quality risk than it removes.`;
    else if (pick.premium > tolerance)
      reasonNotShown = `Splitting would add about ${money(pick.premium, cur)} in risk-adjusted cost while removing only ${compactMoney(Math.max(0, pick.reduction), cur)} of expected disruption cost, so single-sourcing with ${a.name} is more economical.`;
    else reasonNotShown = `${possessive(a.name)} supply risk is already low and interruption consequences are not severe, so a split adds complexity without a clear benefit.`;
  }

  return {
    ...base,
    show: logical,
    primaryShare: pick.primaryShare,
    splitCost: pick.cost,
    premium: pick.premium,
    disruptionReduction: pick.reduction,
    worstCaseSplit,
    explanation,
    reasonNotShown,
  };
};
