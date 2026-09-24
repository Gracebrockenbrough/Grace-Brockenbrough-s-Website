import type { CostBreakdown as Costs, SupplierScore } from '../types';
import { defectPct, money, num } from '../utils/format';
import { CostBreakdownChart } from './charts';
import { Card, CardHeader, cx, InfoTip } from './ui/primitives';

interface Row {
  key: keyof Costs | 'riskPremium';
  label: string;
  tip: string;
  kind?: 'subtotal' | 'total' | 'estimate';
  value: (c: Costs) => number;
}

const ROWS: Row[] = [
  { key: 'purchase', label: 'Purchase cost', tip: 'Unit price × required quantity − volume discount.', value: (c) => c.purchase },
  { key: 'logistics', label: 'Logistics cost', tip: 'Freight, insurance, duties, handling, warehousing and other logistics fees.', value: (c) => c.logistics },
  { key: 'qualityControl', label: 'Quality-control cost', tip: 'Inspection, testing, certification review and other QC expenses you incur.', value: (c) => c.qualityControl },
  { key: 'contractAdmin', label: 'Contract / administrative cost', tip: 'Supplier fees plus one-time onboarding / qualification cost.', value: (c) => c.contractAdmin },
  { key: 'direct', label: 'Direct total cost', tip: 'All known cash costs before risk adjustment.', kind: 'subtotal', value: (c) => c.direct },
  {
    key: 'expectedQualityFailure',
    label: 'Expected quality-failure cost',
    tip: 'Estimate: (defect rate ÷ reference rate) × cost of a significant failure, reduced by the share the supplier’s return/replacement protections would recover.',
    kind: 'estimate',
    value: (c) => c.expectedQualityFailure,
  },
  {
    key: 'expectedDisruption',
    label: 'Expected supply-disruption cost',
    tip: 'Estimate: disruption risk index × expected disruption days at maximum risk × daily disruption cost, reduced 15% where late-delivery credits apply. A relative estimate, not a known probability.',
    kind: 'estimate',
    value: (c) => c.expectedDisruption,
  },
  { key: 'riskAdjusted', label: 'Risk-adjusted total cost', tip: 'Direct total + expected quality-failure cost + expected disruption cost.', kind: 'total', value: (c) => c.riskAdjusted },
];

export const CostBreakdownTable = ({ results, currency }: { results: SupplierScore[]; currency: string }) => (
  <div className="overflow-x-auto">
    <table className="w-full min-w-[560px] text-sm">
      <thead>
        <tr className="border-b border-line text-left">
          <th className="py-2 pr-4 font-medium text-muted">Cost bucket</th>
          {results.map((r) => (
            <th key={r.supplierId} className="py-2 pl-4 text-right font-semibold text-navy">
              {r.name}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ROWS.map((row) => {
          const vals = results.map((r) => row.value(r.costs));
          const min = Math.min(...vals);
          const spread = Math.max(...vals) - min;
          return (
            <tr
              key={row.key}
              className={cx(
                'border-b border-line last:border-0',
                row.kind === 'subtotal' && 'bg-subtle/60',
                row.kind === 'total' && 'bg-accent-soft/70',
              )}
            >
              <td className={cx('py-2 pr-4', row.kind ? 'font-semibold text-ink' : 'text-ink-2')}>
                <span className="inline-flex items-center gap-1.5">
                  {row.label}
                  {row.kind === 'estimate' && <span className="rounded bg-caution-soft px-1 text-[10px] font-semibold text-caution">EST.</span>}
                  <InfoTip text={row.tip} />
                </span>
              </td>
              {results.map((r, i) => (
                <td
                  key={r.supplierId}
                  className={cx(
                    'tabular py-2 pl-4 text-right',
                    row.kind === 'total' ? 'text-base font-bold text-navy' : row.kind === 'subtotal' ? 'font-semibold text-ink' : 'text-ink',
                    spread > 1 && vals[i] === min && 'text-good',
                  )}
                >
                  {money(vals[i], currency)}
                  {spread > 1 && vals[i] === min && <span className="sr-only"> (lowest)</span>}
                </td>
              ))}
            </tr>
          );
        })}
        <tr className="text-xs text-muted">
          <td className="pt-3 pr-4">Assumptions used</td>
          {results.map((r) => (
            <td key={r.supplierId} className="tabular pt-3 pl-4 text-right leading-relaxed">
              Defect {defectPct(r.costs.effectiveDefectPct)}
              {r.costs.defectRateAssumed && ' (assumed)'} · protection offset {r.costs.protectionOffsetPct}%
              <br />
              Disruption index {num(r.costs.disruptionRiskIndex, 0)}/100 · {num(r.costs.expectedDisruptionDays, 1)} days
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  </div>
);

export const CostBreakdown = ({ results, currency }: { results: SupplierScore[]; currency: string }) => (
  <Card>
    <CardHeader
      title="Cost breakdown"
      subtitle="Costs are split into buckets — not one number. Expected failure and disruption costs are estimates and are labelled as such."
    />
    <div className="space-y-6 px-5 py-5">
      <CostBreakdownChart results={results} currency={currency} />
      <CostBreakdownTable results={results} currency={currency} />
    </div>
  </Card>
);
