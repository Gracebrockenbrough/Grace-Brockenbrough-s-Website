"use client";

import { useState } from "react";
import Link from "next/link";
import { Ban, ChevronRight, FileUp, Heart, Inbox, LoaderCircle, Mail, RefreshCw, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { CopyRow } from "@/components/orbit/copy";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Choice, Toggle } from "@/components/ui/form";
import { Notice, Tag } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { ago } from "@/lib/domain/dates";
import { plural } from "@/lib/domain/format";
import type { ConnectedAccount } from "@/lib/domain/types";
import { FORWARDING_ADDRESS_DEMO, gmailConnector, outlookConnector, type EmailConnector } from "@/lib/ingestion/connectors";
import { weeklySummary } from "@/lib/intelligence/priorities";
import { actions, useOrbit } from "@/lib/store/store";

const statusCopy: Record<ConnectedAccount["status"], { text: string; tone: string }> = {
  connected: { text: "Connected", tone: "text-sage-ink" },
  connecting: { text: "Connecting…", tone: "text-muted" },
  syncing: { text: "Syncing…", tone: "text-muted" },
  sync_failed: { text: "Sync failed", tone: "text-terracotta" },
  reauth_required: { text: "Reconnection required", tone: "text-terracotta" },
  disconnected: { text: "Not connected", tone: "text-muted" },
  unavailable: { text: "Not available yet", tone: "text-muted" },
};

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
  const [syncNote, setSyncNote] = useState<string | null>(null);
  if (!o) return <Shell loading nav={false} />;

  const { data, today, profile, preview } = o;
  const inbox = data.connections.find((c) => c.id === "sample_inbox")!;
  const prefs = data.prefs;
  const busy = inbox.status === "syncing" || inbox.status === "connecting";

  const sync = async () => {
    setSyncNote(null);
    const r = await actions.syncSampleInbox();
    if (r) {
      const n = r.filter((x) => x.status === "added" || x.status === "merged").length;
      setSyncNote(n ? `Imported ${plural(n, "new email")}.` : "No new emails.");
    }
  };

  return (
    <Shell nav={false}>
      <BackBar fallback="/" title="Profile" />

      <Card className="mt-2 flex items-center gap-4 p-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-navy text-[18px] font-semibold text-white">{profile.firstName[0]}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-semibold">{profile.firstName}</p>
          <p className="truncate text-[15px] text-muted">{profile.email}</p>
        </div>
        <Tag>Demo account</Tag>
      </Card>

      <Card className="mt-6 divide-y divide-line overflow-hidden">
        <MenuRow href="/preferences/" icon={<SlidersHorizontal aria-hidden />} title="Shopping preferences" body="Favorite brands, categories and which sales you see" />
        <MenuRow href="/wishlist/" icon={<Heart aria-hidden />} title="Wishlist" body={`${plural(data.wishlist.filter((w) => w.status === "active").length, "item")} you're keeping an eye on`} />
      </Card>

      {/* Email */}
      <section id="email" className="mt-8 scroll-mt-16">
        <SectionTitle>Email connections</SectionTitle>
        <Card className="divide-y divide-line">
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Inbox aria-hidden className="mt-0.5 size-5 text-muted" />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-semibold">
                  Sample inbox <Tag>Demo</Tag>
                </p>
                <p className="text-[14px] text-muted">Fictional emails for this preview. Not a real mailbox.</p>
                <p role="status" className={`mt-1 flex items-center gap-1.5 text-[14px] font-medium ${statusCopy[inbox.status].tone}`}>
                  {busy && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
                  {statusCopy[inbox.status].text}
                  {inbox.lastSyncedAt && inbox.status !== "disconnected" && <span className="font-normal text-muted">· last successful sync {ago(inbox.lastSyncedAt, today)}</span>}
                </p>
                {inbox.lastError && inbox.status === "sync_failed" && <p className="mt-1 text-[14px] text-muted">{inbox.lastError}</p>}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {inbox.status === "connected" || inbox.status === "syncing" ? (
                <>
                  <Button variant="secondary" size="sm" disabled={busy} icon={<RefreshCw aria-hidden className="size-4" />} onClick={sync}>
                    Sync Now
                  </Button>
                  <Button variant="ghost" size="sm" disabled={busy} onClick={() => actions.setConnection("sample_inbox", "disconnected")}>
                    Disconnect
                  </Button>
                </>
              ) : inbox.status === "sync_failed" ? (
                <>
                  <Button variant="secondary" size="sm" icon={<RefreshCw aria-hidden className="size-4" />} onClick={sync}>
                    Retry Sync
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => actions.setConnection("sample_inbox", "disconnected")}>
                    Disconnect
                  </Button>
                </>
              ) : (
                <Button variant="secondary" size="sm" disabled={busy} onClick={() => actions.connectSampleInbox()}>
                  {inbox.status === "reauth_required" ? "Reconnect" : "Connect Sample Inbox"}
                </Button>
              )}
            </div>
            {syncNote && inbox.status === "connected" && <p className="mt-2 text-[14px] text-muted">{syncNote}</p>}
          </div>

          {[gmailConnector, outlookConnector].map((c) => (
            <button key={c.id} type="button" onClick={() => setConsent(c)} className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left hover:bg-ivory-deep">
              <Mail aria-hidden className="size-5 text-muted" />
              <span className="flex-1">
                <span className="block font-semibold">{c.displayName}</span>
                <span className="block text-[14px] text-muted">Not connected · Not available yet</span>
              </span>
              <span className="text-[15px] font-semibold">Learn more</span>
            </button>
          ))}

          <Link href="/add/" className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ivory-deep">
            <FileUp aria-hidden className="size-5 text-muted" />
            <span className="flex-1">
              <span className="block font-semibold">Import without connecting</span>
              <span className="block text-[14px] text-muted">Paste an email, upload a receipt, or enter it yourself</span>
            </span>
            <ChevronRight aria-hidden className="size-5 text-muted/60" />
          </Link>

          <div className="px-4 pb-2 pt-3">
            <CopyRow label="Forwarding address (placeholder, not receiving mail)" value={FORWARDING_ADDRESS_DEMO} />
          </div>
        </Card>
      </section>

      {/* Notifications */}
      <section className="mt-8">
        <SectionTitle>Notifications</SectionTitle>
        <Card className="divide-y divide-line px-4">
          <Toggle label="Return deadlines" checked={prefs.returnDeadlines} onChange={(v) => actions.setPrefs({ returnDeadlines: v })} />
          <Toggle label="Returns that need you" description="Labels to drop off, steps to finish" checked={prefs.returnActions} onChange={(v) => actions.setPrefs({ returnActions: v })} />
          <Toggle label="Refunds that need checking" checked={prefs.refunds} onChange={(v) => actions.setPrefs({ refunds: v })} />
          <Toggle label="Credit expiring" checked={prefs.creditExpiry} onChange={(v) => actions.setPrefs({ creditExpiry: v })} />
          <Toggle label="Packages arriving" checked={prefs.deliveries ?? true} onChange={(v) => actions.setPrefs({ deliveries: v })} />
          <Toggle label="Sales you'd care about" description="Wishlist items on sale, credit you can use, favorite brands" checked={prefs.deals ?? true} onChange={(v) => actions.setPrefs({ deals: v })} />
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

      {/* What the AI can and can't do */}
      <section className="mt-8">
        <SectionTitle>What Orbit&apos;s AI can and can&apos;t do</SectionTitle>
        <Card className="p-4">
          <p className="text-[15px] font-semibold">It can</p>
          <ul className="mt-1.5 space-y-2 text-[15px]">
            {["Read shopping emails: orders, shipping, returns, refunds, gift cards and promotions.", "Fill in the details: store, items, prices, dates and codes.", "Answer your questions using only your own records."].map((t) => (
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
          <p className="mt-4 text-[14px] text-muted">You take every action yourself. Orbit prepares the details and links you to the store.</p>
        </Card>
      </section>

      {/* Privacy */}
      <section className="mt-8">
        <SectionTitle>Privacy & data</SectionTitle>
        <Card className="p-4">
          <ul className="space-y-2.5 text-[15px]">
            {[
              "Orbit never asks for your retailer passwords.",
              "Orbit never connects to your bank. You confirm refunds yourself.",
              "Gift card codes are hidden until you reveal them.",
              "Your wishlist and preferences are only used to choose sales for you.",
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
          <Toggle label="Make the next sync fail" description="Preview the sync error and retry" checked={Boolean(preview.failNextSync)} onChange={(v) => actions.setPreview({ failNextSync: v })} />
          <div className="space-y-2 py-3">
            <Button variant="secondary" size="md" className="w-full" onClick={() => actions.setConnection("sample_inbox", "reauth_required")}>
              Require Inbox Reconnection
            </Button>
            <Button variant="secondary" size="md" className="w-full" onClick={() => actions.loadBusyMonth()}>
              Load a Busy Month (+19 Orders)
            </Button>
            <Button variant="secondary" size="md" className="w-full" onClick={() => actions.setShopping({ onboarded: false })}>
              Replay Welcome Screens
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
        description="Orbit would only read shopping emails, and you can disconnect any time."
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
            <p className="text-[13px] text-muted">
              Permission requested: {consent.consent.scope}. You sign in on {consent.displayName}&apos;s own page; Orbit never sees your password.
            </p>
            <Link href="/add/" className="inline-flex min-h-11 items-center font-semibold text-navy underline-offset-4 hover:underline">
              Import an email instead
            </Link>
          </div>
        )}
      </Sheet>

      <Sheet
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete everything?"
        description="This removes all purchases, returns, refunds, saved emails, wishlist and wallet cards from Orbit, and disconnects your inbox. It can't be undone."
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
