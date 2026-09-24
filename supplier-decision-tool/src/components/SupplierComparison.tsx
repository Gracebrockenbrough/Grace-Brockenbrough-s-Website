import { useState, type ReactNode } from 'react';
import { modeById } from '../data/modes';
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, SCORE_CATEGORIES } from '../data/options';
import type { DecisionMode, Evaluation, Purchase, Supplier, SupplierScore } from '../types';
import { compactMoney, defectPct, money, netTerms, pct, singularUnit, unitMoney } from '../utils/format';
import { RiskAdjustedCostChart, supplierColor, SupplierProfileChart } from './charts';
import { ConfidenceIndicator, ConfidenceReasons } from './ConfidenceIndicator';
import { CostBreakdown } from './CostBreakdown';
import { Badge, Card, CardHeader, cx, FictionalBadge, Icon, InfoTip, ScoreBar, scoreTone, type Tone } from './ui/primitives';

export interface ModeWinner {
  mode: DecisionMode;
  name: string;
  id: string;
}

const riskTone = (r: SupplierScore['riskLevel']): Tone => (r === 'Low' ? 'good' : r === 'Moderate' ? 'neutral' : r === 'Elevated' ? 'caution' : 'risk');
const safety = (r: SupplierScore) => (r.scores.failureRisk + r.scores.deliveryReliability + r.scores.supplyContinuity + r.scores.supplierStrength) / 4;

const pickBy = <T,>(xs: T[], f: (x: T) => number | null | undefined, better: 'min' | 'max'): T | undefined => {
  let best: T | undefined;
  let bestV: number | undefined;
  for (const x of xs) {
    const v = f(x);
    if (v == null || !Number.isFinite(v)) continue;
    if (bestV == null || (better === 'min' ? v < bestV : v > bestV)) {
      best = x;
      bestV = v;
    }
  }
  return best;
};

const HighlightCard = ({ label, name, detail, tip, primary }: { label: string; name: string; detail: ReactNode; tip: string; primary?: boolean }) => (
  <div className={cx('rounded-xl border p-4', primary ? 'border-navy bg-navy text-white' : 'border-line bg-white')}>
    <div className={cx('flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]', primary ? 'text-white/70' : 'text-muted')}>
      {label}
      {!primary && <InfoTip text={tip} />}
    </div>
    <div className={cx('mt-1.5 text-base font-semibold leading-snug', primary ? 'text-white' : 'text-navy')}>
      {name}
    </div>
    <div className={cx('tabular mt-0.5 text-xs', primary ? 'text-white/80' : 'text-muted')}>{detail}</div>
  </div>
);

export const HighlightCards = ({ evaluation, suppliers, currency }: { evaluation: Evaluation; suppliers: Supplier[]; currency: string }) => {
  const rs = evaluation.results;
  const sup = (r: SupplierScore) => suppliers.find((s) => s.id === r.supplierId)!;
  const best = rs[0];
  const lowestRisk = pickBy(rs, safety, 'max');
  const lowestDirect = pickBy(rs, (r) => r.costs.direct, 'min');
  const lowestRA = pickBy(rs, (r) => r.costs.riskAdjusted, 'min');
  const fastest = pickBy(rs, (r) => sup(r).delivery.leadTimeDays, 'min');
  const bestContract = pickBy(rs, (r) => r.scores.contractProtection, 'max');
  const bestPay = pickBy(rs, (r) => r.scores.paymentTerms, 'max');
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="col-span-2 md:col-span-1">
        <HighlightCard primary label="Best overall" name={best.name} detail={`Deal score ${best.overall.toFixed(0)}/100 · ${modeById(evaluation.mode).shortLabel}`} tip="" />
      </div>
      {lowestRisk && (
        <HighlightCard
          label="Lowest risk"
          name={lowestRisk.name}
          detail={`${lowestRisk.riskLevel} risk`}
          tip="Highest average of failure-risk, delivery-reliability, supply-continuity and supplier-strength scores."
        />
      )}
      {lowestDirect && (
        <HighlightCard label="Lowest direct cost" name={lowestDirect.name} detail={money(lowestDirect.costs.direct, currency)} tip="Purchase + logistics + QC + contract/admin costs, before risk adjustments." />
      )}
      {lowestRA && (
        <HighlightCard
          label="Lowest risk-adjusted cost"
          name={lowestRA.name}
          detail={money(lowestRA.costs.riskAdjusted, currency)}
          tip="Direct cost plus expected quality-failure and supply-disruption costs."
        />
      )}
      {fastest && <HighlightCard label="Fastest delivery" name={fastest.name} detail={`${sup(fastest).delivery.leadTimeDays} days lead time`} tip="Shortest quoted lead time." />}
      {bestContract && (
        <HighlightCard label="Best contract protection" name={bestContract.name} detail={`Protection score ${bestContract.scores.contractProtection.toFixed(0)}/100`} tip={CATEGORY_DESCRIPTIONS.contractProtection} />
      )}
      {bestPay && (
        <HighlightCard
          label="Best payment terms"
          name={bestPay.name}
          detail={`${netTerms(sup(bestPay).quote.paymentTermsDays)}${sup(bestPay).quote.depositPct ? `, ${sup(bestPay).quote.depositPct}% deposit` : ', no deposit'}`}
          tip={CATEGORY_DESCRIPTIONS.paymentTerms}
        />
      )}
    </div>
  );
};

export const ModeWinnersStrip = ({
  winners,
  current,
  onSelect,
  evaluation,
}: {
  winners: ModeWinner[];
  current: DecisionMode;
  onSelect: (m: DecisionMode) => void;
  evaluation: Evaluation;
}) => {
  const lowestDirect = pickBy(evaluation.results, (r) => r.costs.direct, 'min');
  const lowestPrice = pickBy(evaluation.results, (r) => r.costs.unitPriceBase || null, 'min');
  const distinct = new Set(winners.map((w) => w.id)).size;
  return (
    <Card>
      <CardHeader
        title="Does the answer depend on your strategy?"
        subtitle={
          distinct > 1
            ? 'The recommended supplier changes with the decision mode. Click a mode to switch.'
            : `${winners[0]?.name} ranks first under every decision mode — a robust result. Reference points for headline cost are shown alongside.`
        }
      />
      <div className="grid gap-2 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">
        {winners.map((w) => (
          <button
            key={w.mode}
            type="button"
            onClick={() => onSelect(w.mode)}
            className={cx(
              'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
              w.mode === current ? 'border-navy bg-accent-soft' : 'border-line hover:border-line-strong',
            )}
          >
            <span className="min-w-0">
              <span className="font-semibold text-navy">{w.name}</span> <span className="text-muted">is best under {modeById(w.mode).label}</span>
            </span>
          </button>
        ))}
        {lowestDirect && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm">
            <span className="text-muted">Lowest direct cost</span>
            <span className="truncate font-semibold text-ink">{lowestDirect.name}</span>
          </div>
        )}
        {lowestPrice && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm">
            <span className="text-muted">Lowest unit price</span>
            <span className="truncate font-semibold text-ink">{lowestPrice.name}</span>
          </div>
        )}
      </div>
    </Card>
  );
};

type Col = { key: string; label: string; tip: string; value: (r: SupplierScore, s: Supplier) => number | null; fmt: (v: number | null, r: SupplierScore) => ReactNode; better?: 'min' | 'max' };

export const ComparisonTable = ({ evaluation, suppliers, purchase }: { evaluation: Evaluation; suppliers: Supplier[]; purchase: Purchase }) => {
  const cur = purchase.baseCurrency;
  const unit = singularUnit(purchase.unit);
  const cols: Col[] = [
    { key: 'price', label: 'Unit price', tip: `Quoted price per ${unit}, converted to ${cur}.`, value: (r, s) => (s.quote.unitPrice == null ? null : r.costs.unitPriceBase), fmt: (v) => (v == null ? 'Unknown' : unitMoney(v, cur)), better: 'min' },
    { key: 'direct', label: 'Direct total cost', tip: 'Purchase + logistics + QC + contract/admin.', value: (r) => r.costs.direct, fmt: (v) => money(v, cur), better: 'min' },
    { key: 'ra', label: 'Risk-adjusted total', tip: 'Direct total + expected quality-failure + expected disruption cost.', value: (r) => r.costs.riskAdjusted, fmt: (v) => <strong>{money(v, cur)}</strong>, better: 'min' },
    { key: 'quality', label: 'Quality score', tip: CATEGORY_DESCRIPTIONS.quality, value: (r) => r.scores.quality, fmt: (v) => v?.toFixed(0), better: 'max' },
    { key: 'defect', label: 'Defect rate', tip: 'Effective defect rate: the higher of estimated and historical.', value: (r) => r.costs.effectiveDefectPct, fmt: (v, r) => `${defectPct(v)}${r.costs.defectRateAssumed ? '*' : ''}`, better: 'min' },
    { key: 'qc', label: 'Inspection cost', tip: 'Inspection, testing and certification-review costs.', value: (r) => r.costs.qualityControl, fmt: (v) => money(v, cur), better: 'min' },
    { key: 'lead', label: 'Lead time', tip: 'Quoted lead time in days.', value: (_r, s) => s.delivery.leadTimeDays, fmt: (v) => (v == null ? 'Unknown' : `${v} d`), better: 'min' },
    { key: 'otd', label: 'Delivery reliability', tip: 'Historical on-time delivery.', value: (_r, s) => s.delivery.onTimePct, fmt: (v) => (v == null ? 'Unknown' : pct(v)), better: 'max' },
    { key: 'pay', label: 'Payment terms', tip: 'Days to pay after invoice.', value: (_r, s) => s.quote.paymentTermsDays, fmt: (v) => netTerms(v), better: 'max' },
    { key: 'contract', label: 'Contract protection', tip: CATEGORY_DESCRIPTIONS.contractProtection, value: (r) => r.scores.contractProtection, fmt: (v) => v?.toFixed(0), better: 'max' },
    { key: 'strength', label: 'Supplier strength', tip: CATEGORY_DESCRIPTIONS.supplierStrength, value: (r) => r.scores.supplierStrength, fmt: (v) => v?.toFixed(0), better: 'max' },
    { key: 'overall', label: 'Overall deal score', tip: 'Weighted combination of the ten category scores under the selected mode.', value: (r) => r.overall, fmt: (v) => <strong>{v?.toFixed(0)}</strong>, better: 'max' },
  ];
  const rows = evaluation.results.map((r) => ({ r, s: suppliers.find((x) => x.id === r.supplierId)! }));
  return (
    <Card>
      <CardHeader title="Detailed comparison" subtitle="Green marks the best value in each column. Hover the column headers for definitions." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="border-b border-line bg-subtle/60 text-left text-xs">
              <th className="sticky left-0 z-10 bg-subtle px-4 py-2.5 font-semibold text-ink-2">Supplier</th>
              {cols.map((c) => (
                <th key={c.key} className="px-3 py-2.5 text-right font-semibold text-ink-2">
                  <span className="inline-flex items-center justify-end gap-1">
                    {c.label}
                    <InfoTip text={c.tip} />
                  </span>
                </th>
              ))}
              <th className="px-4 py-2.5 text-left font-semibold text-ink-2">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ r, s }) => (
              <tr key={r.supplierId} className="border-b border-line last:border-0">
                <td className="sticky left-0 z-10 bg-white px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="tabular text-xs text-muted">#{r.rank}</span>
                    <span className="font-semibold text-navy">{r.name}</span>
                  </div>
                </td>
                {cols.map((c) => {
                  const vals = rows.map((x) => c.value(x.r, x.s)).filter((v): v is number => v != null);
                  const v = c.value(r, s);
                  const best = c.better && vals.length > 1 ? (c.better === 'min' ? Math.min(...vals) : Math.max(...vals)) : null;
                  const isBest = best != null && v != null && Math.abs(v - best) < 1e-9 && Math.min(...vals) !== Math.max(...vals);
                  return (
                    <td key={c.key} className={cx('tabular px-3 py-3 text-right', isBest ? 'font-semibold text-good' : 'text-ink', v == null && 'text-muted')}>
                      {c.fmt(v, r)}
                    </td>
                  );
                })}
                <td className="px-4 py-3">
                  <ConfidenceIndicator confidence={r.confidence} compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {evaluation.results.some((r) => r.costs.defectRateAssumed) && (
        <p className="border-t border-line px-5 py-2 text-xs text-muted">* Defect rate unknown — inferred from the quality rating (or 1% if no rating).</p>
      )}
    </Card>
  );
};

export const SupplierScoreCard = ({ r, supplier, currency, color }: { r: SupplierScore; supplier: Supplier; currency: string; color: string }) => {
  const [showAll, setShowAll] = useState(false);
  return (
    <Card as="article" className="flex flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: color }} aria-hidden />
            <span className="eyebrow">Rank #{r.rank}</span>
            {supplier.info.isFictional && <FictionalBadge />}
          </div>
          <h4 className="mt-1 truncate text-base font-semibold text-navy">{r.name}</h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <Badge tone={riskTone(r.riskLevel)}>{r.riskLevel} risk</Badge>
            <ConfidenceIndicator confidence={r.confidence} />
          </div>
        </div>
        <div className="text-right">
          <div className={cx('tabular text-3xl font-bold', scoreTone(r.overall) === 'good' ? 'text-good' : scoreTone(r.overall) === 'caution' ? 'text-caution' : 'text-risk')}>
            {r.overall.toFixed(0)}
          </div>
          <div className="text-[11px] text-muted">Deal score /100</div>
        </div>
      </div>
      <div className="space-y-4 px-5 py-4">
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-subtle/70 p-3 text-sm">
          <div>
            <div className="text-[11px] text-muted">Direct cost</div>
            <div className="tabular font-semibold text-ink">{compactMoney(r.costs.direct, currency)}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted">Risk-adjusted cost</div>
            <div className="tabular font-semibold text-navy">{compactMoney(r.costs.riskAdjusted, currency)}</div>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-ink-2">{r.rankExplanation}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-1.5 text-xs font-semibold text-good">Strengths</div>
            {r.strengths.length ? (
              <ul className="space-y-1">
                {r.strengths.slice(0, 4).map((t) => (
                  <li key={t} className="flex gap-1.5 text-xs leading-snug text-ink-2">
                    <span className="mt-px shrink-0 text-good">{Icon.check('h-3.5 w-3.5')}</span>
                    {t}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">No standout strengths relative to the other quotes.</p>
            )}
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-risk">Weaknesses</div>
            {r.weaknesses.length ? (
              <ul className="space-y-1">
                {r.weaknesses.slice(0, 4).map((t) => (
                  <li key={t} className="flex gap-1.5 text-xs leading-snug text-ink-2">
                    <span className="mt-px shrink-0 text-risk">{Icon.minus('h-3.5 w-3.5')}</span>
                    {t}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">No notable weaknesses relative to the other quotes.</p>
            )}
          </div>
        </div>
        <button type="button" className="text-xs font-medium text-accent hover:underline" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Hide' : 'Show'} category scores and confidence details
        </button>
        {showAll && (
          <div className="space-y-4">
            <ul className="space-y-1.5">
              {SCORE_CATEGORIES.map((c) => (
                <li key={c} className="grid grid-cols-[9.5rem_1fr] items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 text-ink-2">
                    {CATEGORY_LABELS[c]} <InfoTip text={CATEGORY_DESCRIPTIONS[c]} />
                  </span>
                  <ScoreBar score={r.scores[c]} />
                </li>
              ))}
            </ul>
            <div>
              <div className="mb-1.5 text-xs font-semibold text-ink">Why confidence is {r.confidence.label.toLowerCase()}</div>
              <ConfidenceReasons confidence={r.confidence} />
            </div>
            {r.assumedInputs.length > 0 && (
              <div>
                <div className="mb-1 text-xs font-semibold text-ink">Assumptions substituted for unknown inputs</div>
                <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted">
                  {r.assumedInputs.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export const SupplierComparison = ({
  evaluation,
  suppliers,
  purchase,
  winners,
  onModeChange,
}: {
  evaluation: Evaluation;
  suppliers: Supplier[];
  purchase: Purchase;
  winners: ModeWinner[];
  onModeChange: (m: DecisionMode) => void;
}) => {
  const cur = purchase.baseCurrency;
  const colorIndex = (id: string) => suppliers.findIndex((s) => s.id === id);
  return (
    <div className="space-y-5">
      <HighlightCards evaluation={evaluation} suppliers={suppliers} currency={cur} />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Risk-adjusted cost comparison"
            subtitle="Direct cost plus expected failure and disruption costs. The cheapest quote is not always the cheapest decision."
          />
          <div className="px-3 py-4">
            <RiskAdjustedCostChart results={evaluation.results} currency={cur} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Supplier risk profile" subtitle="Scores out of 100 on five dimensions — higher is better." />
          <div className="px-3 py-4">
            <SupplierProfileChart results={evaluation.results} colorIndex={colorIndex} />
          </div>
        </Card>
      </div>
      <ComparisonTable evaluation={evaluation} suppliers={suppliers} purchase={purchase} />
      <div>
        <h3 className="section-title mb-1">Every supplier, scored and explained</h3>
        <p className="mb-3 text-sm text-muted">No supplier is automatically eliminated. Each one keeps its score, strengths, weaknesses, risk level and confidence.</p>
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {evaluation.results.map((r) => (
            <SupplierScoreCard key={r.supplierId} r={r} supplier={suppliers.find((s) => s.id === r.supplierId)!} currency={cur} color={supplierColor(colorIndex(r.supplierId))} />
          ))}
        </div>
      </div>
      <CostBreakdown results={evaluation.results} currency={cur} />
      <ModeWinnersStrip winners={winners} current={evaluation.mode} onSelect={onModeChange} evaluation={evaluation} />
    </div>
  );
};
