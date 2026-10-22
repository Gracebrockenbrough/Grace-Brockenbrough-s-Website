"use client";

import { BackBar, Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, Row, Rows, SectionTitle } from "@/components/ui/card";
import { Notice, Tag } from "@/components/ui/notice";
import { PROJECTION_PRICING, modelClients } from "@/lib/ingestion/ai";
import { MERCHANTS } from "@/lib/ingestion/merchants";
import { BUDGET, pipelineMetrics, projectedAiCost, spentThisMonth } from "@/lib/ingestion/pipeline";
import { TEMPLATES } from "@/lib/ingestion/templates";
import { actions, useOrbit } from "@/lib/store/store";

const usd = (n: number) => (n === 0 ? "$0.00" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-[18px] bg-card p-3.5 shadow-[var(--shadow-card)]">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className="tabular text-[22px] font-semibold tracking-[-0.02em]">{value}</p>
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

/** Developer dashboard: processing volume, error rates, AI use and cost against budget. */
export default function DevPage() {
  const o = useOrbit();
  if (!o) return <Shell loading nav={false} />;
  const { jobs, aiUsage, connections } = o.data;
  const m = pipelineMetrics(jobs, aiUsage, 1);
  const spent = spentThisMonth(aiUsage, new Date().toISOString());
  const budget = BUDGET.monthlyUsdPerUser;
  const pct = Math.min(100, (spent / budget) * 100);
  const configured = Object.keys(modelClients).length > 0;
  const tiers = [0, 1, 2, 3].map((t) => ({ t, n: jobs.filter((j) => j.tier === t && j.status !== "duplicate" && !j.status.startsWith("skipped")).length }));
  const dead = jobs.filter((j) => j.status === "dead_letter" || j.status === "failed");

  return (
    <Shell nav={false}>
      <BackBar fallback="/settings/" title="Processing dashboard" />

      <div className="grid grid-cols-2 gap-2.5">
        <Stat label="Messages processed" value={String(m.processed)} hint={`${m.total} including duplicates`} />
        <Stat label="Parsed without AI" value={`${m.pctWithoutAi}%`} hint="Target 80–95% for supported stores" />
        <Stat label="AI calls per 100" value={String(m.aiCallsPer100)} />
        <Stat label="Orders recognized" value={String(m.recognizedOrders)} />
        <Stat label="Duplicate rate" value={`${m.duplicateRate}%`} hint="Re-syncs and re-forwards" />
        <Stat label="Failure rate" value={`${m.failureRate}%`} />
        <Stat label="Needs review" value={String(m.needsReview)} hint="Tier 3, never dropped" />
        <Stat label="Correction rate" value={`${m.correctionRate}%`} hint="Reviewed items you corrected" />
      </div>

      <section className="mt-6">
        <SectionTitle>AI cost this month</SectionTitle>
        <Card className="p-4">
          <div className="flex items-baseline justify-between">
            <p className="tabular text-[26px] font-semibold">{usd(spent)}</p>
            <p className="text-[14px] text-muted">of {usd(budget)} per active customer</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ivory-deep" role="meter" aria-valuemin={0} aria-valuemax={budget} aria-valuenow={spent} aria-label="AI budget used">
            <div className={`h-full rounded-full ${pct >= 100 ? "bg-terracotta" : pct > 75 ? "bg-sand-ink" : "bg-sage-ink"}`} style={{ width: `${pct}%` }} />
          </div>
          <Rows className="mt-3">
            <Row label="Cost per message">{usd(m.costPerMessage)}</Row>
            <Row label="Cost per recognized order">{usd(m.costPerOrder)}</Row>
            <Row label="Cost per active customer">{usd(m.costPerUser)}</Row>
            <Row label="If review items had used AI" hint={`Placeholder Tier 1 price: $${PROJECTION_PRICING[1].inputPerMTok}/M input tokens`}>
              ~{usd(projectedAiCost(jobs))}
            </Row>
          </Rows>
          {spent > budget && (
            <Notice tone="warning" className="mt-3" title="Over budget">
              New escalations go to customer review instead of AI. No message is dropped.
            </Notice>
          )}
        </Card>
      </section>

      <section className="mt-6">
        <SectionTitle>Extraction tiers</SectionTitle>
        <Card className="px-4">
          <Rows>
            <Row label="Tier 0 · Rules and templates" hint="Free">{tiers[0].n}</Row>
            <Row label="Tier 1 · Small model" hint={configured ? "Configured" : "Not configured"}>{tiers[1].n}</Row>
            <Row label="Tier 2 · Larger model" hint="Ambiguous or conflicting only">{tiers[2].n}</Row>
            <Row label="Tier 3 · Customer review" hint="High-impact and still uncertain">{tiers[3].n}</Row>
          </Rows>
        </Card>
        {!configured && (
          <Notice tone="demo" className="mt-3">
            No AI provider is configured in this preview, so nothing is sent to a model. Gaps go straight to customer review.
          </Notice>
        )}
      </section>

      <section className="mt-6">
        <SectionTitle>Coverage</SectionTitle>
        <Card className="px-4">
          <Rows>
            <Row label="Merchant domains">{MERCHANTS.reduce((s, x) => s + x.domains.length, 0)}</Row>
            <Row label="Merchants with a Tier 0 template">
              {Object.keys(TEMPLATES).length} of {MERCHANTS.length}
            </Row>
            <Row label="Promotions skipped">{m.skippedPromotions}</Row>
            <Row label="Non-shopping mail skipped">{m.skippedIrrelevant}</Row>
            <Row label="Connections">{connections.map((c) => `${c.label} (${c.status})`).join(", ") || "None"}</Row>
          </Rows>
        </Card>
      </section>

      <section className="mt-6">
        <SectionTitle>Failed and dead-letter</SectionTitle>
        <Card className="px-4 py-2">
          {dead.length === 0 ? (
            <p className="py-2 text-[15px] text-muted">Nothing failed.</p>
          ) : (
            dead.map((j) => (
              <p key={j.id} className="flex items-center justify-between gap-2 py-2 text-[14px]">
                <span className="truncate">{j.subject}</span>
                <Tag tone={j.status === "dead_letter" ? "urgent" : "warning"}>{j.status === "dead_letter" ? `Gave up after ${j.attempts}` : `Attempt ${j.attempts}`}</Tag>
              </p>
            ))
          )}
        </Card>
      </section>

      <div className="mt-6 space-y-2">
        {connections
          .filter((c) => c.status === "connected")
          .map((c) => (
            <Button key={c.id} variant="secondary" size="md" className="w-full" onClick={() => actions.syncConnection(c.id)}>
              Sync {c.label}
            </Button>
          ))}
      </div>
    </Shell>
  );
}
