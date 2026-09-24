import { MODES, modeById } from '../data/modes';
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, SCORE_CATEGORIES } from '../data/options';
import type { DecisionMode, DecisionWeights } from '../types';
import { costBasisForMode } from '../utils/weights';
import { Collapsible, cx, InfoTip, Tabs } from './ui/primitives';

/** Card grid used in Step 2 to pick a strategy. */
export const ModeSelector = ({ value, onChange }: { value: DecisionMode; onChange: (m: DecisionMode) => void }) => (
  <div role="radiogroup" aria-label="Decision mode" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    {MODES.map((m) => {
      const active = m.id === value;
      return (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(m.id)}
          className={cx(
            'flex h-full flex-col rounded-lg border p-4 text-left transition-colors',
            active ? 'border-navy bg-accent-soft ring-1 ring-navy' : 'border-line bg-white hover:border-line-strong',
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-navy">{m.label}</span>
            <span
              className={cx('flex h-4 w-4 shrink-0 items-center justify-center rounded-full border', active ? 'border-navy bg-navy' : 'border-line-strong')}
              aria-hidden
            >
              {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
            </span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">{m.description}</p>
          <p className="mt-auto pt-2 text-[11px] text-ink-2">
            <span className="font-medium">Prioritises:</span> {m.emphasis.join(', ')}
          </p>
        </button>
      );
    })}
  </div>
);

/** Compact tab strip used on the analysis steps so modes can be switched after data entry. */
export const ModeTabs = ({ value, onChange }: { value: DecisionMode; onChange: (m: DecisionMode) => void }) => (
  <Tabs tabs={MODES.map((m) => ({ value: m.id, label: m.shortLabel }))} value={value} onChange={onChange} />
);

export const WeightsPanel = ({ mode, weights, defaultOpen = false }: { mode: DecisionMode; weights: DecisionWeights; defaultOpen?: boolean }) => {
  const sorted = [...SCORE_CATEGORIES].sort((a, b) => weights[b] - weights[a]);
  const max = Math.max(...SCORE_CATEGORIES.map((c) => weights[c]));
  return (
    <Collapsible
      title={`Weights used: ${modeById(mode).label}`}
      subtitle={
        costBasisForMode(mode) === 'direct'
          ? 'Cost is scored on direct (cash) cost in this mode. Expected failure and disruption costs still appear in the risk-adjusted figures.'
          : 'Cost is scored on risk-adjusted total cost in this mode.'
      }
      defaultOpen={defaultOpen}
    >
      <ul className="grid gap-x-8 gap-y-2 md:grid-cols-2">
        {sorted.map((c) => (
          <li key={c} className="flex items-center gap-3 text-sm">
            <span className="flex w-44 shrink-0 items-center gap-1.5 text-ink-2">
              {CATEGORY_LABELS[c]} <InfoTip text={CATEGORY_DESCRIPTIONS[c]} />
            </span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
              <span className="block h-full rounded-full bg-navy/70" style={{ width: `${max ? (weights[c] / max) * 100 : 0}%` }} />
            </span>
            <span className="tabular w-11 text-right text-xs font-semibold text-ink">{(weights[c] * 100).toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </Collapsible>
  );
};
