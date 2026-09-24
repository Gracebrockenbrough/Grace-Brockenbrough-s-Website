import { describe, expect, it } from 'vitest';
import { demoState } from '../../data/demo';
import { emptySupplier } from '../../data/defaults';
import { MODES } from '../../data/modes';
import type { AppState, Supplier } from '../../types';
import { buildBreakEven } from '../breakeven';
import { supplierConfidence } from '../confidence';
import { buildCostContext, computeCosts } from '../costs';
import { evaluate, winnersByMode, type EvalInput } from '../evaluate';
import { buildNegotiation } from '../negotiation';
import { buildRecommendation } from '../recommendation';
import { buildSplitSuggestion } from '../splitting';
import { checkNumber, RULES } from '../validation';
import { getWeights, weightsFromPriorities } from '../weights';

const TODAY = new Date('2026-09-24T12:00:00');
const demo = (): AppState => demoState(TODAY);
const input = (s: AppState): EvalInput => ({ ...s, today: TODAY });
const byName = (ev: ReturnType<typeof evaluate>, name: string) => ev.results.find((r) => r.name === name)!;

describe('cost buckets (demo)', () => {
  const s = demo();
  const ctx = buildCostContext(s.purchase, s.suppliers);
  const apex = computeCosts(s.suppliers[0], s.purchase, s.assumptions, ctx);
  const national = computeCosts(s.suppliers[1], s.purchase, s.assumptions, ctx);

  it('computes purchase, logistics and QC costs from the quote', () => {
    expect(apex.purchase).toBeCloseTo(1_240_000);
    expect(apex.logistics).toBeCloseTo(38_000);
    expect(apex.qualityControl).toBeCloseTo(12_000);
    expect(apex.direct).toBeCloseTo(1_290_000);
    expect(national.direct).toBeCloseTo(1_276_000);
  });

  it('uses the stated assumption that a 1% defect rate costs about $180,000', () => {
    expect(ctx.qualityFailureCostBasis).toBe(180_000);
    expect(apex.expectedQualityFailureGross).toBeCloseTo(27_000);
    expect(national.expectedQualityFailureGross).toBeCloseTo(117_000);
  });

  it('reduces expected failure cost for stronger protections', () => {
    expect(apex.protectionOffsetPct).toBeGreaterThan(national.protectionOffsetPct);
    expect(apex.expectedQualityFailure).toBeLessThan(apex.expectedQualityFailureGross);
  });

  it('risk-adjusted cost = direct + expected failure + expected disruption', () => {
    expect(apex.riskAdjusted).toBeCloseTo(apex.direct + apex.expectedQualityFailure + apex.expectedDisruption);
  });

  it('scales per-quote costs when the quoted quantity differs from the requirement', () => {
    const sup: Supplier = { ...s.suppliers[0], quote: { ...s.suppliers[0].quote, quotedQuantity: 250_000 } };
    const c = computeCosts(sup, s.purchase, s.assumptions, ctx);
    expect(c.logistics).toBeCloseTo(76_000);
    expect(c.purchase).toBeCloseTo(1_240_000);
  });
});

describe('demo recommendation (Lowest Risk)', () => {
  const s = demo();
  const ev = evaluate(input(s));
  const rec = buildRecommendation(input(s), ev)!;

  it('recommends Apex Metals with National Alloy Supply as the next-best alternative', () => {
    expect(s.mode).toBe('lowest-risk');
    expect(ev.results[0].name).toBe('Apex Metals');
    expect(ev.results[1].name).toBe('National Alloy Supply');
    expect(rec.nextBest?.name).toBe('National Alloy Supply');
  });

  it('Apex has the highest unit price but the lowest risk-adjusted cost', () => {
    const apex = byName(ev, 'Apex Metals');
    for (const r of ev.results) expect(apex.costs.unitPriceBase).toBeGreaterThanOrEqual(r.costs.unitPriceBase);
    for (const r of ev.results) expect(apex.costs.riskAdjusted).toBeLessThanOrEqual(r.costs.riskAdjusted);
  });

  it('keeps every supplier with strengths/weaknesses and an explanation', () => {
    expect(ev.results).toHaveLength(3);
    const global = byName(ev, 'GlobalSteel Partners');
    expect(global.rankExplanation).toMatch(/lowest headline price but ranks lower/);
    expect(global.weaknesses.length).toBeGreaterThan(0);
    expect(global.strengths.join(' ')).toMatch(/Lowest quoted unit price/);
  });

  it('always lists risks and a financial comparison', () => {
    expect(rec.risks.length).toBeGreaterThanOrEqual(2);
    expect(rec.risks.join(' ')).toMatch(/unit price|premium/i);
    expect(rec.financial.summary).toMatch(/more in purchase price and logistics/);
    expect(rec.nextBestAnalysis?.whenToChoose).toMatch(/price-sensitive/);
  });

  it('confidence differs by data quality: Apex High, GlobalSteel Low', () => {
    expect(byName(ev, 'Apex Metals').confidence.label).toBe('High');
    expect(byName(ev, 'National Alloy Supply').confidence.label).toBe('Medium');
    expect(byName(ev, 'GlobalSteel Partners').confidence.label).toBe('Low');
    expect(rec.confidence.label).toBe('High');
  });
});

describe('negotiation and break-even', () => {
  const s = demo();
  const ev = evaluate(input(s));
  it('produces specific, data-based asks', () => {
    const items = buildNegotiation(input(s), ev);
    const price = items.find((i) => i.id === 'price')!;
    expect(price.suggestion).toContain('$2.48/lb to $2.43/lb');
    expect(price.estimatedValue).toBeCloseTo(25_000);
    expect(items.find((i) => i.id === 'payment')!.target).toBe('Net 60');
    expect(items.find((i) => i.id === 'pricelock')!.target).toBe('18 months');
    expect(items.find((i) => i.id === 'defectcap')!.target).toMatch(/^0\.20%/);
  });

  it('explains what would make each other supplier win', () => {
    const be = buildBreakEven(input(s), ev);
    expect(be.map((b) => b.name)).toEqual(['National Alloy Supply', 'GlobalSteel Partners']);
    for (const b of be) {
      expect(b.summary.length).toBeGreaterThan(20);
      expect(b.costParity).toMatch(/price falls below/);
    }
  });

  it('finds a price threshold when one lever is enough', () => {
    const s2 = { ...demo(), mode: 'lowest-cost' as const };
    const ev2 = evaluate(input(s2));
    const be = buildBreakEven(input(s2), ev2);
    const nat = be.find((b) => b.name === 'National Alloy Supply')!;
    const priceLever = nat.levers.find((l) => l.label === 'Unit price')!;
    expect(priceLever.detail).toMatch(/Wins if price falls below \$2\.\d\d\/lb/);
  });
});

describe('modes', () => {
  it('different modes produce different weights and can change the winner', () => {
    const s = demo();
    const w1 = getWeights('lowest-risk', s.priorities, s.purchase, null);
    const w2 = getWeights('lowest-cost', s.priorities, s.purchase, null);
    expect(w1.totalCost).toBeLessThan(w2.totalCost);
    // Make National much cheaper: it should win on cost but not on risk.
    const cheaper = { ...s, suppliers: s.suppliers.map((x) => (x.id === 'demo-national' ? { ...x, quote: { ...x.quote, unitPrice: 2.0 } } : x)) };
    const winners = winnersByMode(input(cheaper), MODES.map((m) => m.id));
    expect(winners.find((w) => w.mode === 'lowest-cost')!.name).toBe('National Alloy Supply');
    expect(winners.find((w) => w.mode === 'lowest-risk')!.name).toBe('Apex Metals');
  });

  it('custom weights reflect consequence severity', () => {
    const s = demo();
    const low = weightsFromPriorities(s.priorities, { ...s.purchase, defectConsequence: 'low' });
    const crit = weightsFromPriorities(s.priorities, { ...s.purchase, defectConsequence: 'critical' });
    expect(crit.failureRisk).toBeGreaterThan(low.failureRisk);
  });
});

describe('unknown data', () => {
  it('keeps suppliers with unknown fields ranked, with lower confidence', () => {
    const s = demo();
    const unknown = emptySupplier();
    unknown.info.name = 'Mystery Supply';
    unknown.quote.unitPrice = 2.2;
    const st = { ...s, suppliers: [...s.suppliers, unknown] };
    const ev = evaluate(input(st));
    const m = byName(ev, 'Mystery Supply');
    expect(m).toBeDefined();
    expect(m.confidence.label).toBe('Low');
    expect(m.confidence.items.some((i) => /defect rate is unknown/.test(i.reason))).toBe(true);
    // Unknowns must not make a supplier look safer than known-good data.
    expect(m.scores.deliveryReliability).toBeLessThan(byName(ev, 'Apex Metals').scores.deliveryReliability);
  });

  it('lowers confidence for old quotes', () => {
    const s = demo();
    const old = { ...s.suppliers[0], info: { ...s.suppliers[0].info, quoteDate: '2026-01-01' } };
    expect(supplierConfidence(old, s.purchase, TODAY).score).toBeLessThan(supplierConfidence(s.suppliers[0], s.purchase, TODAY).score);
  });
});

describe('order splitting', () => {
  it('suggests a split only when it provides a diversification benefit', () => {
    const s = demo();
    const ev = evaluate(input(s));
    const split = buildSplitSuggestion(input(s), ev)!;
    expect(split.primaryName).toBe('Apex Metals');
    if (split.show) expect(split.worstCaseSplit).toBeLessThan(split.worstCaseSingle);
    const oneTime = { ...s, purchase: { ...s.purchase, frequency: 'one-time' as const } };
    expect(buildSplitSuggestion(input(oneTime), evaluate(input(oneTime)))!.show).toBe(false);
  });
});

describe('validation', () => {
  it('rejects impossible values with friendly messages', () => {
    expect(checkNumber(-0.1, RULES.defect).error).toMatch(/can’t be below 0%/);
    expect(checkNumber(101, RULES.onTime).error).toMatch(/between 0% and 100%/);
    expect(checkNumber(0, RULES.quantity).error).toMatch(/greater than zero/);
    expect(checkNumber(-5, RULES.paymentDays).error).toMatch(/can’t be negative/);
    expect(checkNumber(-1, RULES.cost).error).toMatch(/can’t be negative/);
    expect(checkNumber(0.65, RULES.defect)).toEqual({});
  });
});
