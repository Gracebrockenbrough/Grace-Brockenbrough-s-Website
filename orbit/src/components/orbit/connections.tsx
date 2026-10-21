"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Inbox, LoaderCircle, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/notice";
import { ago } from "@/lib/domain/dates";
import { plural } from "@/lib/domain/format";
import type { ConnectedAccount, DateOnly } from "@/lib/domain/types";
import { actions } from "@/lib/store/store";

export const statusCopy: Record<ConnectedAccount["status"], { text: string; tone: string }> = {
  connected: { text: "Connected", tone: "text-sage-ink" },
  connecting: { text: "Connecting…", tone: "text-muted" },
  syncing: { text: "Syncing…", tone: "text-muted" },
  sync_failed: { text: "Sync failed", tone: "text-terracotta" },
  reauth_required: { text: "Reconnection required", tone: "text-terracotta" },
  disconnected: { text: "Disconnected", tone: "text-muted" },
  unavailable: { text: "Not available yet", tone: "text-muted" },
};

export const providerName: Record<ConnectedAccount["provider"], string> = { gmail: "Gmail", outlook: "Outlook", sample: "Sample inbox" };

export function ConnectionStatusLine({ c, today }: { c: ConnectedAccount; today: DateOnly }) {
  const busy = c.status === "syncing" || c.status === "connecting";
  return (
    <p role="status" className={`flex flex-wrap items-center gap-x-1.5 text-[14px] font-medium ${statusCopy[c.status].tone}`}>
      {busy && <LoaderCircle aria-hidden className="size-4 animate-spin" />}
      {statusCopy[c.status].text}
      {c.lastSyncedAt && c.status !== "disconnected" && <span className="font-normal text-muted">· synced {ago(c.lastSyncedAt, today)}</span>}
    </p>
  );
}

/** One connected inbox: label, address, status, and the action that fits its state. */
export function ConnectionRow({ c, today }: { c: ConnectedAccount; today: DateOnly }) {
  const [note, setNote] = useState<string | null>(null);
  const busy = c.status === "syncing" || c.status === "connecting";
  const sync = async () => {
    setNote(null);
    const r = await actions.syncConnection(c.id);
    if (r) {
      const n = r.filter((x) => x.status === "added" || x.status === "merged").length;
      const review = r.filter((x) => x.status === "needs_review").length;
      setNote([n ? `Imported ${plural(n, "shopping email")}.` : "No new shopping emails.", review ? `${plural(review, "email")} need a quick check.` : ""].filter(Boolean).join(" "));
    }
  };
  return (
    <div className="p-4">
      <Link href={`/settings/account/?id=${c.id}`} className="-m-2 flex items-start gap-3 rounded-2xl p-2 hover:bg-ivory-deep">
        {c.provider === "sample" ? <Inbox aria-hidden className="mt-0.5 size-5 text-muted" /> : <Mail aria-hidden className="mt-0.5 size-5 text-muted" />}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            {c.label} {c.demo && <Tag>Sample</Tag>}
          </span>
          <span className="block truncate text-[14px] text-muted">{c.address ?? providerName[c.provider]}</span>
          <ConnectionStatusLine c={c} today={today} />
        </span>
        <ChevronRight aria-hidden className="mt-1 size-5 text-muted/60" />
      </Link>
      {c.lastError && c.status === "sync_failed" && <p className="mt-2 text-[14px] text-muted">{c.lastError}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {c.status === "connected" || c.status === "syncing" || c.status === "sync_failed" ? (
          <Button variant="secondary" size="sm" disabled={busy} icon={<RefreshCw aria-hidden className="size-4" />} onClick={sync}>
            {c.status === "sync_failed" ? "Retry Sync" : "Sync Now"}
          </Button>
        ) : c.status === "reauth_required" || c.status === "disconnected" ? (
          <Button variant="secondary" size="sm" disabled={busy} onClick={() => actions.reconnect(c.id)}>
            Reconnect
          </Button>
        ) : null}
      </div>
      {note && c.status === "connected" && <p className="mt-2 text-[14px] text-muted">{note}</p>}
    </div>
  );
}
