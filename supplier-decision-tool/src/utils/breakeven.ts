// "What would make this supplier win?" — solves for the change in a single lever
// (or a combination) that would make a non-winning supplier rank first under the
// current decision mode, holding every other supplier and assumption fixed.
import type { BreakEvenResult, Evaluation, Supplier } from '../types';
import { buildCostContext } from './costs';
import { evaluableSuppliers, rawEvaluate, type EvalInput } from './evaluate';
import { defectPct, joinList, netTerms, pct, singularUnit, unitMoney, possessive } from './format';

type Modifier = (s: Supplier) => Supplier;

const bisect = (lo: number, hi: number, ok: (v: number) => boolean, iterations = 28): number => {
  // Assumes ok(lo) is true and ok(hi) is false; returns the boundary value on the ok side.
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2;
    if (ok(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
};

export const buildBreakEven = (input: EvalInput, evaluation: Evaluation): BreakEvenResult[] => {
  const winner = evaluation.results[0];
  if (!winner) return [];
  const suppliers = evaluableSuppliers(input.suppliers);
  const ctx = buildCostContext(input.purchase, suppliers);
  const cur = input.purchase.baseCurrency;
  const unit = singularUnit(input.purchase.unit);
  const winnerSupplier = suppliers.find((s) => s.id === winner.supplierId)!;

  return evaluation.results.slice(1).map((res) => {
    const original = suppliers.find((s) => s.id === res.supplierId)!;
    const wins = (modify: Modifier): boolean => {
      const changed = input.suppliers.map((s) => (s.id === original.id ? modify(s) : s));
      const { raw } = rawEvaluate({ ...input, suppliers: changed }, { rankOnly: true, context: ctx });
      return raw[0]?.supplier.id === original.id;
    };
    const margin = (modify: Modifier): number => {
      const changed = input.suppliers.map((s) => (s.id === original.id ? modify(s) : s));
      const { raw } = rawEvaluate({ ...input, suppliers: changed }, { rankOnly: true, context: ctx });
      const mine = raw.find((r) => r.supplier.id === original.id)!;
      const best = Math.max(...raw.filter((r) => r.supplier.id !== original.id).map((r) => r.overall));
      return mine.overall - best;
    };
    const gap = -margin((s) => s);
    const closed = (modify: Modifier) => Math.max(0, Math.min(gap, gap + margin(modify)));
    const closedText = (modify: Modifier, what: string) =>
      `${what} would close ${closed(modify).toFixed(1)} of the ${gap.toFixed(1)}-point gap.`;
    const levers: BreakEvenResult['levers'] = [];
    const feasibleTexts: { text: string; effort: number }[] = [];

    // --- Price
    const price = original.quote.unitPrice;
    if (price != null && price > 0) {
      const withPrice = (p: number): Modifier => (s) => ({ ...s, quote: { ...s.quote, unitPrice: p } });
      const floor = price * 0.4;
      if (wins(withPrice(floor))) {
        const p = Math.floor(bisect(floor, price, (v) => wins(withPrice(v))) * 100) / 100;
        const fx = res.costs.unitPriceBase / price;
        const drop = ((price - p) / price) * 100;
        const text = `its price falls below ${unitMoney(p * fx, cur)}/${unit} (a ${drop.toFixed(1)}% reduction from ${unitMoney(price * fx, cur)})`;
        levers.push({ label: 'Unit price', detail: `Wins if price falls below ${unitMoney(p * fx, cur)}/${unit} (−${drop.toFixed(1)}%)`, feasible: drop <= 25 });
        feasibleTexts.push({ text, effort: drop / 5 });
      } else {
        levers.push({
          label: 'Unit price',
          detail: `Price alone cannot close the gap. ${closedText(withPrice(price * 0.9), 'A 10% price cut')}`,
          feasible: false,
          gapClosed: closed(withPrice(price * 0.9)),
        });
      }
    }

    // --- Defect rate
    const currentDefect = res.costs.effectiveDefectPct;
    const withDefect = (d: number): Modifier => (s) => ({
      ...s,
      quality: { ...s.quality, estimatedDefectPct: d, historicalDefectPct: s.quality.historicalDefectPct == null ? null : d },
    });
    if (currentDefect > 0) {
      if (wins(withDefect(0))) {
        const d = Math.floor(bisect(0, currentDefect, (v) => wins(withDefect(v))) * 100) / 100;
        if (d > 0) {
          levers.push({ label: 'Defect rate', detail: `Wins if its defect rate falls from ${defectPct(currentDefect)} to about ${defectPct(d)}`, feasible: true });
          feasibleTexts.push({ text: `its defect rate falls from ${defectPct(currentDefect)} to approximately ${defectPct(d)}`, effort: currentDefect / Math.max(d, 0.01) / 2 });
        } else {
          levers.push({ label: 'Defect rate', detail: 'Only a near-zero defect rate would be enough on its own.', feasible: false });
        }
      } else {
        const target = Math.min(currentDefect, winner.costs.effectiveDefectPct);
        levers.push({
          label: 'Defect rate',
          detail: `Defect rate alone cannot close the gap. ${closedText(withDefect(target), `Matching ${possessive(winner.name)} ${defectPct(target)} rate (from ${defectPct(currentDefect)})`)}`,
          feasible: false,
          gapClosed: closed(withDefect(target)),
        });
      }
    }

    // --- On-time delivery
    const otd = original.delivery.onTimePct;
    const withOtd = (v: number): Modifier => (s) => ({ ...s, delivery: { ...s.delivery, onTimePct: v } });
    if (otd == null || otd < 100) {
      const startOtd = otd ?? 90;
      if (wins(withOtd(100))) {
        const v = Math.ceil((100 - bisect(0, 100 - startOtd, (x) => wins(withOtd(100 - x)))) * 10) / 10;
        levers.push({ label: 'On-time delivery', detail: `Wins if on-time delivery rises from ${otd == null ? 'unknown' : pct(otd)} to ${pct(v)}`, feasible: true });
        feasibleTexts.push({ text: `its on-time delivery improves to ${pct(v)}`, effort: (v - startOtd) / 2 });
      } else {
        const target = Math.max(startOtd, winnerSupplier.delivery.onTimePct ?? 100);
        levers.push({
          label: 'On-time delivery',
          detail: `Delivery reliability alone cannot close the gap. ${closedText(withOtd(target), `Reaching ${pct(target)} on-time (from ${otd == null ? 'unknown' : pct(otd)})`)}`,
          feasible: false,
          gapClosed: closed(withOtd(target)),
        });
      }
    }

    // --- Payment terms
    const days = original.quote.paymentTermsDays ?? 30;
    const payTarget = [45, 60, 75, 90].find(
      (d) => d > days && wins((s) => ({ ...s, quote: { ...s.quote, paymentTermsDays: d, depositPct: 0 } })),
    );
    levers.push(
      payTarget
        ? { label: 'Payment terms', detail: `Wins if it offers ${netTerms(payTarget)} with no deposit`, feasible: true }
        : {
            label: 'Payment terms',
            detail: `Payment terms alone cannot close the gap. ${closedText((s) => ({ ...s, quote: { ...s.quote, paymentTermsDays: 90, depositPct: 0 } }), 'Net 90 with no deposit')}`,
            feasible: false,
          },
    );
    if (payTarget) feasibleTexts.push({ text: `it improves payment terms to ${netTerms(payTarget)}`, effort: (payTarget - days) / 15 });

    // --- Matching the winner's protection package
    const matchProtection: Modifier = (s) => ({
      ...s,
      protection: { ...winnerSupplier.protection },
      quote: {
        ...s.quote,
        priceLockMonths: Math.max(s.quote.priceLockMonths ?? 0, winnerSupplier.quote.priceLockMonths ?? 0),
        cancellation: winnerSupplier.quote.cancellation,
        cancellationFeePct: winnerSupplier.quote.cancellationFeePct,
      },
    });
    const protectionWins = wins(matchProtection);
    levers.push({
      label: 'Contract protection',
      detail: protectionWins
        ? `Wins if it matches ${possessive(winner.name)} return, warranty, credit and cancellation terms`
        : `Contract terms alone cannot close the gap. ${closedText(matchProtection, `Matching ${possessive(winner.name)} return, warranty, credit and cancellation terms`)}`,
      feasible: protectionWins,
      gapClosed: protectionWins ? gap : closed(matchProtection),
    });
    if (protectionWins) {
      const asks: string[] = [];
      if (original.protection.returnShipping !== 'supplier' && winnerSupplier.protection.returnShipping === 'supplier') asks.push('includes return freight');
      if (original.protection.replacementPolicy !== winnerSupplier.protection.replacementPolicy) asks.push('offers full replacement for defects');
      if (original.protection.lateDeliveryCredits !== 'yes' && winnerSupplier.protection.lateDeliveryCredits === 'yes') asks.push('adds late-delivery credits');
      if (original.quote.cancellation !== winnerSupplier.quote.cancellation) asks.push('relaxes its cancellation terms');
      feasibleTexts.push({ text: `it ${asks.length ? joinList(asks) : `matches ${possessive(winner.name)} contract terms`}`, effort: 2 + asks.length * 0.5 });
    }

    // --- Cost parity: the price at which its risk-adjusted cost matches the lowest competitor
    let costParity: string | null = null;
    const cheapestOther = Math.min(...evaluation.results.filter((r) => r.supplierId !== res.supplierId).map((r) => r.costs.riskAdjusted));
    const perUnit = evaluation.evaluatedQuantity * (1 - (original.quote.volumeDiscountPct ?? 0) / 100);
    if (price != null && price > 0 && perUnit > 0) {
      const fx = res.costs.unitPriceBase / price;
      const excess = res.costs.riskAdjusted - cheapestOther;
      if (excess > 0) {
        const parity = res.costs.unitPriceBase - excess / perUnit;
        costParity =
          parity > 0
            ? `${res.name} becomes cost-competitive on a risk-adjusted basis if its price falls below ${unitMoney(Math.floor(parity * 100) / 100, cur)}/${unit} (currently ${unitMoney(price * fx, cur)}).`
            : `${res.name} cannot reach risk-adjusted cost parity through price alone — its expected failure and disruption costs exceed the gap.`;
      } else {
        costParity = `${res.name} already has the lowest risk-adjusted cost; it ranks lower because of non-cost factors under this mode.`;
      }
    }

    // --- Summary: the easiest single lever, else a combination
    let summary: string;
    feasibleTexts.sort((a, b) => a.effort - b.effort);
    if (feasibleTexts.length) {
      summary = `${res.name} becomes the preferred option if ${feasibleTexts[0].text}.`;
      if (feasibleTexts[1]) summary += ` Alternatively, it would win if ${feasibleTexts[1].text}.`;
    } else {
      // Greedy combination: close the biggest gaps first, then solve for price.
      const steps: { label: string; modify: Modifier }[] = [
        { label: `matches ${possessive(winner.name)} defect rate (${defectPct(winner.costs.effectiveDefectPct)})`, modify: withDefect(winner.costs.effectiveDefectPct) },
        {
          label: `matches its on-time delivery (${pct(winnerSupplier.delivery.onTimePct)})`,
          modify: (s) => ({
            ...s,
            delivery: {
              ...s.delivery,
              onTimePct: Math.max(s.delivery.onTimePct ?? 0, winnerSupplier.delivery.onTimePct ?? 0),
              leadTimeVariabilityDays: Math.min(s.delivery.leadTimeVariabilityDays ?? 99, winnerSupplier.delivery.leadTimeVariabilityDays ?? 99),
            },
          }),
        },
        { label: 'matches its contract protections', modify: matchProtection },
      ];
      const applied: string[] = [];
      let combined: Modifier = (s) => s;
      let won = false;
      for (const step of steps) {
        const prev = combined;
        combined = (s) => step.modify(prev(s));
        applied.push(step.label);
        if (wins(combined)) {
          won = true;
          break;
        }
      }
      if (!won && price != null && price > 0) {
        const base = combined;
        const withBoth = (p: number): Modifier => (s) => base({ ...s, quote: { ...s.quote, unitPrice: p } });
        if (wins(withBoth(price * 0.4))) {
          const p = Math.floor(bisect(price * 0.4, price, (v) => wins(withBoth(v))) * 100) / 100;
          const fx = res.costs.unitPriceBase / price;
          applied.push(`cuts its price to ${unitMoney(p * fx, cur)}/${unit}`);
          won = true;
        }
      }
      summary = won
        ? `No single change is enough. ${res.name} would become the preferred option only if it ${joinList(applied)}.`
        : `${res.name} would need to improve on nearly every dimension to overtake ${winner.name} under the current priorities.`;
      levers.push({ label: 'Combination', detail: summary, feasible: won });
    }

    return {
      supplierId: res.supplierId,
      name: res.name,
      currentRank: res.rank,
      scoreGap: winner.overall - res.overall,
      levers,
      costParity,
      summary,
    };
  });
};
