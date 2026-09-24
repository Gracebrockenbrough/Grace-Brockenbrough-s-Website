import { FREQUENCIES, MATERIAL_CATEGORIES, SEVERITIES } from '../data/options';
import type { Purchase, Severity } from '../types';
import { money } from '../utils/format';
import { RULES } from '../utils/validation';
import { NumberField, SelectField, TextAreaField, TextField } from './ui/fields';
import { Card, CardHeader, Collapsible, cx } from './ui/primitives';

const SeverityPicker = ({ value, onChange, name }: { value: Severity; onChange: (v: Severity) => void; name: string }) => (
  <div role="radiogroup" aria-label={name} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {SEVERITIES.map((s) => {
      const active = s.value === value;
      const tone =
        s.value === 'critical' ? 'border-risk bg-risk-soft' : s.value === 'high' ? 'border-caution bg-caution-soft' : 'border-navy bg-accent-soft';
      return (
        <button
          key={s.value}
          type="button"
          role="radio"
          aria-checked={active}
          onClick={() => onChange(s.value)}
          className={cx(
            'rounded-lg border px-3 py-2.5 text-left transition-colors',
            active ? tone : 'border-line bg-white hover:border-line-strong',
          )}
        >
          <div className="text-sm font-semibold text-ink">{s.label}</div>
          <div className="mt-0.5 text-xs leading-snug text-muted">{s.hint}</div>
        </button>
      );
    })}
  </div>
);

export const PurchaseSetup = ({
  purchase,
  onChange,
  showErrors,
}: {
  purchase: Purchase;
  onChange: (p: Partial<Purchase>) => void;
  showErrors: boolean;
}) => (
  <div className="space-y-5">
    <Card>
      <CardHeader eyebrow="Step 1" title="What are you buying?" subtitle="Describe the raw material and how it is used. This shapes how heavily failures and delays are penalised." />
      <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
        <TextField
          label="Purchase name"
          required
          value={purchase.name}
          onChange={(name) => onChange({ name })}
          placeholder="e.g. Industrial-grade stainless steel"
          error={showErrors && !purchase.name.trim() ? 'Give this purchase a name so the recommendation memo can refer to it.' : undefined}
          className="md:col-span-2"
        />
        <SelectField
          label="Material category"
          value={purchase.category}
          onChange={(category) => onChange({ category })}
          options={MATERIAL_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        {purchase.category === 'Other' ? (
          <TextField
            label="Custom category"
            required
            value={purchase.customCategory}
            onChange={(customCategory) => onChange({ customCategory })}
            placeholder="e.g. Specialty glass"
            error={showErrors && !purchase.customCategory.trim() ? 'Describe the category.' : undefined}
          />
        ) : (
          <SelectField
            label="Purchase frequency"
            value={purchase.frequency}
            onChange={(frequency) => onChange({ frequency })}
            options={FREQUENCIES}
          />
        )}
        {purchase.category === 'Other' && (
          <SelectField label="Purchase frequency" value={purchase.frequency} onChange={(frequency) => onChange({ frequency })} options={FREQUENCIES} />
        )}
        <TextAreaField
          label="How is this material being used?"
          value={purchase.usage}
          onChange={(usage) => onChange({ usage })}
          placeholder="e.g. Used to manufacture structural components in production equipment."
          hint="The consequences of failure depend on how the material is used."
          className="md:col-span-2"
        />
        <div className="grid grid-cols-[1fr_8rem] gap-3 md:col-span-2 md:grid-cols-[1fr_10rem_10rem]">
          <NumberField
            label="Expected purchase volume"
            required
            allowUnknown={false}
            value={purchase.quantity}
            onChange={(quantity) => onChange({ quantity })}
            rule={RULES.quantity}
            placeholder="e.g. 500,000"
            hint="Total volume for this purchase or contract period. All supplier costs are normalised to this volume."
          />
          <TextField
            label="Unit of measure"
            required
            value={purchase.unit}
            onChange={(unit) => onChange({ unit })}
            placeholder="lbs, kg, units"
            error={showErrors && !purchase.unit.trim() ? 'Add a unit.' : undefined}
          />
          <SelectField
            label="Base currency"
            value={purchase.baseCurrency}
            onChange={(baseCurrency) => onChange({ baseCurrency })}
            options={['USD', 'EUR', 'GBP', 'CAD', 'MXN', 'CNY', 'JPY', 'INR', 'AUD', 'CHF'].map((c) => ({ value: c, label: c }))}
            className="col-span-2 md:col-span-1"
          />
        </div>
        {showErrors && (purchase.quantity == null || purchase.quantity <= 0) && (
          <p className="text-xs text-risk md:col-span-2">Enter the expected purchase volume so costs can be compared on the same basis.</p>
        )}
      </div>
    </Card>

    <Card>
      <CardHeader title="Consequence of failure" subtitle="What happens if this material is defective?" />
      <div className="space-y-4 px-5 py-5">
        <SeverityPicker name="Consequence of a quality failure" value={purchase.defectConsequence} onChange={(defectConsequence) => onChange({ defectConsequence })} />
        <Collapsible title="Advanced: estimated financial impact" subtitle="Optional — replaces the default assumption used for expected quality-failure cost">
          <NumberField
            label="Estimated financial impact of a significant quality failure"
            value={purchase.qualityFailureImpact}
            onChange={(qualityFailureImpact) => onChange({ qualityFailureImpact })}
            rule={RULES.cost}
            prefix="$"
            tooltip="Scrap, rework, downtime, recalls and customer penalties caused by a significant quality failure. By default the tool treats a 1% defect rate as one significant failure (editable on the recommendation page)."
            hint="Leave as Unknown to use a default based on purchase value and the severity above."
            className="max-w-md"
          />
        </Collapsible>
      </div>
    </Card>

    <Card>
      <CardHeader title="Consequence of supply interruption" subtitle="What happens if this material does not arrive on time?" />
      <div className="space-y-4 px-5 py-5">
        <SeverityPicker
          name="Consequence of a supply interruption"
          value={purchase.interruptionConsequence}
          onChange={(interruptionConsequence) => onChange({ interruptionConsequence })}
        />
        <Collapsible title="Advanced: cost of production disruption" subtitle="Optional — replaces the default assumption used for expected disruption cost">
          <NumberField
            label="Estimated financial cost of one day of production disruption"
            value={purchase.dailyDisruptionCost}
            onChange={(dailyDisruptionCost) => onChange({ dailyDisruptionCost })}
            rule={RULES.cost}
            prefix="$"
            tooltip="Lost contribution margin, idle labor, expediting and penalty costs for one day of stoppage."
            hint={`Leave as Unknown to use a default based on purchase value and the severity above.${
              purchase.dailyDisruptionCost ? ` Currently ${money(purchase.dailyDisruptionCost, purchase.baseCurrency)} per day.` : ''
            }`}
            className="max-w-md"
          />
        </Collapsible>
      </div>
    </Card>
  </div>
);
