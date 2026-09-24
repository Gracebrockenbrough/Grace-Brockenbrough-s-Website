import { modeById } from '../data/modes';
import { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS, SCORE_CATEGORIES } from '../data/options';
import type { Assumptions, Evaluation, Purchase, Supplier } from '../types';
import {
  DEFAULT_DAILY_DISRUPTION_SHARE,
  DEFAULT_QUALITY_FAILURE_SHARE,
  DISRUPTION_FACTOR_LABELS,
  DISRUPTION_FACTOR_WEIGHTS,
  LATE_CREDIT_OFFSET_PCT,
  UNKNOWN_DEFAULTS,
} from '../utils/costs';
import { money } from '../utils/format';
import type { Sensitivity } from '../utils/recommendation';
import { RULES } from '../utils/validation';
import { costBasisForMode } from '../utils/weights';
import { completeness } from './SupplierForm';
import { NumberField } from './ui/fields';
import { Badge, Collapsible, Icon } from './ui/primitives';

const H = ({ children }: { children: React.ReactNode }) => <h4 className="mb-2 text-sm font-semibold text-navy">{children}</h4>;
const Formula = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-md bg-subtle px-3 py-2 font-mono text-[12px] leading-relaxed text-ink">{children}</div>
);

export const MethodologyPanel = ({
  evaluation,
  purchase,
  assumptions,
  suppliers,
  sensitivity,
  onAssumptions,
  onPurchase,
  defaultOpen = false,
}: {
  evaluation: Evaluation;
  purchase: Purchase;
  assumptions: Assumptions;
  suppliers: Supplier[];
  sensitivity: Sensitivity[];
  onAssumptions: (p: Partial<Assumptions>) => void;
  onPurchase: (p: Partial<Purchase>) => void;
  defaultOpen?: boolean;
}) => {
  const cur = purchase.baseCurrency;
  const w = evaluation.weights;
  const mode = modeById(evaluation.mode);
  return (
    <Collapsible
      title="How this recommendation was calculated"
      subtitle="Mode, weights, assumptions, formulas, missing data and confidence adjustments — nothing is hidden."
      defaultOpen={defaultOpen}
    >
      <div className="space-y-7 text-sm text-ink-2">
        <section>
          <H>1. Selected mode and weights</H>
          <p className="mb-3">
            <strong className="text-ink">{mode.label}.</strong> {mode.description}{' '}
            {evaluation.mode === 'custom' && 'Weights come from your Step 2 ratings (Not Important = 0, Slightly = 1, Important = 2, Very = 3, Critical = 5 points), adjusted up for High/Critical failure consequences.'}{' '}
            Cost is scored on <strong className="text-ink">{costBasisForMode(evaluation.mode) === 'direct' ? 'direct (cash) cost' : 'risk-adjusted total cost'}</strong>.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-1.5 pr-3 font-medium">Category</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Weight</th>
                  <th className="py-1.5 font-medium">How it is scored (0–100)</th>
                </tr>
              </thead>
              <tbody>
                {SCORE_CATEGORIES.map((c) => (
                  <tr key={c} className="border-b border-line last:border-0 align-top">
                    <td className="py-1.5 pr-3 font-medium text-ink">{CATEGORY_LABELS[c]}</td>
                    <td className="tabular py-1.5 pr-3 text-right">{(w[c] * 100).toFixed(1)}%</td>
                    <td className="py-1.5">{CATEGORY_DESCRIPTIONS[c]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Formula>Overall Deal Score = Σ (category score × category weight)</Formula>
        </section>

        <section>
          <H>2. Assumptions (editable)</H>
          <p className="mb-3">Change any assumption and every score, cost and recommendation updates immediately.</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <NumberField
              label={
                <span className="inline-flex items-center gap-1.5">
                  Cost of a significant quality failure {evaluation.qualityFailureCostAssumed && <Badge tone="caution">Default</Badge>}
                </span>
              }
              value={purchase.qualityFailureImpact}
              onChange={(qualityFailureImpact) => onPurchase({ qualityFailureImpact })}
              rule={RULES.cost}
              prefix="$"
              placeholder={evaluation.qualityFailureCostAssumed ? `${money(evaluation.qualityFailureCostBasis, cur)} (default)` : undefined}
              hint={
                evaluation.qualityFailureCostAssumed
                  ? `Default: ${(DEFAULT_QUALITY_FAILURE_SHARE[purchase.defectConsequence] * 100).toFixed(0)}% of typical purchase value for a ${purchase.defectConsequence} consequence.`
                  : 'Your estimate.'
              }
            />
            <NumberField
              label="Defect rate equal to one significant failure"
              value={assumptions.referenceDefectRate}
              onChange={(v) => onAssumptions({ referenceDefectRate: v ?? 1 })}
              rule={RULES.positive}
              suffix="%"
              allowUnknown={false}
              hint="At this defect rate, the full failure cost above is expected."
            />
            <NumberField
              label={
                <span className="inline-flex items-center gap-1.5">
                  Cost of one day of disruption {evaluation.dailyDisruptionCostAssumed && <Badge tone="caution">Default</Badge>}
                </span>
              }
              value={purchase.dailyDisruptionCost}
              onChange={(dailyDisruptionCost) => onPurchase({ dailyDisruptionCost })}
              rule={RULES.cost}
              prefix="$"
              placeholder={evaluation.dailyDisruptionCostAssumed ? `${money(evaluation.dailyDisruptionCost, cur)} (default)` : undefined}
              hint={
                evaluation.dailyDisruptionCostAssumed
                  ? `Default: ${(DEFAULT_DAILY_DISRUPTION_SHARE[purchase.interruptionConsequence] * 100).toFixed(1)}% of typical purchase value (min $1,000) for a ${purchase.interruptionConsequence} consequence.`
                  : 'Your estimate.'
              }
            />
            <NumberField
              label="Disruption days at maximum risk"
              value={assumptions.expectedDisruptionDaysAtMaxRisk}
              onChange={(v) => onAssumptions({ expectedDisruptionDaysAtMaxRisk: v ?? 10 })}
              rule={RULES.days}
              suffix="days"
              allowUnknown={false}
              hint="Expected production days lost per period for a supplier with a disruption index of 100."
            />
            <NumberField
              label="Cost of capital"
              value={assumptions.costOfCapital}
              onChange={(v) => onAssumptions({ costOfCapital: v ?? 8 })}
              rule={RULES.percent}
              suffix="% / yr"
              allowUnknown={false}
              hint="Used to value payment terms and deposits in negotiation suggestions."
            />
          </div>
          <p className="mt-3 text-xs text-muted">
            Unknown supplier inputs are replaced with conservative values: on-time delivery {UNKNOWN_DEFAULTS.onTimePct}%, lead-time variability{' '}
            {UNKNOWN_DEFAULTS.leadTimeVariabilityDays} days, financial strength {UNKNOWN_DEFAULTS.financialStrength}/10, defect rate inferred from the quality rating
            (or {UNKNOWN_DEFAULTS.defectPctNoData}%), and unknown sub-scores score 40/100. Unknown values never help a supplier — they lower confidence instead.
          </p>
        </section>

        <section>
          <H>3. Cost formulas</H>
          <div className="space-y-2">
            <Formula>Purchase Cost = Unit Price × Required Quantity × (1 − Volume Discount)</Formula>
            <Formula>Logistics Cost = (Freight + Insurance + Duties + Handling + Warehousing + Other) × Volume Scale</Formula>
            <Formula>Quality Control Cost = (Inspection + Testing + Certification Review) × Volume Scale</Formula>
            <Formula>Contract / Admin Cost = Supplier Fees + Onboarding / Qualification Cost</Formula>
            <Formula>Direct Total Cost = Purchase + Logistics + Quality Control + Contract / Admin</Formula>
          </div>
          <p className="mt-2 text-xs text-muted">
            Volume Scale = your required quantity ÷ the supplier’s quoted quantity, so quotes for different volumes are compared like-for-like. Foreign-currency quotes are
            converted at the exchange rate you enter.
          </p>
        </section>

        <section>
          <H>4. Risk-adjustment formulas (estimates)</H>
          <div className="space-y-2">
            <Formula>
              Expected Quality Failure Cost = (Effective Defect Rate ÷ {assumptions.referenceDefectRate}%) × {money(evaluation.qualityFailureCostBasis, cur)} × (1 − Protection Offset)
            </Formula>
            <Formula>
              Expected Disruption Cost = (Disruption Risk Index ÷ 100) × {assumptions.expectedDisruptionDaysAtMaxRisk} days × {money(evaluation.dailyDisruptionCost, cur)}/day × (1 − Late-Credit Offset)
            </Formula>
            <Formula>Risk-Adjusted Total Cost = Direct Total + Expected Quality Failure Cost + Expected Disruption Cost</Formula>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
            <li>Effective defect rate = the higher of the estimated and historical defect rates (conservative).</li>
            <li>
              Protection offset (max 35%): full replacement 15%, replacement only 8%, credit 6%, case-by-case 3%; supplier-paid return freight +5% (shared +2%); defect
              compensation +10%; warranty ≥12 months +5% (≥6 months +3%).
            </li>
            <li>Late-credit offset: {LATE_CREDIT_OFFSET_PCT}% when the contract includes late-delivery penalties or credits.</li>
            <li>One-time purchases use half the expected disruption days (a single delivery window).</li>
          </ul>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-xs">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-1.5 pr-3 font-medium">Disruption risk index factor</th>
                  <th className="py-1.5 text-right font-medium">Weight</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(DISRUPTION_FACTOR_WEIGHTS) as (keyof typeof DISRUPTION_FACTOR_WEIGHTS)[]).map((k) => (
                  <tr key={k} className="border-b border-line last:border-0">
                    <td className="py-1.5 pr-3">{DISRUPTION_FACTOR_LABELS[k]}</td>
                    <td className="tabular py-1.5 text-right">{DISRUPTION_FACTOR_WEIGHTS[k]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">
            The disruption index is a relative risk score inferred from supplier data, not a measured probability. Treat expected disruption cost as an estimate.
          </p>
        </section>

        <section>
          <H>5. Sensitivity check</H>
          <p className="mb-2">The ranking was re-run with the key risk assumptions changed:</p>
          <ul className="space-y-1">
            {sensitivity.map((s) => (
              <li key={s.scenario} className="flex items-start gap-2">
                <span className={s.changed ? 'text-caution' : 'text-good'}>{s.changed ? Icon.warn('h-4 w-4') : Icon.check('h-4 w-4')}</span>
                <span>
                  {s.scenario}: <strong className="text-ink">{s.winner}</strong> ranks first{s.changed ? ' — recommendation changes' : ' — unchanged'}.
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <H>6. Missing data and confidence adjustments</H>
          <p className="mb-3">
            Confidence starts at 100 and is reduced for missing, old, estimated or self-reported data. High ≥ 80, Medium 60–79, Low &lt; 60. The recommendation’s
            confidence also drops when the top two suppliers are close or the result is sensitive to assumptions.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {evaluation.results.map((r) => {
              const s = suppliers.find((x) => x.id === r.supplierId)!;
              const miss = completeness(s).missing;
              return (
                <div key={r.supplierId} className="rounded-lg border border-line p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="font-semibold text-navy">{r.name}</span>
                    <span className="tabular text-xs">
                      {r.confidence.label} ({r.confidence.score}/100)
                    </span>
                  </div>
                  <p className="mb-1 text-xs text-muted">Missing: {miss.length ? miss.join(', ') : 'none of the key fields'}</p>
                  {r.confidence.items.length ? (
                    <ul className="list-disc space-y-0.5 pl-4 text-xs">
                      {r.confidence.items.map((i) => (
                        <li key={i.reason}>
                          {i.reason} (−{i.penalty})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs">No deductions.</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </Collapsible>
  );
};
