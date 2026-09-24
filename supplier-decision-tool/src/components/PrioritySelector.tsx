import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, PRIORITY_FACTORS, PRIORITY_LEVELS, SCORE_CATEGORIES } from '../data/options';
import type { DecisionWeights, Priorities, PriorityFactor, PriorityLevel, Purchase } from '../types';
import { prioritySummary, weightsFromPriorities } from '../utils/weights';
import { RULES } from '../utils/validation';
import { NumberField } from './ui/fields';
import { Callout, Card, CardHeader, cx, InfoTip } from './ui/primitives';

const LevelPicker = ({ value, onChange, label }: { value: PriorityLevel; onChange: (v: PriorityLevel) => void; label: string }) => (
  <div role="radiogroup" aria-label={label} className="grid grid-cols-5 gap-1">
    {PRIORITY_LEVELS.map((l) => {
      const active = l.value === value;
      return (
        <button
          key={l.value}
          type="button"
          role="radio"
          aria-checked={active}
          title={l.label}
          onClick={() => onChange(l.value)}
          className={cx(
            'rounded-md border px-1 py-1.5 text-[11px] font-medium leading-tight transition-colors sm:text-xs',
            active
              ? l.value === 4
                ? 'border-navy bg-navy text-white'
                : 'border-navy bg-accent-soft text-navy'
              : 'border-line bg-white text-muted hover:border-line-strong hover:text-ink',
          )}
        >
          {l.label}
        </button>
      );
    })}
  </div>
);

export const PrioritySelector = ({
  priorities,
  purchase,
  onChange,
  advancedWeights,
  onAdvancedWeights,
}: {
  priorities: Priorities;
  purchase: Purchase;
  onChange: (f: PriorityFactor, l: PriorityLevel) => void;
  advancedWeights: DecisionWeights | null;
  onAdvancedWeights: (w: DecisionWeights | null) => void;
}) => {
  const derived = weightsFromPriorities(priorities, purchase);
  const advancedTotal = advancedWeights ? SCORE_CATEGORIES.reduce((s, c) => s + (advancedWeights[c] || 0), 0) : 0;
  return (
    <Card>
      <CardHeader
        eyebrow="Your priorities"
        title="What matters most for this purchase?"
        subtitle="Rate each factor. The tool converts your ratings into weights automatically — no percentages needed."
      />
      <div className="px-5 py-4">
        <Callout tone="accent" className="mb-4">
          {prioritySummary(priorities)}
        </Callout>
        <ul className="divide-y divide-line">
          {PRIORITY_FACTORS.map((f) => (
            <li key={f.key} className="grid gap-2 py-3 md:grid-cols-[minmax(0,15rem)_1fr] md:items-center md:gap-6">
              <div>
                <div className="text-sm font-medium text-ink">{f.label}</div>
                <div className="text-xs text-muted">{f.description}</div>
              </div>
              <LevelPicker label={f.label} value={priorities[f.key]} onChange={(l) => onChange(f.key, l)} />
            </li>
          ))}
        </ul>
        <div className="mt-4 rounded-lg border border-line bg-subtle/60 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[#142a4a]"
              checked={advancedWeights != null}
              onChange={(e) =>
                onAdvancedWeights(
                  e.target.checked
                    ? (Object.fromEntries(SCORE_CATEGORIES.map((c) => [c, Math.round(derived[c] * 1000) / 10])) as DecisionWeights)
                    : null,
                )
              }
            />
            <span>
              <span className="block text-sm font-medium text-ink">Advanced: set exact category weights</span>
              <span className="block text-xs text-muted">
                Overrides the ratings above for the Custom mode. Weights are normalised, so they don’t have to add up to exactly 100.
              </span>
            </span>
          </label>
          {advancedWeights && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {SCORE_CATEGORIES.map((c) => (
                <NumberField
                  key={c}
                  label={
                    <span className="inline-flex items-center gap-1">
                      {CATEGORY_LABELS[c]}
                      <InfoTip text={CATEGORY_DESCRIPTIONS[c]} />
                    </span>
                  }
                  value={advancedWeights[c]}
                  onChange={(v) => onAdvancedWeights({ ...advancedWeights, [c]: v ?? 0 })}
                  rule={RULES.percent}
                  suffix="%"
                  allowUnknown={false}
                  placeholder="0"
                />
              ))}
              <p className={cx('text-xs sm:col-span-2 lg:col-span-5', Math.abs(advancedTotal - 100) > 0.5 ? 'text-caution' : 'text-muted')}>
                Total entered: {advancedTotal.toFixed(1)}%{Math.abs(advancedTotal - 100) > 0.5 && ' — weights will be scaled proportionally to 100%.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
