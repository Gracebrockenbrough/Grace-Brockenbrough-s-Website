import { modeById } from '../data/modes';
import type { Evaluation, Purchase, Recommendation, SplitSuggestion, Supplier } from '../types';
import { compactMoney, money, signedMoney } from '../utils/format';
import { ConfidenceBadge, ConfidenceIndicator, ConfidenceReasons } from './ConfidenceIndicator';
import { Badge, Callout, Card, Collapsible, cx, FictionalBadge, Icon, Stat } from './ui/primitives';

const Section = ({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) => (
  <section className={cx('px-6 py-5', className)}>
    <h4 className="eyebrow mb-2">{title}</h4>
    {children}
  </section>
);

export const RecommendationCard = ({
  rec,
  evaluation,
  purchase,
  suppliers,
  isDemo,
}: {
  rec: Recommendation;
  evaluation: Evaluation;
  purchase: Purchase;
  suppliers: Supplier[];
  isDemo: boolean;
}) => {
  const cur = purchase.baseCurrency;
  const top = rec.recommended;
  const topSupplier = suppliers.find((s) => s.id === top.supplierId);
  const f = rec.financial;
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const category = purchase.category === 'Other' ? purchase.customCategory || 'Other' : purchase.category;
  return (
    <Card as="article" className="overflow-hidden">
      {/* Memo header */}
      <div className="border-b border-line bg-subtle/60 px-6 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="eyebrow">Procurement decision memo</div>
          <div className="text-xs text-muted">{today}</div>
        </div>
        <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted">Purchase</dt>
          <dd className="font-medium text-ink">{purchase.name || 'Untitled purchase'}</dd>
          <dt className="text-muted">Category / volume</dt>
          <dd className="text-ink">
            {category} · {evaluation.evaluatedQuantity.toLocaleString('en-US')} {purchase.unit}
          </dd>
          <dt className="text-muted">Decision strategy</dt>
          <dd className="text-ink">{modeById(evaluation.mode).label}</dd>
          <dt className="text-muted">Suppliers evaluated</dt>
          <dd className="text-ink">{evaluation.results.map((r) => r.name).join(', ')}</dd>
        </dl>
        {isDemo && <p className="mt-2 text-xs text-caution">These suppliers and figures are fictional and are included only to demonstrate how the tool works.</p>}
      </div>

      {/* Recommended supplier */}
      <div className="grid gap-5 border-b border-line px-6 py-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="eyebrow">Recommended supplier</div>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h3 className="text-2xl font-bold text-navy">{top.name}</h3>
            {topSupplier?.info.isFictional && <FictionalBadge />}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <ConfidenceBadge confidence={rec.confidence} />
            <Badge tone="accent">Deal score {top.overall.toFixed(0)}/100</Badge>
            <Badge tone={top.riskLevel === 'Low' ? 'good' : top.riskLevel === 'High' ? 'risk' : 'caution'}>{top.riskLevel} risk</Badge>
          </div>
          <p className="mt-4 text-[15px] leading-relaxed text-ink">{rec.whyThisSupplier}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 self-start rounded-xl border border-line bg-white p-4">
          <Stat label="Direct cost" value={compactMoney(f.directCost, cur)} sub={money(f.directCost, cur)} />
          <Stat label="Risk-adjusted cost" value={compactMoney(f.riskAdjustedCost, cur)} sub={money(f.riskAdjustedCost, cur)} emphasis />
          {f.nextBestName && f.directDiffVsNext != null && (
            <Stat label={`Direct vs ${f.nextBestName}`} value={signedMoney(f.directDiffVsNext, cur)} sub={f.directDiffVsNext > 0 ? 'more upfront' : 'less upfront'} />
          )}
          {f.nextBestName && f.riskAdjustedDiffVsNext != null && (
            <Stat
              label={`Risk-adjusted vs ${f.nextBestName}`}
              value={<span className={f.riskAdjustedDiffVsNext <= 0 ? 'text-good' : 'text-risk'}>{signedMoney(f.riskAdjustedDiffVsNext, cur)}</span>}
              sub={f.riskAdjustedDiffVsNext <= 0 ? 'lower total cost of risk' : 'higher, justified by non-cost factors'}
            />
          )}
        </div>
      </div>

      <Section title="Financial reason" className="border-b border-line">
        <p className="leading-relaxed text-ink">{f.summary}</p>
      </Section>

      <div className="grid border-b border-line md:grid-cols-2 md:divide-x md:divide-line">
        <Section title="Main benefits">
          <ul className="space-y-2">
            {rec.benefits.map((b) => (
              <li key={b} className="flex gap-2 text-sm text-ink">
                <span className="mt-0.5 shrink-0 text-good">{Icon.check()}</span>
                {b}
              </li>
            ))}
          </ul>
        </Section>
        <Section title="Main risks" className="border-t border-line md:border-t-0">
          <ul className="space-y-2">
            {rec.risks.map((r) => (
              <li key={r} className="flex gap-2 text-sm text-ink">
                <span className="mt-0.5 shrink-0 text-caution">{Icon.warn()}</span>
                {r}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      <Section title="Recommendation confidence" className="border-b border-line">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <ConfidenceIndicator confidence={rec.confidence} />
          <span className="text-sm text-muted">Based on data completeness, verification, quote age and how decisively {top.name} leads.</span>
        </div>
        <ConfidenceReasons confidence={rec.confidence} limit={5} />
        {evaluation.results.length > 1 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="py-1.5 pr-3 font-medium">Supplier</th>
                  <th className="py-1.5 pr-3 font-medium">Score</th>
                  <th className="py-1.5 pr-3 font-medium">Confidence</th>
                  <th className="py-1.5 font-medium">Main reason</th>
                </tr>
              </thead>
              <tbody>
                {evaluation.results.map((r) => (
                  <tr key={r.supplierId} className="border-b border-line last:border-0">
                    <td className="py-2 pr-3 font-medium text-navy">{r.name}</td>
                    <td className="tabular py-2 pr-3">{r.overall.toFixed(0)}/100</td>
                    <td className="py-2 pr-3">
                      <ConfidenceIndicator confidence={r.confidence} compact />
                    </td>
                    <td className="py-2 text-xs text-ink-2">{r.confidence.items[0]?.reason ?? 'Complete, recent and verified data.'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-2 text-xs text-muted">
              Confidence reflects the quality of each supplier’s data, not how good the supplier is. A high score with low confidence means “promising but unverified”.
            </p>
          </div>
        )}
      </Section>

      {rec.nextBest && rec.nextBestAnalysis && (
        <Section title="Next best alternative">
          <div className="rounded-xl border border-line bg-subtle/50 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-semibold text-navy">{rec.nextBest.name}</h4>
              <Badge>Deal score {rec.nextBest.overall.toFixed(0)}/100</Badge>
              <ConfidenceIndicator confidence={rec.nextBest.confidence} compact />
            </div>
            <dl className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-ink-2">Why it ranked second</dt>
                <dd className="mt-0.5 text-sm text-ink">{rec.nextBestAnalysis.whySecond}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-ink-2">When to choose it instead</dt>
                <dd className="mt-0.5 text-sm text-ink">{rec.nextBestAnalysis.whenToChoose}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-good">Biggest strength</dt>
                <dd className="mt-0.5 text-sm text-ink">{rec.nextBestAnalysis.biggestStrength}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-risk">Biggest weakness</dt>
                <dd className="mt-0.5 text-sm text-ink">{rec.nextBestAnalysis.biggestWeakness}</dd>
              </div>
            </dl>
          </div>
        </Section>
      )}
    </Card>
  );
};

export const SplitPanel = ({ split, currency }: { split: SplitSuggestion | null; currency: string }) => {
  if (!split) return null;
  const share = Math.round(split.primaryShare * 100);
  return (
    <Collapsible
      title="Advanced: Would splitting the order reduce risk?"
      subtitle="Optional analysis of dual-sourcing between the top two suppliers"
      badge={split.show ? <Badge tone="accent">Split worth considering</Badge> : <Badge>Single source preferred</Badge>}
    >
      {split.show ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1">
              <div className="flex h-8 overflow-hidden rounded-md text-xs font-semibold text-white">
                <div className="flex items-center justify-center bg-[#2a78d6]" style={{ width: `${share}%` }}>
                  {share}% {split.primaryName}
                </div>
                <div className="flex items-center justify-center bg-[#eb6834] px-1" style={{ width: `${100 - share}%` }}>
                  {100 - share}%
                </div>
              </div>
              <div className="mt-1 flex justify-between text-xs text-muted">
                <span>{split.primaryName}</span>
                <span>{split.secondaryName}</span>
              </div>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-ink">{split.explanation}</p>
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Single-source cost" value={compactMoney(split.singleSourceCost, currency)} />
            <Stat label="Split cost" value={compactMoney(split.splitCost, currency)} sub={`${split.premium >= 0 ? '+' : '−'}${money(Math.abs(split.premium), currency)}`} />
            <Stat label={`${split.outageDays}-day outage, single`} value={compactMoney(split.worstCaseSingle, currency)} />
            <Stat label={`${split.outageDays}-day outage, split`} value={compactMoney(split.worstCaseSplit, currency)} />
          </div>
          <Callout tone="neutral">
            This is an advanced, optional suggestion. It assumes the secondary supplier can absorb part of the primary’s volume during an outage based on its stated surge
            capacity, and adds a small overhead for managing a second contract.
          </Callout>
        </div>
      ) : (
        <p className="text-sm text-ink-2">{split.reasonNotShown}</p>
      )}
    </Collapsible>
  );
};
