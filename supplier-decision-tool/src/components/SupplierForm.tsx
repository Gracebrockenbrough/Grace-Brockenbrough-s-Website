import { useState } from 'react';
import {
  CANCELLATION,
  CURRENCIES,
  DATA_SOURCES,
  LEVELS,
  RELATIONSHIPS,
  REPLACEMENT_POLICIES,
  RETURN_SHIPPING,
} from '../data/options';
import type { AppActions } from '../state/useAppState';
import { MAX_SUPPLIERS } from '../state/useAppState';
import type { Level, Purchase, Supplier } from '../types';
import { quoteAgeDays } from '../utils/confidence';
import { days as fmtDays, netTerms, singularUnit, unitMoney } from '../utils/format';
import { RULES } from '../utils/validation';
import { NumberField, Segmented, SelectField, TextAreaField, TextField, TriStateField } from './ui/fields';
import { Badge, Button, Callout, cx, FictionalBadge, Icon, Tabs } from './ui/primitives';

type SectionId = 'info' | 'price' | 'logistics' | 'terms' | 'delivery' | 'quality' | 'protection' | 'risk' | 'notes';

const SECTIONS: { value: SectionId; label: string }[] = [
  { value: 'info', label: 'Supplier' },
  { value: 'price', label: 'Price' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'terms', label: 'Terms' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'quality', label: 'Quality' },
  { value: 'protection', label: 'Returns & protection' },
  { value: 'risk', label: 'Supply risk' },
  { value: 'notes', label: 'Notes' },
];

/** Inputs that most affect the analysis — used for the completeness meter. */
export const completeness = (s: Supplier): { filled: number; total: number; missing: string[] } => {
  const checks: [string, boolean][] = [
    ['Supplier name', !!s.info.name.trim()],
    ['Unit price', s.quote.unitPrice != null],
    ['Quote date', !!s.info.quoteDate],
    ['Freight / shipping', s.quote.freight != null],
    ['Payment terms', s.quote.paymentTermsDays != null],
    ['Lead time', s.delivery.leadTimeDays != null],
    ['On-time delivery %', s.delivery.onTimePct != null],
    ['Quality rating', s.quality.qualityRating != null],
    ['Defect rate', s.quality.estimatedDefectPct != null || s.quality.historicalDefectPct != null],
    ['Inspection / testing cost', s.quality.inspectionCost != null || s.quality.testingCost != null],
    ['Financial strength', s.info.financialStrength != null],
    ['Replacement policy', s.protection.replacementPolicy !== 'unknown'],
    ['Price lock', s.quote.priceLockMonths != null],
    ['Single-source risk', s.risk.singleSource !== 'unknown'],
  ];
  const missing = checks.filter(([, ok]) => !ok).map(([l]) => l);
  return { filled: checks.length - missing.length, total: checks.length, missing };
};

const Grid = ({ children }: { children: React.ReactNode }) => <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;

const levelOptions = LEVELS as { value: Level | 'unknown'; label: string }[];

const SupplierSections = ({ s, purchase, actions, section }: { s: Supplier; purchase: Purchase; actions: AppActions; section: SectionId }) => {
  const up = <K extends 'info' | 'quote' | 'delivery' | 'quality' | 'protection' | 'risk'>(k: K) => (patch: Partial<Supplier[K]>) =>
    actions.updateSupplier(s.id, k, patch);
  const info = up('info');
  const quote = up('quote');
  const delivery = up('delivery');
  const quality = up('quality');
  const protection = up('protection');
  const risk = up('risk');
  const cur = s.quote.currency;
  const sym = cur === 'USD' || cur === 'CAD' || cur === 'AUD' || cur === 'MXN' ? '$' : cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : undefined;
  const baseSym = purchase.baseCurrency === 'USD' ? '$' : undefined;
  const unit = singularUnit(purchase.unit);
  const age = quoteAgeDays(s.info.quoteDate);

  switch (section) {
    case 'info':
      return (
        <Grid>
          <TextField label="Supplier name" required value={s.info.name} onChange={(name) => info({ name })} placeholder="e.g. Apex Metals" />
          <TextField
            label="Quote date"
            type="date"
            value={s.info.quoteDate}
            onChange={(quoteDate) => info({ quoteDate })}
            hint={age != null ? (age > 60 ? `Quote is ${age} days old — confirm it is still valid.` : `${age} days old`) : 'Older quotes lower confidence.'}
          />
          <TextField label="Quote reference" value={s.info.quoteReference} onChange={(quoteReference) => info({ quoteReference })} placeholder="e.g. Q-2024-118" />
          <TextField label="Supplier location" value={s.info.location} onChange={(location) => info({ location })} placeholder="City, region" />
          <TextField label="Country" value={s.info.country} onChange={(country) => info({ country })} />
          <NumberField label="Years in business" value={s.info.yearsInBusiness} onChange={(yearsInBusiness) => info({ yearsInBusiness })} rule={RULES.years} suffix="yrs" />
          <NumberField
            label="Supplier quality rating"
            value={s.info.supplierQualityRating}
            onChange={(supplierQualityRating) => info({ supplierQualityRating })}
            rule={RULES.rating}
            suffix="/ 10"
            tooltip="Your overall rating of the supplier's quality system (audits, scorecards). Material-level quality is entered on the Quality tab."
          />
          <NumberField
            label="Financial strength rating"
            value={s.info.financialStrength}
            onChange={(financialStrength) => info({ financialStrength })}
            rule={RULES.rating}
            suffix="/ 10"
            tooltip="From credit reports, financial statements or a risk service. 10 = very strong. Unknown lowers confidence."
          />
          <SelectField label="Existing relationship" value={s.info.relationship} onChange={(relationship) => info({ relationship })} options={RELATIONSHIPS} />
          <NumberField
            label="Onboarding / qualification cost"
            value={s.info.onboardingCost}
            onChange={(onboardingCost) => info({ onboardingCost })}
            rule={RULES.cost}
            prefix={baseSym}
            tooltip="One-time cost to qualify a new supplier (audits, first-article testing, system setup). Counted in Contract / Administrative cost."
          />
        </Grid>
      );
    case 'price':
      return (
        <div className="space-y-4">
          <Grid>
            <NumberField
              label={`Unit price (per ${unit})`}
              required
              allowUnknown={false}
              value={s.quote.unitPrice}
              onChange={(unitPrice) => quote({ unitPrice })}
              rule={RULES.price}
              prefix={sym}
            />
            <NumberField
              label="Quoted quantity"
              value={s.quote.quotedQuantity}
              onChange={(quotedQuantity) => quote({ quotedQuantity })}
              rule={RULES.quantity}
              suffix={purchase.unit}
              hint={
                s.quote.quotedQuantity != null && purchase.quantity != null && s.quote.quotedQuantity !== purchase.quantity
                  ? `Differs from your required ${purchase.quantity.toLocaleString('en-US')} — per-quote costs will be scaled.`
                  : 'Leave Unknown if it matches your required volume.'
              }
            />
            <NumberField
              label="Volume discount"
              value={s.quote.volumeDiscountPct}
              onChange={(volumeDiscountPct) => quote({ volumeDiscountPct })}
              rule={RULES.percent}
              suffix="%"
              hint="Discount off the unit price at your volume."
            />
            <SelectField
              label="Currency"
              value={s.quote.currency}
              onChange={(currency) => quote({ currency })}
              options={CURRENCIES.map((c) => ({ value: c, label: c }))}
            />
            {s.quote.currency !== purchase.baseCurrency && (
              <NumberField
                label={`Exchange rate (1 ${s.quote.currency} = ? ${purchase.baseCurrency})`}
                value={s.quote.fxRate}
                onChange={(fxRate) => quote({ fxRate })}
                rule={RULES.fx}
                hint="Needed to compare quotes in different currencies. Unknown assumes 1:1 and lowers confidence."
              />
            )}
          </Grid>
          <p className="text-xs text-muted">Price, logistics and fee fields are in the quote currency. Inspection, testing and onboarding costs are your own costs in {purchase.baseCurrency}.</p>
        </div>
      );
    case 'logistics':
      return (
        <div className="space-y-4">
          <Grid>
            <NumberField label="Freight / shipping" value={s.quote.freight} onChange={(freight) => quote({ freight })} rule={RULES.cost} prefix={sym} hint="Total for the quoted quantity. Enter 0 if included." />
            <NumberField label="Insurance" value={s.quote.insurance} onChange={(insurance) => quote({ insurance })} rule={RULES.cost} prefix={sym} hint="Enter 0 if included in price." />
            <NumberField label="Customs / duties" value={s.quote.duties} onChange={(duties) => quote({ duties })} rule={RULES.cost} prefix={sym} />
            <NumberField label="Handling" value={s.quote.handling} onChange={(handling) => quote({ handling })} rule={RULES.cost} prefix={sym} />
            <NumberField label="Warehousing" value={s.quote.warehousing} onChange={(warehousing) => quote({ warehousing })} rule={RULES.cost} prefix={sym} />
            <NumberField label="Additional logistics fees" value={s.quote.otherLogistics} onChange={(otherLogistics) => quote({ otherLogistics })} rule={RULES.cost} prefix={sym} />
          </Grid>
          <div>
            <div className="label">Are these logistics costs firm or estimated?</div>
            <Segmented
              ariaLabel="Logistics cost basis"
              value={s.quote.logisticsCostBasis}
              onChange={(logisticsCostBasis) => quote({ logisticsCostBasis })}
              options={[
                { value: 'firm', label: 'Firm quote' },
                { value: 'estimate', label: 'Estimate' },
              ]}
              size="sm"
            />
          </div>
        </div>
      );
    case 'terms':
      return (
        <Grid>
          <NumberField label="Minimum order quantity" value={s.quote.moq} onChange={(moq) => quote({ moq })} rule={RULES.cost} suffix={purchase.unit} />
          <NumberField
            label="Payment terms"
            value={s.quote.paymentTermsDays}
            onChange={(paymentTermsDays) => quote({ paymentTermsDays })}
            rule={RULES.paymentDays}
            suffix="days"
            hint={s.quote.paymentTermsDays != null ? netTerms(s.quote.paymentTermsDays) : 'e.g. 45 for Net 45'}
          />
          <NumberField label="Deposit required" value={s.quote.depositPct} onChange={(depositPct) => quote({ depositPct })} rule={RULES.percent} suffix="%" />
          <NumberField label="Price lock duration" value={s.quote.priceLockMonths} onChange={(priceLockMonths) => quote({ priceLockMonths })} rule={RULES.months} suffix="months" />
          <NumberField label="Contract length" value={s.quote.contractLengthMonths} onChange={(contractLengthMonths) => quote({ contractLengthMonths })} rule={RULES.months} suffix="months" />
          <SelectField label="Cancellation flexibility" value={s.quote.cancellation} onChange={(cancellation) => quote({ cancellation })} options={CANCELLATION} />
          {s.quote.cancellation === 'fee' && (
            <NumberField
              label="Cancellation fee"
              value={s.quote.cancellationFeePct}
              onChange={(cancellationFeePct) => quote({ cancellationFeePct })}
              rule={RULES.percent}
              suffix="% of order"
            />
          )}
          <NumberField
            label="Contract / administrative fees"
            value={s.quote.adminFees}
            onChange={(adminFees) => quote({ adminFees })}
            rule={RULES.cost}
            prefix={sym}
            tooltip="Account setup, contract, documentation or other supplier-charged fees."
          />
        </Grid>
      );
    case 'delivery':
      return (
        <Grid>
          <NumberField label="Lead time" value={s.delivery.leadTimeDays} onChange={(leadTimeDays) => delivery({ leadTimeDays })} rule={RULES.days} suffix="days" />
          <NumberField
            label="Historical on-time delivery"
            value={s.delivery.onTimePct}
            onChange={(onTimePct) => delivery({ onTimePct })}
            rule={RULES.onTime}
            suffix="%"
            tooltip="Share of shipments delivered on or before the promised date. Unknown is treated as 90% and lowers confidence."
          />
          <NumberField
            label="Lead-time variability"
            value={s.delivery.leadTimeVariabilityDays}
            onChange={(leadTimeVariabilityDays) => delivery({ leadTimeVariabilityDays })}
            rule={RULES.days}
            suffix="± days"
            tooltip="Typical deviation from the quoted lead time."
          />
          <TriStateField label="Expedited shipping available" value={s.delivery.expeditedAvailable} onChange={(expeditedAvailable) => delivery({ expeditedAvailable })} />
          <SelectField
            label="Capacity to handle increased demand"
            value={s.delivery.surgeCapacity}
            onChange={(surgeCapacity) => delivery({ surgeCapacity })}
            options={levelOptions}
          />
        </Grid>
      );
    case 'quality':
      return (
        <div className="space-y-4">
          <Grid>
            <NumberField label="Material quality rating" value={s.quality.qualityRating} onChange={(qualityRating) => quality({ qualityRating })} rule={RULES.rating} suffix="/ 10" />
            <NumberField
              label="Estimated defect rate"
              value={s.quality.estimatedDefectPct}
              onChange={(estimatedDefectPct) => quality({ estimatedDefectPct })}
              rule={RULES.defect}
              suffix="%"
              tooltip="Supplier's stated or expected defect rate, as a percent (0.65 = 0.65%)."
            />
            <NumberField
              label="Historical defect rate"
              value={s.quality.historicalDefectPct}
              onChange={(historicalDefectPct) => quality({ historicalDefectPct })}
              rule={RULES.defect}
              suffix="%"
              tooltip="Measured on your own receipts or a verified source. When both are entered, the higher of the two is used."
            />
            <SelectField label="Source of quality data" value={s.quality.qualityDataSource} onChange={(qualityDataSource) => quality({ qualityDataSource })} options={DATA_SOURCES} />
            <NumberField label="Batch consistency rating" value={s.quality.batchConsistency} onChange={(batchConsistency) => quality({ batchConsistency })} rule={RULES.rating} suffix="/ 10" />
            <NumberField
              label="Past quality incidents"
              value={s.quality.pastQualityIncidents}
              onChange={(pastQualityIncidents) => quality({ pastQualityIncidents })}
              rule={RULES.count}
              hint="Significant incidents in the last 3 years."
            />
            <TextField
              label="Certifications"
              value={s.quality.certifications}
              onChange={(certifications) => quality({ certifications })}
              placeholder="e.g. ISO 9001, IATF 16949"
              hint="Separate with commas."
              className="sm:col-span-2 lg:col-span-3"
            />
          </Grid>
          <div className="rounded-lg border border-line bg-subtle/50 p-4">
            <div className="mb-3 text-sm font-semibold text-navy">Quality-control costs (your costs)</div>
            <Grid>
              <TriStateField label="Incoming inspection required" value={s.quality.inspectionRequired} onChange={(inspectionRequired) => quality({ inspectionRequired })} />
              <NumberField label="Inspection cost" value={s.quality.inspectionCost} onChange={(inspectionCost) => quality({ inspectionCost })} rule={RULES.cost} prefix={baseSym} />
              <NumberField label="Testing cost" value={s.quality.testingCost} onChange={(testingCost) => quality({ testingCost })} rule={RULES.cost} prefix={baseSym} />
              <NumberField
                label="Certification review / other QC"
                value={s.quality.certificationReviewCost}
                onChange={(certificationReviewCost) => quality({ certificationReviewCost })}
                rule={RULES.cost}
                prefix={baseSym}
              />
            </Grid>
          </div>
        </div>
      );
    case 'protection':
      return (
        <Grid>
          <NumberField label="Return window" value={s.protection.returnWindowDays} onChange={(returnWindowDays) => protection({ returnWindowDays })} rule={RULES.days} suffix="days" />
          <SelectField label="Who pays return shipping" value={s.protection.returnShipping} onChange={(returnShipping) => protection({ returnShipping })} options={RETURN_SHIPPING} />
          <SelectField label="Replacement policy" value={s.protection.replacementPolicy} onChange={(replacementPolicy) => protection({ replacementPolicy })} options={REPLACEMENT_POLICIES} />
          <NumberField label="Warranty" value={s.protection.warrantyMonths} onChange={(warrantyMonths) => protection({ warrantyMonths })} rule={RULES.months} suffix="months" />
          <TriStateField label="Product liability protection" value={s.protection.productLiability} onChange={(productLiability) => protection({ productLiability })} />
          <TriStateField label="Insurance coverage" value={s.protection.insuranceCoverage} onChange={(insuranceCoverage) => protection({ insuranceCoverage })} />
          <TriStateField
            label="Defective material compensation"
            value={s.protection.defectCompensation}
            onChange={(defectCompensation) => protection({ defectCompensation })}
            tooltip="Compensation beyond replacement — e.g. for handling, sorting or rework costs."
          />
          <TriStateField label="Late delivery penalties or credits" value={s.protection.lateDeliveryCredits} onChange={(lateDeliveryCredits) => protection({ lateDeliveryCredits })} />
        </Grid>
      );
    case 'risk':
      return (
        <Grid>
          <TriStateField label="Single-source manufacturing" value={s.risk.singleSource} onChange={(singleSource) => risk({ singleSource })} tooltip="Material is produced at only one site or from one upstream source." />
          <TriStateField label="Multiple production facilities" value={s.risk.multipleFacilities} onChange={(multipleFacilities) => risk({ multipleFacilities })} />
          <TriStateField label="Backup production available" value={s.risk.backupProduction} onChange={(backupProduction) => risk({ backupProduction })} />
          <SelectField label="Geographic risk" value={s.risk.geographicRisk} onChange={(geographicRisk) => risk({ geographicRisk })} options={levelOptions} hint="Weather, political, port or border exposure." />
          <SelectField
            label="Supply chain concentration"
            value={s.risk.supplyChainConcentration}
            onChange={(supplyChainConcentration) => risk({ supplyChainConcentration })}
            options={levelOptions}
          />
          <SelectField
            label="Raw material availability risk"
            value={s.risk.rawMaterialAvailabilityRisk}
            onChange={(rawMaterialAvailabilityRisk) => risk({ rawMaterialAvailabilityRisk })}
            options={levelOptions}
          />
        </Grid>
      );
    case 'notes':
      return (
        <TextAreaField
          label="Notes"
          rows={5}
          value={s.notes}
          onChange={(notes) => actions.setNotes(s.id, notes)}
          placeholder="Anything else relevant: sample results, reference checks, special conditions…"
        />
      );
  }
};

export const SupplierCard = ({
  s,
  index,
  purchase,
  actions,
  canRemove,
  canAdd,
  showErrors,
  defaultOpen,
}: {
  s: Supplier;
  index: number;
  purchase: Purchase;
  actions: AppActions;
  canRemove: boolean;
  canAdd: boolean;
  showErrors: boolean;
  defaultOpen: boolean;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const [section, setSection] = useState<SectionId>('info');
  const comp = completeness(s);
  const pctDone = Math.round((comp.filled / comp.total) * 100);
  const name = s.info.name.trim() || `Supplier ${index + 1}`;
  const incomplete = showErrors && (!s.info.name.trim() || s.quote.unitPrice == null);
  return (
    <div className={cx('card', incomplete && 'border-risk/40')}>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4">
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-subtle text-sm font-semibold text-navy">{index + 1}</span>
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className={cx('truncate text-sm font-semibold', s.info.name.trim() ? 'text-navy' : 'text-muted')}>{name}</span>
              {s.info.isFictional && <FictionalBadge />}
            </span>
            <span className="tabular mt-0.5 block text-xs text-muted">
              {s.quote.unitPrice != null ? `${unitMoney(s.quote.unitPrice, s.quote.currency)}/${singularUnit(purchase.unit)}` : 'No price yet'}
              {' · '}
              {s.delivery.leadTimeDays != null ? `${fmtDays(s.delivery.leadTimeDays)} lead time` : 'lead time unknown'}
              {' · '}
              {netTerms(s.quote.paymentTermsDays)}
            </span>
          </span>
        </button>
        <div className="flex items-center gap-3">
          <div className="hidden w-32 sm:block" title={comp.missing.length ? `Missing: ${comp.missing.join(', ')}` : 'All key fields entered'}>
            <div className="mb-1 flex justify-between text-[11px] text-muted">
              <span>Key data</span>
              <span className="tabular">{pctDone}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-subtle">
              <div className={cx('h-full rounded-full', pctDone >= 80 ? 'bg-good' : pctDone >= 50 ? 'bg-[#c98a00]' : 'bg-risk')} style={{ width: `${pctDone}%` }} />
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={() => actions.duplicateSupplier(s.id)} disabled={!canAdd} title="Duplicate supplier">
            Duplicate
          </Button>
          <Button size="sm" variant="danger" onClick={() => actions.removeSupplier(s.id)} disabled={!canRemove} title={canRemove ? 'Remove supplier' : 'At least 2 suppliers are required'}>
            Remove
          </Button>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Collapse' : 'Expand'}
            className="rounded p-1 text-muted hover:bg-subtle"
          >
            <svg className={cx('h-4 w-4 transition-transform', open && 'rotate-180')} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
      {incomplete && (
        <p className="px-5 pb-3 text-xs text-risk">Add at least a supplier name and unit price so this quote can be compared.</p>
      )}
      {open && (
        <div className="border-t border-line px-5 py-4">
          <Tabs tabs={SECTIONS} value={section} onChange={setSection} size="sm" className="mb-4" />
          <SupplierSections s={s} purchase={purchase} actions={actions} section={section} />
          {comp.missing.length > 0 && (
            <p className="mt-4 text-xs text-muted">
              <span className="font-medium text-ink-2">Not yet provided:</span> {comp.missing.join(', ')}. Unknown values are allowed — they lower
              confidence rather than excluding the supplier.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export const SupplierForm = ({
  suppliers,
  purchase,
  actions,
  showErrors,
  isDemo,
}: {
  suppliers: Supplier[];
  purchase: Purchase;
  actions: AppActions;
  showErrors: boolean;
  isDemo: boolean;
}) => (
  <div className="space-y-3">
    {isDemo && (
      <Callout tone="caution" title="Demo data">
        These suppliers and figures are fictional and are included only to demonstrate how the tool works.
      </Callout>
    )}
    <div className="flex flex-wrap items-center justify-between gap-2">
      <p className="text-sm text-muted">
        {suppliers.length} of {MAX_SUPPLIERS} suppliers · open a card to enter its quote. Mark anything you don’t know as <Badge>Unknown</Badge>.
      </p>
    </div>
    {suppliers.map((s, i) => (
      <SupplierCard
        key={s.id}
        s={s}
        index={i}
        purchase={purchase}
        actions={actions}
        canRemove={suppliers.length > 2}
        canAdd={suppliers.length < MAX_SUPPLIERS}
        showErrors={showErrors}
        defaultOpen={!isDemo && i === 0 && !s.info.name}
      />
    ))}
    <button
      type="button"
      onClick={actions.addSupplier}
      disabled={suppliers.length >= MAX_SUPPLIERS}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-white/60 py-4 text-sm font-medium text-ink-2 hover:border-navy hover:text-navy disabled:cursor-not-allowed disabled:opacity-50"
    >
      {Icon.plus()} Add supplier {suppliers.length >= MAX_SUPPLIERS && '(maximum reached)'}
    </button>
  </div>
);
