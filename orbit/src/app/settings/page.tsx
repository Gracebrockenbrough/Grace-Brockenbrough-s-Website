"use client";

import { useState } from "react";
import { Inbox, Mail, RefreshCw, ShieldCheck } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Choice, Toggle } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { ago } from "@/lib/domain/dates";
import { plural } from "@/lib/domain/format";
import { FORWARDING_ADDRESS_DEMO, gmailConnector, outlookConnector, type EmailConnector } from "@/lib/ingestion/connectors";
import { weeklySummary } from "@/lib/intelligence/priorities";
import { actions, useOrbit, useOrbitState } from "@/lib/store/store";
import { CopyRow } from "@/components/orbit/copy";

export default function SettingsPage() {
  const o = useOrbit();
  const raw = useOrbitState();
  const [consent, setConsent] = useState<EmailConnector | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [syncNote, setSyncNote] = useState<string | null>(null);
  if (!o || !raw) return <Shell loading nav={false} />;

  const { data, today, profile, preview } = o;
  const inbox = data.connections.find((c) => c.id === "sample_inbox")!;
  const prefs = data.prefs;

  return (
    <Shell nav={false}>
      <BackBar fallback="/" title="Settings" />

      <Card className="mt-2 flex items-center gap-4 p-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-navy text-[18px] font-semibold text-white">{profile.firstName[0]}</span>
        <div className="flex-1">
          <p className="text-[17px] font-semibold">{profile.firstName}</p>
          <p className="text-[15px] text-muted">{profile.email}</p>
        </div>
        <Tag>Demo account</Tag>
      </Card>

      {/* Email */}
      <section id="email" className="mt-8 scroll-mt-16">
        <SectionTitle>Email connections</SectionTitle>
        <Card className="divide-y divide-line">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Inbox aria-hidden className="mt-0.5 size-5 text-muted" />
              <div className="flex-1">
                <p className="font-semibold">Sample inbox</p>
                <p className="text-[14px] text-muted">Fictional emails for this demo. Not a real mailbox.</p>
                <p className={`mt-1 text-[14px] font-medium ${inbox.status === "connected" ? "text-sage-ink" : "text-terracotta"}`}>
                  {inbox.status === "connected" ? `Connected · synced ${inbox.lastSyncedAt ? ago(inbox.lastSyncedAt, today) : "never"}` : "Disconnected"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {inbox.status === "connected" ? (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<RefreshCw aria-hidden className="size-4" />}
                    onClick={() => {
                      const r = actions.syncSampleInbox();
                      const n = r.filter((x) => x.status === "added" || x.status === "merged").length;
                      setSyncNote(n ? `Imported ${plural(n, "new email")}.` : "No new emails.");
                    }}
                  >
                    Sync Now
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { actions.setConnection("sample_inbox", "disconnected"); setSyncNote(null); }}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => actions.setConnection("sample_inbox", "connected")}>
                  Reconnect
                </Button>
              )}
            </div>
            {syncNote && <p role="status" className="mt-2 text-[14px] text-muted">{syncNote}</p>}
          </div>

          {[gmailConnector, outlookConnector].map((c) => (
            <button key={c.id} type="button" onClick={() => setConsent(c)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-ivory-deep">
              <Mail aria-hidden className="size-5 text-muted" />
              <span className="flex-1">
                <span className="block font-semibold">{c.displayName}</span>
                <span className="block text-[14px] text-muted">Not available yet</span>
              </span>
              <span className="text-[15px] font-semibold">Learn more</span>
            </button>
          ))}

          <div className="px-4 pb-2 pt-3">
            <CopyRow label="Forwarding address (placeholder)" value={FORWARDING_ADDRESS_DEMO} />
          </div>
        </Card>
      </section>

      {/* Notifications */}
      <section className="mt-8">
        <SectionTitle>Notifications</SectionTitle>
        <Card className="divide-y divide-line px-4">
          <Toggle label="Return deadlines" checked={prefs.returnDeadlines} onChange={(v) => actions.setPrefs({ returnDeadlines: v })} />
          <Toggle label="Returns that need you" description="Labels to drop off, steps to finish" checked={prefs.returnActions} onChange={(v) => actions.setPrefs({ returnActions: v })} />
          <Toggle label="Late or missing refunds" checked={prefs.refunds} onChange={(v) => actions.setPrefs({ refunds: v })} />
          <Toggle label="Credit expiring" checked={prefs.creditExpiry} onChange={(v) => actions.setPrefs({ creditExpiry: v })} />
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
              <p className="mt-1 text-[15px]">“{weeklySummary(data, today)}”</p>
            </div>
          )}
        </Card>
        <p className="mt-2 px-1 text-[14px] text-muted">We never send promotions, and we never repeat the same reminder.</p>
      </section>

      {/* Privacy */}
      <section className="mt-8">
        <SectionTitle>Privacy & data</SectionTitle>
        <Card className="p-4">
          <ul className="space-y-2.5 text-[15px]">
            {[
              "Orbit never asks for your retailer passwords.",
              "Gift card codes are hidden until you reveal them.",
              "Instructions inside emails are never followed.",
              "Nothing is submitted or purchased without your approval.",
            ].map((t) => (
              <li key={t} className="flex gap-2.5">
                <ShieldCheck aria-hidden className="mt-0.5 size-[18px] shrink-0 text-sage-ink" />
                {t}
              </li>
            ))}
          </ul>
          <Button variant="danger" size="md" className="mt-4 w-full" onClick={() => setConfirmDelete(true)}>
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
          <div className="py-3">
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
        description="Orbit would only read shopping emails, and you can disconnect any time."
        footer={
          consent && (
            <>
              {consent.availability().available === false && (
                <p className="text-center text-[14px] text-muted">{(consent.availability() as { reason: string }).reason}</p>
              )}
              <Button disabled>Connect {consent.displayName}</Button>
            </>
          )
        }
      >
        {consent && (
          <div className="space-y-4 text-[15px]">
            <div>
              <p className="font-semibold">Orbit would read</p>
              <ul className="mt-1 space-y-1 text-muted">
                {consent.consent.reads.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">Orbit would never</p>
              <ul className="mt-1 space-y-1 text-muted">
                {consent.consent.neverDoes.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
            <p className="text-[13px] text-muted">Permission requested: {consent.consent.scope}. You sign in on {consent.displayName}&apos;s own page; Orbit never sees your password.</p>
          </div>
        )}
      </Sheet>

      <Sheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete everything?"
        description="This removes all purchases, returns, refunds, saved emails and wallet cards from Orbit, and disconnects your inbox. It can't be undone."
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
