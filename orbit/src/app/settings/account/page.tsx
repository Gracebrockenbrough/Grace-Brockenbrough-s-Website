"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Inbox } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { ConnectionRow, providerName } from "@/components/orbit/connections";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, Row, Rows, SectionTitle } from "@/components/ui/card";
import { CheckRow, Field, Input, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { addDays, formatDate } from "@/lib/domain/dates";
import { plural } from "@/lib/domain/format";
import { actions, useOrbit } from "@/lib/store/store";

function Account() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const o = useOrbit();
  const [name, setName] = useState<string | null>(null);
  const [disconnect, setDisconnect] = useState(false);
  const [alsoDelete, setAlsoDelete] = useState(false);
  if (!o) return <Shell loading nav={false} />;
  const c = o.data.connections.find((x) => x.id === id);
  if (!c)
    return (
      <Shell nav={false}>
        <BackBar fallback="/settings/" />
        <EmptyState icon={<Inbox aria-hidden />} title="Account not found" action={<ButtonLink href="/settings/#email">Back to Profile</ButtonLink>} />
      </Shell>
    );

  const orders = o.data.orders.filter((x) => x.sourceConnectionId === c.id).length;
  const jobs = o.data.jobs.filter((j) => j.connectionId === c.id);
  const s = c.importSettings;
  const since = s.since == null ? "all" : s.since;

  return (
    <Shell nav={false}>
      <BackBar fallback="/settings/" title={c.label} />

      <Card className="mt-2">
        <ConnectionRow c={c} today={o.today} />
      </Card>
      {c.demo && (
        <Notice tone="demo" className="mt-3">
          This is a sample inbox with fictional emails. It shows how a real connection would behave.
        </Notice>
      )}

      <section className="mt-6">
        <SectionTitle>Details</SectionTitle>
        <Card className="px-4">
          <Rows>
            <Row label="Name">
              <button type="button" className="font-semibold text-navy underline-offset-4 hover:underline" onClick={() => setName(c.label)}>
                {c.label}
              </button>
            </Row>
            <Row label="Address">{c.address ?? "Not shown"}</Row>
            <Row label="Provider">{providerName[c.provider]}</Row>
            {c.connectedAt && <Row label="Connected">{formatDate(c.connectedAt.slice(0, 10), o.today)}</Row>}
            <Row label="Purchases found here">{plural(orders, "order")}</Row>
            <Row label="Emails processed">{jobs.length}</Row>
          </Rows>
        </Card>
      </section>

      <section className="mt-6">
        <SectionTitle>Import settings</SectionTitle>
        <Card className="divide-y divide-line px-4">
          <CheckRow checked={s.orders} onChange={(v) => actions.setImportSettings(c.id, { orders: v })}>
            Order confirmations and receipts
          </CheckRow>
          <CheckRow checked={s.shipping} onChange={(v) => actions.setImportSettings(c.id, { shipping: v })}>
            Shipping and delivery updates
          </CheckRow>
          <CheckRow checked={s.returnsAndRefunds} onChange={(v) => actions.setImportSettings(c.id, { returnsAndRefunds: v })}>
            Returns, labels and refunds
          </CheckRow>
          <CheckRow checked={s.giftCards} onChange={(v) => actions.setImportSettings(c.id, { giftCards: v })}>
            Gift cards and store credit
          </CheckRow>
          <div className="py-3">
            <Field label="Look back" htmlFor="since">
              <Select id="since" value={since === "all" ? "all" : "custom"} onChange={(e) => actions.setImportSettings(c.id, { since: e.target.value === "all" ? null : addDays(o.today, -90) })}>
                <option value="all">Everything the provider allows</option>
                <option value="custom">Last 3 months only</option>
              </Select>
            </Field>
          </div>
        </Card>
        <p className="mt-2 px-1 text-[14px] text-muted">Promotions and personal mail are never imported, whatever you choose here.</p>
      </section>

      <Button variant="danger" size="md" className="mt-8 w-full" onClick={() => setDisconnect(true)}>
        {c.status === "disconnected" ? "Remove This Account" : "Disconnect"}
      </Button>

      <Sheet
        open={name != null}
        onOpenChange={(v) => !v && setName(null)}
        title="Rename"
        footer={
          <Button
            onClick={() => {
              actions.renameConnection(c.id, name ?? "");
              setName(null);
            }}
          >
            Save
          </Button>
        }
      >
        <Field label="Name" htmlFor="rename">
          <Input id="rename" value={name ?? ""} onChange={(e) => setName(e.target.value)} />
        </Field>
      </Sheet>

      <Sheet
        open={disconnect}
        onOpenChange={setDisconnect}
        title={`Disconnect ${c.label}?`}
        description="Penny stops reading this inbox right away. In a live connection, access is also revoked with the provider."
        footer={
          <Button
            variant="danger"
            onClick={() => {
              actions.disconnectConnection(c.id, alsoDelete);
              setDisconnect(false);
              if (alsoDelete) router.push("/settings/#email");
            }}
          >
            {alsoDelete ? "Disconnect and Delete" : "Disconnect"}
          </Button>
        }
      >
        <CheckRow checked={alsoDelete} onChange={setAlsoDelete}>
          Also delete the {plural(orders, "purchase")} found in this inbox
        </CheckRow>
      </Sheet>
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading nav={false} />}>
      <Account />
    </Suspense>
  );
}
