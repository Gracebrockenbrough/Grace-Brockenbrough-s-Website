// Data-quality confidence. Confidence is about how much we can trust the inputs,
// not about how good the supplier is.
import type { ConfidenceItem, ConfidenceLabel, ConfidenceResult, Purchase, Supplier } from '../types';
import { possessive } from './format';

export const confidenceLabel = (score: number): ConfidenceLabel => (score >= 80 ? 'High' : score >= 60 ? 'Medium' : 'Low');

export const quoteAgeDays = (quoteDate: string, today = new Date()): number | null => {
  if (!quoteDate) return null;
  const d = new Date(`${quoteDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((today.getTime() - d.getTime()) / 86_400_000);
};

const countUnknown = (values: string[]) => values.filter((v) => v === 'unknown').length;

export const supplierConfidence = (s: Supplier, purchase: Purchase, today = new Date()): ConfidenceResult => {
  const items: ConfidenceItem[] = [];
  const add = (reason: string, penalty: number, importance: 'major' | 'minor' = 'minor') =>
    items.push({ reason, penalty, importance });
  const name = s.info.name || 'This supplier';

  if (s.quote.unitPrice == null) add(`${name} has no unit price entered — costs cannot be compared reliably.`, 35, 'major');

  const est = s.quality.estimatedDefectPct;
  const hist = s.quality.historicalDefectPct;
  if (est == null && hist == null) {
    add(`${possessive(name)} defect rate is unknown, so expected quality-failure cost is inferred.`, 14, 'major');
  } else if (hist == null) {
    add(`${possessive(name)} quality history is unknown — the defect rate is an estimate with no track record behind it.`, 10, 'major');
  }
  if (s.quality.qualityDataSource === 'self-reported') {
    add(`${possessive(name)} quality metrics are self-reported and have not been independently verified.`, 8, 'major');
  } else if (s.quality.qualityDataSource === 'unknown') {
    add(`The source of ${possessive(name)} quality data is not specified.`, 4);
  }
  if (s.quality.qualityRating == null) add(`${possessive(name)} material quality rating is unknown.`, 8, 'major');
  if (s.quality.pastQualityIncidents == null) add(`${possessive(name)} past quality incidents are unknown.`, 3);

  if (s.delivery.onTimePct == null) add(`${possessive(name)} on-time delivery history is unknown.`, 10, 'major');
  if (s.delivery.leadTimeDays == null) add(`${possessive(name)} lead time is unknown.`, 6);
  if (s.delivery.leadTimeVariabilityDays == null) add(`${possessive(name)} lead-time variability is unknown.`, 3);

  if (s.info.financialStrength == null) add(`${possessive(name)} financial strength information is missing.`, 8, 'major');
  if (s.info.relationship === 'new') add(`${name} is a new supplier with no purchasing history.`, 10, 'major');
  else if (s.info.relationship === 'limited') add(`${name} has limited purchasing history with your company.`, 6);

  const logistics = [s.quote.freight, s.quote.insurance, s.quote.duties, s.quote.handling];
  if (logistics.every((v) => v == null)) add(`${possessive(name)} shipping and logistics costs were not provided.`, 6, 'major');
  else if (s.quote.logisticsCostBasis === 'estimate') add(`${possessive(name)} shipping costs are estimates, not firm quotes.`, 5);

  if (s.quote.paymentTermsDays == null) add(`${possessive(name)} payment terms are unknown.`, 4);
  if (s.quote.currency !== purchase.baseCurrency && s.quote.fxRate == null)
    add(`${name} quoted in ${s.quote.currency} with no exchange rate — a 1:1 rate was assumed.`, 10, 'major');

  const age = quoteAgeDays(s.info.quoteDate, today);
  if (age == null) add(`${possessive(name)} quote date is not recorded.`, 4);
  else if (age > 90) add(`${possessive(name)} quote is ${age} days old and may no longer be valid.`, 15, 'major');
  else if (age > 60) add(`${possessive(name)} quote is ${age} days old.`, 10);
  else if (age > 30) add(`${possessive(name)} quote is ${age} days old.`, 5);

  const p = s.protection;
  const protectionUnknown =
    countUnknown([p.returnShipping, p.replacementPolicy, p.productLiability, p.insuranceCoverage, p.defectCompensation, p.lateDeliveryCredits]) +
    (p.warrantyMonths == null ? 1 : 0) +
    (p.returnWindowDays == null ? 1 : 0);
  if (protectionUnknown >= 3) add(`${protectionUnknown} of ${possessive(name)} return, warranty and protection terms are unknown.`, 5);

  const r = s.risk;
  const riskUnknown = countUnknown([
    r.singleSource,
    r.multipleFacilities,
    r.backupProduction,
    r.geographicRisk,
    r.supplyChainConcentration,
    r.rawMaterialAvailabilityRisk,
  ]);
  if (riskUnknown >= 3) add(`${riskUnknown} of ${possessive(name)} supply-risk factors are unknown.`, 5);

  const score = Math.max(0, 100 - items.reduce((sum, i) => sum + i.penalty, 0));
  items.sort((a, b) => b.penalty - a.penalty);
  return { score, label: confidenceLabel(score), items };
};
