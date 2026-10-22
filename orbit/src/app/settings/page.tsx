"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, ChevronRight, ClockArrowUp, FileUp, Gauge, Mail, Plus, ShieldCheck } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { CopyRow } from "@/components/orbit/copy";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Choice, Field, Input, Toggle } from "@/components/ui/form";
import { ConnectionRow } from "@/components/orbit/connections";
import { Notice, Tag } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { plural } from "@/lib/domain/format";
import { FORWARDING_ADDRESS_DEMO, gmailConnector, outlookConnector, type EmailConnector } from "@/lib/ingestion/connectors";
import { weeklySummary } from "@/lib/intelligence/priorities";
import { SCHOOL } from "@/lib/demo/seed";
import { actions, useOrbit } from "@/lib/store/store";

function MenuRow({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ivory-deep">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ivory-deep text-navy [&_svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{title}</span>
        <span className="block text-[14px] text-muted">{body}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 text-muted/60" />
    </Link>
  );
}

export default function SettingsPage() {
  const o = useOrbit();
  const [consent, setConsent] = useState<EmailConnector | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [address, setAddress] = useState("");
  if (!o) return <Shell loading nav={false} />;

  const { data, today, profile, preview } = o;
  const prefs = data.prefs;
  const active = data.connections.filter((c) => c.status !== "disconnected");
  const off = data.connections.filter((c) => c.status === "disconnected");
  const review = data.jobs.filter((j) => j.status === "needs_review").length;

  return (
    <Shell nav={false}>
      <BackBar fallback="/you/" title="Settings" />

      <Card className="mt-2 flex items-center gap-4 p-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-navy text-[18px] font-semibold text-white">{profile.firstName[0]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold">{profile.firstName}</p>
          <p className="truncate text-[15px] text-muted">{profile.email}</p>
        </div>
        <Tag>Demo account</Tag>
      </Card>


      {/* Connected accounts */}
      <section id="email" className="mt-8 scroll-mt-16">
        <SectionTitle action={<Button variant="ghost" size="sm" icon={<Plus aria-hidden className="size-4" />} onClick={() => setAdding(true)}>Add Email</Button>}>Connected accounts</SectionTitle>
        <Card className="divide-y divide-line">
          {active.map((c) => (
            <ConnectionRow key={c.id} c={c} today={today} />
          ))}
          {active.length === 0 && <p className="p-4 text-[15px] text-muted">No inboxes connected. Add one, or import purchases without connecting.</p>}
          {off.map((c) => (
            <ConnectionRow key={c.id} c={c} today={today} />
          ))}

          {review > 0 && (
            <Link href="/settings/history/" className="flex min-h-14 items-center gap-3 bg-sand px-4 py-3 hover:bg-ivory-deep">
              <span className="flex-1 text-[15px] font-semibold">{plural(review, "email")} need a quick check</span>
              <ChevronRight aria-hidden className="size-5 text-muted/60" />
            </Link>
          )}

          <Link href="/add/" className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ivory-deep">
            <FileUp aria-hidden className="size-5 text-muted" />
            <span className="flex-1">
              <span className="block font-semibold">Import without connecting</span>
              <span className="block text-[14px] text-muted">Paste an email or text, upload a receipt or PDF, or enter it yourself</span>
            </span>
            <ChevronRight aria-hidden className="size-5 text-muted/60" />
          </Link>

          <div className="px-4 pb-2 pt-3">
            <CopyRow label="Forwarding address (placeholder, not receiving mail yet)" value={FORWARDING_ADDRESS_DEMO} />
          </div>
        </Card>
        <p className="mt-2 px-1 text-[14px] text-muted">Each inbox syncs on its own. Every purchase remembers which one it came from.</p>
      </section>

      {/* Notifications */}
      <section className="mt-8">
        <SectionTitle>Notifications</SectionTitle>
        <Card className="divide-y divide-line px-4">
          <Toggle label="Return deadlines" checked={prefs.returnDeadlines} onChange={(v) => actions.setPrefs({ returnDeadlines: v })} />
          <Toggle label="Returns that need you" description="Labels to drop off, steps to finish" checked={prefs.returnActions} onChange={(v) => actions.setPrefs({ returnActions: v })} />
          <Toggle label="Refunds that need checking" checked={prefs.refunds} onChange={(v) => actions.setPrefs({ refunds: v })} />
          <Toggle label="Credit expiring" checked={prefs.creditExpiry} onChange={(v) => actions.setPrefs({ creditExpiry: v })} />
          <Toggle label="Shared lists" description="When a friend shares a list with you" checked={prefs.social ?? false} onChange={(v) => actions.setPrefs({ social: v })} />
          <Toggle label="Discover on Today" checked={prefs.circlePreview ?? true} onChange={(v) => actions.setPrefs({ circlePreview: v })} />
          <Toggle label="Packages arriving" checked={prefs.deliveries ?? true} onChange={(v) => actions.setPrefs({ deliveries: v })} />
          <div className="py-3">
            <p className="mb-2 font-medium">Remind me before a deadline</p>
            <Choice
              name="lead"
              value={String(prefs.leadDays) as "3" | "5" | "7"}
              onChange={(v) => actions.setPrefs({ leadDays: Number(v) as 3 | 5 | 7 })}
              options={[
                { value: "3", label: "3 days before" },
                { value: "5", label: "5 days before" },
                { value: "7", label: "A week before" },
              ]}
            />
          </div>
          <Toggle label="Weekly summary" description="One calm note on Sunday mornings" checked={prefs.weeklySummary} onChange={(v) => actions.setPrefs({ weeklySummary: v })} />
          {prefs.weeklySummary && (
            <div className="py-3">
              <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">Preview</p>
              <p className="mt-1 text-[15px]">&ldquo;{weeklySummary(data, today)}&rdquo;</p>
            </div>
          )}
        </Card>
        <p className="mt-2 px-1 text-[14px] text-muted">We never send promotions, and we never repeat the same reminder.</p>
      </section>

      {/* Insights */}
      <section className="mt-8">
        <SectionTitle>Shopping Insights</SectionTitle>
        <Card className="px-4">
          <Toggle label="Spending targets" description="Optional personal targets per category. Off by default; Insights is for awareness, not budgeting." checked={data.goals?.enabled ?? false} onChange={(v) => actions.setGoalsEnabled(v)} />
        </Card>
      </section>

      {/* What the AI can and can't do */}
      <section className="mt-8">
        <SectionTitle>What Penny&apos;s AI can and can&apos;t do</SectionTitle>
        <Card className="p-4">
          <p className="text-[15px] font-semibold">It can</p>
          <ul className="mt-1.5 space-y-2 text-[15px]">
            {["Read shopping emails: orders, shipping, returns, refunds and gift cards. Promotions are recognized and skipped.", "Fill in details the rules couldn't read, from a shortened copy with your address and card digits removed.", "Answer your questions using only your own records."].map((t) => (
              <li key={t} className="flex gap-2.5">
                <ShieldCheck aria-hidden className="mt-0.5 size-[18px] shrink-0 text-sage-ink" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[15px] font-semibold">It can&apos;t</p>
          <ul className="mt-1.5 space-y-2 text-[15px]">
            {["Send, delete or change any email. Access is read-only.", "Buy anything, submit returns, or contact stores for you.", "Open links, browse the web or log in anywhere.", "Follow instructions written inside an email."].map((t) => (
              <li key={t} className="flex gap-2.5">
                <Ban aria-hidden className="mt-0.5 size-[18px] shrink-0 text-terracotta" />
                {t}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[14px] text-muted">You take every action yourself. Penny prepares the details and links you to the store.</p>
        </Card>
      </section>

      {/* Privacy */}
      <section id="privacy" className="mt-8 scroll-mt-16">
        <SectionTitle>Privacy & data</SectionTitle>
        <Card className="p-4">
          <ul className="space-y-2.5 text-[15px]">
            {[
              "Penny never asks for your retailer passwords.",
              "Penny never connects to your bank. You confirm refunds yourself.",
              "Gift card codes are hidden until you reveal them.",
              "Your email is never used for advertising, and your shopping history is never sold.",
              "Lists and stores are private unless you make them public. Orders are never shared.",
              "Most emails are read by simple rules, with no AI at all.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <ShieldCheck aria-hidden className="mt-0.5 size-[18px] shrink-0 text-sage-ink" />
                {t}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="mt-3 divide-y divide-line overflow-hidden">
          <MenuRow href="/settings/history/" icon={<ClockArrowUp aria-hidden />} title="Import history" body={`${plural(data.jobs.length, "email")} processed. What was imported, skipped, or needs a check`} />
          <MenuRow href="/dev/" icon={<Gauge aria-hidden />} title="Processing dashboard" body="For developers: volumes, AI use and estimated cost" />
        </Card>
        <Card className="mt-3 p-4">
          <Button variant="danger" size="md" className="w-full" onClick={() => setConfirmDelete(true)}>
            Delete All Imported Information
          </Button>
        </Card>
      </section>

      {/* Prototype tools */}
      <section className="mt-8">
        <SectionTitle>Preview tools</SectionTitle>
        <Card className="divide-y divide-line px-4">
          <Toggle label="Show a brand-new account" description="See the empty states" checked={preview.emptyAccount} onChange={(v) => actions.setPreview({ emptyAccount: v })} />
          <div className="py-3">
            <p className="mb-2 font-medium">Simulate a service outage</p>
            <Choice
              name="outage"
              value={preview.outage}
              onChange={(v) => actions.setPreview({ outage: v })}
              options={[
                { value: "none", label: "Everything working" },
                { value: "returns", label: "Returns unavailable", detail: "Wallet keeps working" },
                { value: "wallet", label: "Wallet unavailable", detail: "Returns keep working" },
              ]}
            />
          </div>
          <Toggle label="Make the next sync fail" description="Preview the sync error and retry" checked={Boolean(preview.failNextSync)} onChange={(v) => actions.setPreview({ failNextSync: v })} />
          <div className="space-y-2 py-3">
            <Button variant="secondary" size="md" className="w-full" onClick={() => actions.setConnection(SCHOOL, "reauth_required", "Access expired. Sign in again to keep importing.")}>
              Expire the School Email Login
            </Button>
            <Button variant="secondary" size="md" className="w-full" onClick={() => actions.loadBusyMonth()}>
              Load a Busy Month (+19 Orders)
            </Button>
            <Button variant="secondary" size="md" className="w-full" onClick={() => actions.resetDemo()}>
              Reset Demo Data
            </Button>
          </div>
        </Card>
        <Notice tone="demo" className="mt-3">
          Everything in this preview is fictional: people, orders, codes and balances. Data is saved only in this browser.
        </Notice>
      </section>

      <Sheet
        open={consent != null}
        onOpenChange={(v) => !v && setConsent(null)}
        title={consent ? `Connect ${consent.displayName}` : ""}
        description="Penny imports only shopping emails, and you can disconnect any time."
        footer={
          consent && (
            <>
              {consent.availability().available === false && <p className="text-center text-[14px] text-muted">{(consent.availability() as { reason: string }).reason}</p>}
              <Button disabled>Connect {consent.displayName}</Button>
            </>
          )
        }
      >
        {consent && (
          <div className="space-y-4 text-[15px]">
            <div>
              <p className="font-semibold">Penny would read</p>
              <ul className="mt-1 space-y-1 text-muted">
                {consent.consent.reads.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Penny would never</p>
              <ul className="mt-1 space-y-1 text-muted">
                {consent.consent.neverDoes.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
            <Notice tone="info" title="About this permission">
              {consent.consent.scopeReality}
            </Notice>
            <p className="text-[13px] text-muted">
              Permission requested: {consent.consent.scope}. You sign in on {consent.displayName}&apos;s own page; Penny never sees your password.
            </p>
            <Link href="/add/" className="inline-flex min-h-11 items-center font-semibold text-navy underline-offset-4 hover:underline">
              Import an email instead
            </Link>
          </div>
        )}
      </Sheet>

      <Sheet
        open={adding}
        onOpenChange={setAdding}
        title="Add an email"
        description="Connect every inbox you shop with. They all live under this one Penny profile."
        footer={
          <Button
            disabled={!label.trim()}
            onClick={async () => {
              await actions.addConnection({ provider: "sample", label, address });
              setAdding(false);
              setLabel("");
              setAddress("");
            }}
          >
            Add Sample Inbox
          </Button>
        }
      >
        <div className="space-y-4">
          {[gmailConnector, outlookConnector].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setAdding(false);
                setConsent(c);
              }}
              className="flex min-h-16 w-full items-center gap-3 rounded-2xl border border-line px-4 py-3 text-left hover:bg-ivory-deep"
            >
              <Mail aria-hidden className="size-5 text-muted" />
              <span className="flex-1">
                <span className="block font-semibold">{c.displayName}</span>
                <span className="block text-[14px] text-muted">Not available yet · Learn why</span>
              </span>
              <ChevronRight aria-hidden className="size-5 text-muted/60" />
            </button>
          ))}
          <div className="rounded-2xl border border-line p-4">
            <p className="flex items-center gap-2 font-semibold">
              Sample inbox <Tag>Demo</Tag>
            </p>
            <p className="mb-3 text-[14px] text-muted">A pretend inbox for trying multiple accounts. It never reads real mail.</p>
            <div className="space-y-3">
              <Field label="Name" htmlFor="conn-label">
                <Input id="conn-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Work email" autoComplete="off" />
              </Field>
              <Field label="Address (optional)" htmlFor="conn-address">
                <Input id="conn-address" type="email" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="you@example.com" autoComplete="off" />
              </Field>
            </div>
          </div>
        </div>
      </Sheet>

      <Sheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete everything?"
        description="This removes all purchases, returns, refunds, saved emails, saved items and wallet cards from Penny, and disconnects every inbox. It can't be undone."
        footer={
          <Button
            variant="danger"
            onClick={() => {
              actions.deleteAllData();
              setConfirmDelete(false);
            }}
          >
            Delete Everything
          </Button>
        }
      >
        <span />
      </Sheet>
    </Shell>
  );
}
