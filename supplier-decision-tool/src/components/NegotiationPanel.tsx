import type { BreakEvenResult, NegotiationItem, Supplier, SupplierScore } from '../types';
import { contractProtectionBreakdown } from '../utils/scoring';
import { money } from '../utils/format';
import { Badge, Card, CardHeader, cx, Icon } from './ui/primitives';

export const NegotiationPanel = ({
  items,
  supplier,
  score,
  currency,
}: {
  items: NegotiationItem[];
  supplier: Supplier;
  score: SupplierScore;
  currency: string;
}) => {
  const total = items.reduce((s, i) => s + (i.estimatedValue ?? 0), 0);
  const weakTerms = contractProtectionBreakdown(supplier)
    .map((c) => ({ ...c, ratio: c.points / c.max }))
    .filter((c) => c.ratio < 0.99)
    .sort((a, b) => a.ratio - b.ratio);
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          eyebrow="Negotiation opportunities"
          title={`What to ask ${score.name} for`}
          subtitle="Specific asks based on this quote’s weakest terms and what competing suppliers offer. Values are estimates at your volume."
          action={
            total > 0 ? (
              <div className="text-right">
                <div className="eyebrow">Quantified value</div>
                <div className="tabular text-xl font-semibold text-good">{money(total, currency)}</div>
              </div>
            ) : undefined
          }
        />
        {items.length === 0 ? (
          <p className="px-5 py-5 text-sm text-muted">{score.name}’s terms already match or beat every competing quote. Focus on locking them in contractually.</p>
        ) : (
          <ol className="divide-y divide-line">
            {items.map((item, i) => (
              <li key={item.id} className="grid gap-3 px-5 py-4 md:grid-cols-[2rem_1fr_16rem]">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-navy">{i + 1}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-navy">{item.term}</span>
                    {item.estimatedValue != null && item.estimatedValue > 0 && <Badge tone="good">≈ {money(item.estimatedValue, currency)}</Badge>}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink">{item.suggestion}</p>
                  <p className="mt-1 text-xs text-muted">{item.rationale}</p>
                  {item.leverage && (
                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-subtle px-2 py-1 text-xs text-ink-2">
                      <span className="font-semibold">Leverage:</span> {item.leverage}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 self-start text-xs md:grid-cols-1">
                  <div className="rounded-md border border-line px-2.5 py-1.5">
                    <div className="text-muted">Current</div>
                    <div className="font-medium text-ink">{item.current}</div>
                  </div>
                  <div className="rounded-md border border-good/30 bg-good-soft px-2.5 py-1.5">
                    <div className="text-good">Ask for</div>
                    <div className="font-medium text-ink">{item.target}</div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {weakTerms.length > 0 && (
        <Card>
          <CardHeader title={`Weakest contract terms in ${score.name}’s quote`} subtitle="Points earned out of the maximum for each component of the Contract Protection score." />
          <ul className="grid gap-x-8 gap-y-2 px-5 py-4 md:grid-cols-2">
            {weakTerms.map((t) => (
              <li key={t.label} className="grid grid-cols-[11rem_1fr_3.5rem] items-center gap-3 text-sm">
                <span className="text-ink-2">{t.label}</span>
                <span className="h-1.5 overflow-hidden rounded-full bg-subtle">
                  <span className={cx('block h-full rounded-full', t.ratio < 0.4 ? 'bg-risk' : 'bg-[#c98a00]')} style={{ width: `${Math.max(3, t.ratio * 100)}%` }} />
                </span>
                <span className="tabular text-right text-xs text-muted">
                  {t.points.toFixed(1)}/{t.max}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
};

export const BreakEvenPanel = ({ results, winnerName, modeLabel }: { results: BreakEvenResult[]; winnerName: string; modeLabel: string }) => (
  <Card>
    <CardHeader
      eyebrow="Break-even negotiation analysis"
      title="What would make this supplier win?"
      subtitle={`For each other supplier: the change that would make it the preferred option over ${winnerName} under ${modeLabel}, holding everything else constant.`}
    />
    <div className="divide-y divide-line">
      {results.map((r) => (
        <div key={r.supplierId} className="px-5 py-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-base font-semibold text-navy">{r.name}</span>
            <Badge>Rank #{r.currentRank}</Badge>
            <Badge tone={r.scoreGap < 5 ? 'caution' : 'neutral'}>{r.scoreGap.toFixed(1)} points behind</Badge>
          </div>
          <p className="text-[15px] leading-relaxed text-ink">{r.summary}</p>
          {r.costParity && <p className="mt-1.5 text-sm text-ink-2">{r.costParity}</p>}
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {r.levers
              .filter((l) => l.label !== 'Combination')
              .map((l) => (
                <li key={l.label} className={cx('flex gap-2 rounded-lg border px-3 py-2 text-sm', l.feasible ? 'border-good/30 bg-good-soft' : 'border-line bg-subtle/40')}>
                  <span className={cx('mt-0.5 shrink-0', l.feasible ? 'text-good' : 'text-muted')}>{l.feasible ? Icon.check() : Icon.minus()}</span>
                  <span>
                    <span className="font-semibold text-ink">{l.label}: </span>
                    <span className="text-ink-2">{l.detail}</span>
                  </span>
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  </Card>
);
