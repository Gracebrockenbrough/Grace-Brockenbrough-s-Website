// Specific, data-driven negotiation asks for the recommended supplier.
import type { Evaluation, NegotiationItem, Supplier } from '../types';
import { protectionOffsetPct, workingCapitalValue } from './costs';
import type { EvalInput } from './evaluate';
import { compactMoney, defectPct, money, months, netTerms, singularUnit, unitMoney, possessive, article } from './format';

const round2 = (v: number) => Math.round(v * 100) / 100;
const roundUpTo = (v: number, step: number) => Math.ceil(v / step - 1e-9) * step;

export const buildNegotiation = (input: EvalInput, evaluation: Evaluation): NegotiationItem[] => {
  const top = evaluation.results[0];
  if (!top) return [];
  const s = input.suppliers.find((x) => x.id === top.supplierId)!;
  const others = evaluation.results.slice(1).map((r) => ({ r, s: input.suppliers.find((x) => x.id === r.supplierId)! }));
  const cur = input.purchase.baseCurrency;
  const unit = singularUnit(input.purchase.unit);
  const qty = evaluation.evaluatedQuantity;
  const coc = input.assumptions.costOfCapital;
  const items: NegotiationItem[] = [];
  const name = top.name;
  const bestOther = <T,>(pick: (o: Supplier) => T | null, better: (a: T, b: T) => boolean) => {
    let best: { value: T; name: string } | null = null;
    for (const o of others) {
      const v = pick(o.s);
      if (v == null) continue;
      if (!best || better(v, best.value)) best = { value: v, name: o.r.name };
    }
    return best;
  };

  // 1. Unit price
  const price = top.costs.unitPriceBase;
  if (s.quote.unitPrice != null && price > 0 && qty > 0) {
    const cheapest = bestOther((o) => (o.quote.unitPrice == null ? null : evaluation.results.find((r) => r.supplierId === o.id)!.costs.unitPriceBase), (a, b) => a < b);
    let target: number;
    let leverage: string | undefined;
    if (cheapest && cheapest.value < price) {
      target = Math.max(round2(price * 0.98), round2(cheapest.value));
      if (target >= price) target = round2(price - 0.01);
      leverage = `${cheapest.name} quoted ${unitMoney(cheapest.value, cur)}/${unit}.`;
    } else {
      target = round2(price * 0.99);
      leverage = `${name} already has the lowest price; ask for a volume or loyalty rebate on a committed annual volume.`;
    }
    if (target < price && target > 0) {
      const saving = (price - target) * qty * (1 - (s.quote.volumeDiscountPct ?? 0) / 100);
      items.push({
        id: 'price',
        term: 'Unit price',
        current: `${unitMoney(price, cur)}/${unit}`,
        target: `${unitMoney(target, cur)}/${unit}`,
        suggestion: `Ask ${name} to reduce price from ${unitMoney(price, cur)}/${unit} to ${unitMoney(target, cur)}/${unit}. At your volume of ${qty.toLocaleString('en-US')} ${input.purchase.unit}, this would save approximately ${money(saving, cur)}.`,
        rationale: 'Price is the most visible lever; competing quotes give you a credible reference point.',
        estimatedValue: saving,
        leverage,
      });
    }
  }

  // 2. Payment terms
  const days = s.quote.paymentTermsDays;
  const bestDays = bestOther((o) => o.quote.paymentTermsDays, (a, b) => a > b);
  const targetDays = bestDays && days != null && bestDays.value > days ? bestDays.value : days != null && days < 60 ? Math.min(90, days + 15) : null;
  if (days != null && targetDays != null && targetDays > days) {
    const wc = workingCapitalValue(top.costs.purchase, targetDays - days, coc);
    items.push({
      id: 'payment',
      term: 'Payment terms',
      current: netTerms(days),
      target: netTerms(targetDays),
      suggestion: `Request ${netTerms(targetDays)} instead of ${netTerms(days)} to improve working capital. This keeps roughly ${money(wc.cashFreed, cur)} in your business for longer — worth about ${money(wc.financingValue, cur)} a year at an ${coc}% cost of capital.`,
      rationale: 'Longer terms preserve cash without changing the price.',
      estimatedValue: wc.financingValue,
      leverage: bestDays && bestDays.value > days ? `${bestDays.name} offers ${netTerms(bestDays.value)}.` : undefined,
    });
  } else if (days == null) {
    items.push({
      id: 'payment',
      term: 'Payment terms',
      current: 'Not stated',
      target: 'Net 45–60',
      suggestion: `Confirm payment terms in writing and request Net 45 or longer from ${name}.`,
      rationale: 'Unconfirmed terms default to the supplier’s standard, often Net 30 or less.',
      estimatedValue: null,
    });
  }

  // 3. Deposit
  const dep = s.quote.depositPct ?? 0;
  if (dep > 0) {
    const lead = s.delivery.leadTimeDays ?? 30;
    const value = top.costs.upfrontCash * (coc / 100) * (lead / 365);
    items.push({
      id: 'deposit',
      term: 'Deposit',
      current: `${dep}% upfront (${money(top.costs.upfrontCash, cur)})`,
      target: 'No deposit, or 5% maximum',
      suggestion: `Ask ${name} to waive the ${dep}% deposit (or cap it at 5%). This avoids tying up ${money(top.costs.upfrontCash, cur)} before delivery.`,
      rationale: 'Deposits shift supplier-default risk to you and consume cash before material arrives.',
      estimatedValue: value,
    });
  }

  // 4. Price lock
  const lock = s.quote.priceLockMonths;
  const bestLock = bestOther((o) => o.quote.priceLockMonths, (a, b) => a > b);
  const contract = s.quote.contractLengthMonths;
  const lockTarget =
    lock == null ? 12 : bestLock && bestLock.value > lock ? bestLock.value : contract != null && contract > lock ? contract : lock < 12 ? 12 : lock < 18 ? 18 : null;
  if (lockTarget != null && (lock == null || lockTarget > lock)) {
    items.push({
      id: 'pricelock',
      term: 'Price lock',
      current: months(lock),
      target: months(lockTarget),
      suggestion: `Request ${article(lockTarget)} ${lockTarget}-month price lock instead of ${lock == null ? 'an unstated period' : `${lock} months`}. Every 1% price increase after the lock expires would add about ${money(top.costs.purchase * 0.01, cur)} a year at this volume.`,
      rationale: 'Locks protect against commodity-driven price increases and make the budget predictable.',
      estimatedValue: null,
      leverage: bestLock && lock != null && bestLock.value > lock ? `${bestLock.name} offers ${bestLock.value} months.` : undefined,
    });
  }

  // 5. Contractual defect-rate cap
  const eff = top.costs.effectiveDefectPct;
  if (eff > 0) {
    const cap = roundUpTo(eff * 1.3, 0.05);
    items.push({
      id: 'defectcap',
      term: 'Maximum defect rate',
      current: `${defectPct(eff)} expected, no contractual cap`,
      target: `${defectPct(cap)} cap with credits`,
      suggestion: `Request a contractual maximum defect rate of ${defectPct(cap)}, with credits or chargebacks for any lot that exceeds it.`,
      rationale: `Turns ${possessive(name)} quality advantage into an enforceable commitment and protects the ${compactMoney(top.costs.expectedQualityFailure, cur)} expected failure-cost estimate.`,
      estimatedValue: null,
    });
  }

  // 6. Return freight / replacement / compensation
  const p = s.protection;
  if (p.returnShipping !== 'supplier') {
    const value = top.costs.expectedQualityFailureGross * 0.05;
    items.push({
      id: 'returnfreight',
      term: 'Return freight',
      current: p.returnShipping === 'buyer' ? 'Buyer pays' : p.returnShipping === 'shared' ? 'Shared' : 'Not stated',
      target: 'Supplier pays for verified defects',
      suggestion: `Ask ${name} to pay return freight on all verified defective material.`,
      rationale: 'Removes a recurring cost that only arises when the supplier is at fault.',
      estimatedValue: value,
    });
  }
  if (p.replacementPolicy !== 'full') {
    const current = protectionOffsetPct(s);
    const withFull = Math.min(35, current + ({ 'replacement-only': 7, credit: 9, 'case-by-case': 12, none: 15, unknown: 15, full: 0 }[p.replacementPolicy] ?? 0));
    items.push({
      id: 'replacement',
      term: 'Replacement policy',
      current: { 'replacement-only': 'Replacement only', credit: 'Credit only', 'case-by-case': 'Case-by-case', none: 'None', unknown: 'Not stated', full: '' }[p.replacementPolicy],
      target: 'Full replacement or refund',
      suggestion: `Require full replacement or refund, at your option, for any verified defective material from ${name}.`,
      rationale: 'Gives you a choice of remedy instead of waiting on replacement material.',
      estimatedValue: (top.costs.expectedQualityFailureGross * (withFull - current)) / 100,
    });
  }
  if (p.defectCompensation !== 'yes') {
    items.push({
      id: 'compensation',
      term: 'Defective material compensation',
      current: p.defectCompensation === 'no' ? 'None' : 'Not stated',
      target: 'Compensation for handling and rework',
      suggestion: `Negotiate compensation for handling, sorting and rework costs caused by defective material, capped at the value of the affected lot.`,
      rationale: 'Most of the cost of a defect is in your own labor and downtime, not the replacement material.',
      estimatedValue: top.costs.expectedQualityFailureGross * 0.1,
    });
  }
  if (p.warrantyMonths == null || p.warrantyMonths < 12) {
    items.push({
      id: 'warranty',
      term: 'Warranty',
      current: months(p.warrantyMonths),
      target: '12 months',
      suggestion: `Request a 12-month material warranty from ${name}${p.warrantyMonths ? ` instead of ${p.warrantyMonths} months` : ''}.`,
      rationale: 'Latent defects can surface after incoming inspection.',
      estimatedValue: null,
    });
  }

  // 7. Cancellation
  if (s.quote.cancellation !== 'penalty-free') {
    items.push({
      id: 'cancellation',
      term: 'Cancellation',
      current:
        s.quote.cancellation === 'fee'
          ? `${s.quote.cancellationFeePct ?? '?'}% fee`
          : s.quote.cancellation === 'non-cancellable'
            ? 'Non-cancellable once production begins'
            : 'Not stated',
      target: '30 days’ notice without penalty',
      suggestion: `Ask ${name} for penalty-free cancellation with 30 days’ notice${s.quote.cancellation === 'fee' ? `, or reduce the fee to 5% or less` : ''}.`,
      rationale: 'Protects you if demand falls or specifications change.',
      estimatedValue: null,
    });
  }

  // 8. Late-delivery credits
  if (p.lateDeliveryCredits !== 'yes') {
    const value = top.costs.expectedDisruptionGross * 0.15;
    items.push({
      id: 'latecredits',
      term: 'Late-delivery credits',
      current: p.lateDeliveryCredits === 'no' ? 'None' : 'Not stated',
      target: '1% of shipment value per day late, capped at 10%',
      suggestion: `Request late-delivery credits of 1% of shipment value per day late (capped at 10%) from ${name}.`,
      rationale: `Shares the cost of the estimated ${compactMoney(top.costs.expectedDisruption, cur)} disruption exposure with the supplier.`,
      estimatedValue: value,
    });
  }

  // 9. Inspection burden
  const qc = top.costs.qualityControl;
  if (qc > 0 && (qc > top.costs.purchase * 0.005 || others.some((o) => o.r.costs.qualityControl < qc))) {
    const saving = qc * 0.4;
    items.push({
      id: 'inspection',
      term: 'Inspection and testing',
      current: money(qc, cur),
      target: `About ${money(qc - saving, cur)}`,
      suggestion: `Ask ${name} to supply certified test reports with every lot so you can move to reduced or skip-lot inspection, cutting inspection and testing cost by about 40% (${money(saving, cur)}).`,
      rationale: 'Supplier-certified data shifts routine testing upstream to the party that controls the process.',
      estimatedValue: saving,
    });
  }

  // 10. Lead time
  const lead = s.delivery.leadTimeDays;
  const fastest = bestOther((o) => o.delivery.leadTimeDays, (a, b) => a < b);
  if (lead != null && fastest && fastest.value < lead) {
    items.push({
      id: 'leadtime',
      term: 'Lead time',
      current: `${lead} days`,
      target: `${fastest.value} days`,
      suggestion: `Ask ${name} to commit to a ${fastest.value}-day lead time, or to hold safety stock for you, to match ${fastest.name}.`,
      rationale: 'Shorter lead times reduce the inventory you need to carry.',
      estimatedValue: null,
      leverage: `${fastest.name} quotes ${fastest.value} days.`,
    });
  }

  // 11. MOQ
  const moq = s.quote.moq;
  if (moq != null && qty > 0 && moq > qty * 0.25) {
    items.push({
      id: 'moq',
      term: 'Minimum order quantity',
      current: `${moq.toLocaleString('en-US')} ${input.purchase.unit}`,
      target: `${Math.round(qty * 0.2).toLocaleString('en-US')} ${input.purchase.unit}`,
      suggestion: `Ask ${name} to lower the MOQ to about ${Math.round(qty * 0.2).toLocaleString('en-US')} ${input.purchase.unit} so you can order in smaller, more frequent releases.`,
      rationale: 'Smaller releases reduce inventory carrying cost and cash tied up.',
      estimatedValue: null,
    });
  }

  return items.sort((a, b) => (b.estimatedValue ?? -1) - (a.estimatedValue ?? -1));
};
