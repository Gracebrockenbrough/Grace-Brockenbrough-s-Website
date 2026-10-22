"use client";

import { ChartNoAxesColumn } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { SpendBuckets } from "@/components/orbit/spend-buckets";
import { Card, Row, Rows } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Field, Input } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/lib/domain/dates";
import { money, plural } from "@/lib/domain/format";
import { useSessionState } from "@/lib/hooks/useSessionState";
import { goalMultiplier, insights, isPartial, previousPeriod, rangeFor, type InsightRange, type RangeKind } from "@/lib/intelligence/insights";
import { buildBuckets } from "@/lib/intelligence/buckets";
import { ItemArt } from "@/components/orbit/item-art";
import { useOrbit } from "@/lib/store/store";

/** Horizontal bars in one hue; the labels carry identity, values are printed. */
function Bars({ title, rows }: { title: string; rows: { key: string; label: string; amount: number }[] }) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <section aria-labelledby={`bars-${title}`} className="mt-6">
      <h2 id={`bars-${title}`} className="mb-2 text-[17px] font-semibold">
        {title}
      </h2>
      <Card className="px-4 py-3">
        <table className="w-full border-collapse">
          <caption className="sr-only">{title}, purchases before tax and shipping</caption>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} title={`${r.label}: ${money(r.amount)}`} className="group">
                <th scope="row" className="w-[34%] py-2 pr-3 text-left align-middle text-[15px] font-medium">
                  {r.label}
                </th>
                <td className="py-2 align-middle">
                  <div className="h-2.5 w-full rounded-full bg-ivory-deep">
                    <div className="h-2.5 rounded-full bg-navy transition-[width] group-hover:bg-navy-soft" style={{ width: `${Math.max(2, (r.amount / max) * 100)}%` }} />
                  </div>
                </td>
                <td className="tabular w-[22%] py-2 pl-3 text-right align-middle text-[15px] font-semibold">{money(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </section>
  );
}

export default function InsightsPage() {
  const o = useOrbit();
  const [kind, setKind] = useSessionState<RangeKind>("insights-range", "year");
  const [custom, setCustom] = useSessionState<InsightRange | null>("insights-custom", null);
  if (!o) return <Shell loading nav={false} />;
  const { today, data } = o;

  const range = kind === "custom" ? custom ?? rangeFor("year", today) : rangeFor(kind, today);
  const r = insights(data, range);
  const sourceTotal = r.coverage.reduce((s, c) => s + c.count, 0);
  const prev = previousPeriod(kind, range);
  const before = insights(data, prev);
  // Compare only when Penny actually has history for the earlier period.
  const hasHistory = before.orderCount > 0 && r.coverageFrom != null && r.coverageFrom <= prev.from;
  const prevByKind = new Map(buildBuckets(before.purchases.map((p) => p.item), null).map((b) => [b.kind, b.amount]));
  const trends = (hasHistory ? buildBuckets(r.purchases.map((p) => p.item), null) : [])
    .map((b) => ({ kind: b.kind, label: b.label, now: b.amount, before: prevByKind.get(b.kind) ?? 0 }))
    .filter((t) => t.before > 0 && Math.abs(t.now - t.before) >= 1)
    .sort((a, b) => Math.abs(b.now - b.before) - Math.abs(a.now - a.before))
    .slice(0, 4);

  return (
    <Shell nav={false}>
      <BackBar fallback="/you/" title="Shopping Insights" />

      <div role="radiogroup" aria-label="Time period" className="mt-4 inline-flex rounded-full bg-ivory-deep p-1">
        {(["month", "quarter", "year", "custom"] as RangeKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => {
              setKind(k);
              if (k === "custom" && !custom) setCustom(rangeFor("month", today));
            }}
            className={cn("h-10 rounded-full px-3 text-[15px] font-semibold transition-colors", kind === k ? "bg-card shadow-[var(--shadow-card)]" : "text-muted hover:text-navy")}
          >
            {k === "month" ? "Month" : k === "quarter" ? "Quarter" : k === "year" ? "Year" : "Custom"}
          </button>
        ))}
      </div>

      {kind === "custom" && custom && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="From" htmlFor="from">
            <Input id="from" type="date" max={custom.to} value={custom.from} onChange={(e) => e.target.value && setCustom({ ...custom, from: e.target.value })} />
          </Field>
          <Field label="To" htmlFor="to">
            <Input id="to" type="date" min={custom.from} max={today} value={custom.to} onChange={(e) => e.target.value && setCustom({ ...custom, to: e.target.value })} />
          </Field>
        </div>
      )}

      {r.orderCount === 0 ? (
        <EmptyState icon={<ChartNoAxesColumn aria-hidden />} title="No purchases recorded in this period">
          Try a longer period, or add purchases from your emails.
        </EmptyState>
      ) : (
        <>
          <section className="mt-6" aria-labelledby="net">
            <p id="net" className="text-[15px] text-muted">
              Net merchandise kept · {formatDate(range.from, today)} to {formatDate(range.to, today)}
              {isPartial(kind, range, today) && <span className="ml-1.5 rounded-full bg-progress-soft px-2 py-0.5 text-[12px] font-semibold text-progress">So far</span>}
            </p>
            <p className="font-display tabular text-[46px] leading-tight">{money(r.net)}</p>
            <p className="text-[14px] text-muted">What you bought, minus what went back for a refund or store credit.</p>
          </section>

          <Card className="mt-5 px-4">
            <Rows>
              <Row label="Purchases" hint={`${plural(r.orderCount, "order")}, item prices before tax and shipping`}>
                {money(r.gross)}
              </Row>
              <Row label="Refunds received" hint="Card refunds you confirmed arrived">
                {r.refundsReceived ? `−${money(r.refundsReceived)}` : money(0)}
              </Row>
              <Row label="Refunds issued, not yet confirmed" hint="The store says it's sent. Check your statement">
                {r.refundsAwaitingConfirmation ? `−${money(r.refundsAwaitingConfirmation)}` : money(0)}
              </Row>
              <Row label="Store credit issued" hint="Not cash: only spendable at that store">
                {r.refundsAsCredit ? `−${money(r.refundsAsCredit)}` : money(0)}
              </Row>
              <Row label="Net merchandise kept">{money(r.net)}</Row>
            </Rows>
          </Card>

          <Card className="mt-3 px-4">
            <Rows>
              <Row label="Gift cards & store credit used" hint="Those purchases are already counted above, so this isn't subtracted again">
                {money(r.creditSpent)}
              </Row>
            </Rows>
          </Card>

          <SpendBuckets data={data} r={r} multiplier={goalMultiplier[kind]} today={today} />

          {trends.length > 0 && (
            <section aria-labelledby="trends" className="mt-7">
              <h2 id="trends" className="text-[17px] font-semibold">
                Trends
              </h2>
              <p className="mt-0.5 text-[14px] text-muted">
                Compared with {formatDate(prev.from, today)} to {formatDate(prev.to, today)}, the same stretch of the {kind === "custom" ? "days before" : `previous ${kind}`}.
              </p>
              <Card className="mt-3 divide-y divide-line">
                {trends.map((t) => (
                  <div key={t.kind} className="flex items-center gap-3 px-4 py-2.5">
                    <ItemArt kind={t.kind} className="size-9 shrink-0" />
                    <span className="flex-1 text-[15px] font-medium">{t.label}</span>
                    <span className="tabular text-right text-[15px]">
                      {money(t.now)}
                      <span className="block text-[13px] text-muted">{`${t.now >= t.before ? "Up" : "Down"} ${money(Math.abs(t.now - t.before))}`}</span>
                    </span>
                  </div>
                ))}
              </Card>
            </section>
          )}
          {!hasHistory && <p className="mt-6 rounded-[18px] bg-ivory-deep px-4 py-3 text-[14px] text-muted">No trends yet: Penny doesn&apos;t have purchases from the earlier period to compare with.</p>}
          {r.byRetailer.length > 0 && <Bars title="By store" rows={r.byRetailer} />}

          <section className="mt-6 rounded-[18px] bg-ivory-deep px-4 py-3.5 text-[14px] text-muted">
            <p className="font-semibold text-navy">What&apos;s included</p>
            <p className="mt-1">
              {plural(sourceTotal, "order")} from {r.coverage.map((c) => `${c.label} (${c.count})`).join(", ")}. {r.coverageFrom ? `Penny's history starts ${formatDate(r.coverageFrom, today)}. ` : ""}Purchases that never reached Penny aren&apos;t counted.
              {r.unpricedItems > 0 ? ` ${plural(r.unpricedItems, "item")} had no price in the email and ${r.unpricedItems === 1 ? "is" : "are"} left out.` : ""}
            </p>
          </section>
        </>
      )}
    </Shell>
  );
}
