import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import type { SupplierScore } from '../types';
import { compactMoney, money } from '../utils/format';
import { Segmented } from './ui/fields';

// Categorical supplier colors in fixed order (validated palette); color follows the supplier, never its rank.
export const SUPPLIER_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#4a3aa7', '#e87ba4', '#eda100', '#008300', '#e34948'];
const OVERFLOW_COLOR = '#8a93a3';
export const supplierColor = (index: number) => SUPPLIER_COLORS[index] ?? OVERFLOW_COLOR;

// Cost buckets: known cash costs in a blue ramp, probabilistic risk costs in orange.
const BUCKETS = [
  { key: 'purchase', label: 'Purchase cost', color: '#0d366b' },
  { key: 'logistics', label: 'Shipping / logistics', color: '#256abf' },
  { key: 'qualityControl', label: 'Inspection / QC', color: '#5598e7' },
  { key: 'contractAdmin', label: 'Contract / admin', color: '#9ec5f4' },
  { key: 'expectedQualityFailure', label: 'Expected quality failure (est.)', color: '#c4501f' },
  { key: 'expectedDisruption', label: 'Expected disruption (est.)', color: '#f19a6c' },
] as const;

const AXIS = { fontSize: 12, fill: '#66728a' };
const GRID = '#eceef2';

const MoneyTooltip = ({ active, payload, label, currency }: TooltipContentProps<number, string> & { currency: string }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="rounded-md border border-line bg-white px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-navy">{label}</div>
      {payload.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="tabular font-medium text-ink">{money(Number(p.value), currency)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div className="mt-1 flex justify-between gap-4 border-t border-line pt-1 font-semibold text-ink">
          <span>Total</span>
          <span className="tabular">{money(total, currency)}</span>
        </div>
      )}
    </div>
  );
};

const chartHeight = (n: number) => Math.max(160, n * 52 + 70);

/** Stacked cost buckets per supplier. Purchase cost can be hidden so the smaller buckets are readable. */
export const CostBreakdownChart = ({ results, currency }: { results: SupplierScore[]; currency: string }) => {
  const [view, setView] = useState<'beyond' | 'all'>('beyond');
  const buckets = view === 'all' ? BUCKETS : BUCKETS.filter((b) => b.key !== 'purchase');
  const data = results.map((r) => ({
    name: r.name,
    ...Object.fromEntries(BUCKETS.map((b) => [b.key, Math.round(r.costs[b.key])])),
  }));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {view === 'beyond'
            ? 'Costs on top of the purchase price — where suppliers really differ.'
            : 'Full cost stack including purchase price.'}
        </p>
        <Segmented
          ariaLabel="Cost view"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: 'beyond', label: 'Beyond purchase price' },
            { value: 'all', label: 'Full cost' },
          ]}
        />
      </div>
      <ResponsiveContainer width="100%" height={chartHeight(results.length)}>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }} barCategoryGap="30%">
          <CartesianGrid horizontal={false} stroke={GRID} />
          <XAxis type="number" tickFormatter={(v) => compactMoney(v, currency)} tick={AXIS} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="name" width={150} tick={{ ...AXIS, fill: '#13233a' }} axisLine={false} tickLine={false} />
          <Tooltip content={(p) => <MoneyTooltip {...(p as TooltipContentProps<number, string>)} currency={currency} />} cursor={{ fill: '#f1f3f6' }} />
          <Legend itemSorter={null} iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {buckets.map((b, i) => (
            <Bar
              key={b.key}
              dataKey={b.key}
              name={b.label}
              stackId="cost"
              fill={b.color}
              stroke="#ffffff"
              strokeWidth={2}
              maxBarSize={24}
              radius={i === buckets.length - 1 ? [0, 4, 4, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

/** Risk-adjusted total = direct cost + expected risk costs, one bar per supplier. */
export const RiskAdjustedCostChart = ({ results, currency }: { results: SupplierScore[]; currency: string }) => {
  const min = Math.min(...results.map((r) => r.costs.riskAdjusted));
  const data = results.map((r) => ({
    name: r.name,
    direct: Math.round(r.costs.direct),
    risk: Math.round(r.costs.expectedQualityFailure + r.costs.expectedDisruption),
    total: r.costs.riskAdjusted,
    label: `${compactMoney(r.costs.riskAdjusted, currency)}${r.costs.riskAdjusted > min ? ` (+${compactMoney(r.costs.riskAdjusted - min, currency)})` : ' · lowest'}`,
  }));
  return (
    <ResponsiveContainer width="100%" height={chartHeight(results.length)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 130, top: 4, bottom: 4 }} barCategoryGap="30%">
        <CartesianGrid horizontal={false} stroke={GRID} />
        <XAxis type="number" tickFormatter={(v) => compactMoney(v, currency)} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={150} tick={{ ...AXIS, fill: '#13233a' }} axisLine={false} tickLine={false} />
        <Tooltip content={(p) => <MoneyTooltip {...(p as TooltipContentProps<number, string>)} currency={currency} />} cursor={{ fill: '#f1f3f6' }} />
        <Legend itemSorter={null} iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="direct" name="Direct cost" stackId="t" fill="#256abf" stroke="#ffffff" strokeWidth={2} maxBarSize={24} />
        <Bar dataKey="risk" name="Expected failure + disruption (est.)" stackId="t" fill="#eb6834" stroke="#ffffff" strokeWidth={2} maxBarSize={24} radius={[0, 4, 4, 0]}>
          <LabelList dataKey="label" position="right" style={{ fontSize: 12, fill: '#13233a', fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

const PROFILE = [
  { key: 'quality', label: 'Quality', get: (r: SupplierScore) => (r.scores.quality + r.scores.failureRisk) / 2 },
  { key: 'delivery', label: 'Delivery', get: (r: SupplierScore) => (r.scores.deliveryReliability * 2 + r.scores.leadTime) / 3 },
  { key: 'contract', label: 'Contract protection', get: (r: SupplierScore) => r.scores.contractProtection },
  { key: 'strength', label: 'Supplier strength', get: (r: SupplierScore) => (r.scores.supplierStrength + r.scores.supplyContinuity) / 2 },
  { key: 'cost', label: 'Cost efficiency', get: (r: SupplierScore) => r.scores.totalCost },
];

/** Grouped columns: five risk/value dimensions, one column per supplier. */
export const SupplierProfileChart = ({ results, colorIndex }: { results: SupplierScore[]; colorIndex: (id: string) => number }) => {
  const data = PROFILE.map((d) => ({
    dimension: d.label,
    ...Object.fromEntries(results.map((r) => [r.supplierId, Math.round(d.get(r))])),
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: -12, right: 8, top: 8, bottom: 4 }} barGap={2} barCategoryGap="22%">
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="dimension" tick={AXIS} axisLine={{ stroke: '#cfd4dc' }} tickLine={false} interval={0} />
        <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: '#f1f3f6' }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <div className="rounded-md border border-line bg-white px-3 py-2 text-xs shadow-lg">
                <div className="mb-1 font-semibold text-navy">{label} score</div>
                {payload.map((p) => (
                  <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
                      {p.name}
                    </span>
                    <span className="tabular font-medium text-ink">{p.value}/100</span>
                  </div>
                ))}
              </div>
            ) : null
          }
        />
        <Legend itemSorter={null} iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {results.map((r) => (
          <Bar key={r.supplierId} dataKey={r.supplierId} name={r.name} fill={supplierColor(colorIndex(r.supplierId))} maxBarSize={24} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};
