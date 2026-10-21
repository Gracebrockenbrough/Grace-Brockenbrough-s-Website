"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Eye, EyeOff, LockKeyhole, WalletCards } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { BalanceStatus, balanceStatusText } from "@/components/orbit/balance";
import { CopyRow } from "@/components/orbit/copy";
import { WalletCardFace } from "@/components/orbit/wallet-card";
import { QrCode } from "@/components/orbit/qr";
import { Button, ButtonLink, ExternalButton, TextLink } from "@/components/ui/button";
import { Card, Row, Rows } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Field, Input } from "@/components/ui/form";
import { Notice } from "@/components/ui/notice";
import { Sheet } from "@/components/ui/sheet";
import { EmptyState } from "@/components/ui/states";
import { daysBetween, formatDate } from "@/lib/domain/dates";
import { creditTypeLabel, money } from "@/lib/domain/format";
import { retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";
import { toast } from "@/components/ui/toast";

const REVEAL_SECONDS = 30;

function CardDetail() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const o = useOrbit();
  const [confirmReveal, setConfirmReveal] = useState(false);
  const [revealLeft, setRevealLeft] = useState(0);
  const [balanceSheet, setBalanceSheet] = useState(false);
  const [removeSheet, setRemoveSheet] = useState(false);
  const [newBalance, setNewBalance] = useState("");
  const [noCode, setNoCode] = useState(false);

  // Codes hide again automatically.
  useEffect(() => {
    if (revealLeft <= 0) return;
    const t = setTimeout(() => setRevealLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [revealLeft]);

  if (!o) return <Shell loading nav={false} />;
  const item = o.data.wallet.find((w) => w.id === id);
  if (!item)
    return (
      <Shell>
        <BackBar fallback="/wallet/" />
        <EmptyState icon={<WalletCards aria-hidden />} title="Card not found" action={<ButtonLink href="/wallet/">Back to Wallet</ButtonLink>} />
      </Shell>
    );

  const { today } = o;
  const retailer = retailerOf(o.data, item.retailerId);
  const status = balanceStatusText(item, today);
  const revealed = revealLeft > 0;
  const exp = item.expiration;
  const expDays = exp.kind === "date" ? daysBetween(today, exp.date) : null;

  return (
    <Shell nav={false}>
      <BackBar fallback="/wallet/" title={retailer.name} />

      <div className="pt-2">
        <WalletCardFace item={item} retailer={retailer} today={today} />
      </div>

      <div className="mt-5 text-center">
        <p className="text-[15px] text-muted">
          {creditTypeLabel[item.type]}
          {item.from ? ` from ${item.from}` : ""} · {item.balanceStatus.kind === "verified" ? "Balance" : "Last known balance"}
        </p>
        <p className="tabular text-[40px] font-semibold leading-tight tracking-[-0.03em]">{money(item.balance)}</p>
        <BalanceStatus item={item} today={today} />
      </div>

      {!status.trusted && (
        <Notice tone="warning" className="mt-5" title="Balance may have changed">
          We can&apos;t check {retailer.name} balances automatically yet. Confirm it before you rely on it.
          <span className="mt-1 flex flex-wrap gap-x-4">
            {retailer.balanceCheckUrl && <TextLink href={retailer.balanceCheckUrl} external>Check on {retailer.name}</TextLink>}
            <button type="button" className="min-h-11 text-[15px] font-semibold text-navy underline-offset-4 hover:underline" onClick={() => { setNewBalance(String(item.balance ?? "")); setBalanceSheet(true); }}>
              Update balance
            </button>
          </span>
        </Notice>
      )}

      <div className="mt-5 grid grid-cols-2 gap-2">
        {retailer.websiteUrl ? (
          <ExternalButton href={retailer.websiteUrl} size="md" className="w-full px-3">
            Shop {retailer.name}
          </ExternalButton>
        ) : (
          <Button size="md" disabled className="w-full">
            No website on file
          </Button>
        )}
        <Button
          variant="secondary"
          size="md"
          className="w-full"
          icon={revealed ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
          onClick={() => (revealed ? setRevealLeft(0) : item.secret ? setConfirmReveal(true) : setNoCode(true))}
        >
          {revealed ? "Hide Code" : "Show Code"}
        </Button>
      </div>

      {revealed && item.secret && (
        <Card className="animate-in mt-4 px-4 pb-3 pt-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted">{item.type === "promotional_credit" ? "Promo code" : "Card number"}</p>
            <p className="tabular text-[13px] text-muted">Hides in {revealLeft}s</p>
          </div>
          <div className="mx-auto mt-3 w-40">
            <QrCode value={item.secret.code.replace(/\s/g, "")} label={`Scannable code for ${retailer.name}`} />
          </div>
          {item.demo && <p className="mt-2 text-center text-[13px] text-muted">Demo code. It won&apos;t work at checkout.</p>}
          <div className="divide-y divide-line">
            <CopyRow label={item.type === "promotional_credit" ? "Code" : "Number"} value={item.secret.code} />
            {item.secret.pin && <CopyRow label="PIN" value={item.secret.pin} />}
          </div>
          <p className="mt-1 text-[14px] text-muted">{item.redemption}</p>
        </Card>
      )}

      <Card className="mt-5 overflow-hidden">
        <Disclosure title="Transaction history" summary={item.history.length ? `${item.history.length} recorded` : "None recorded"}>
          {item.history.length === 0 ? (
            <p className="text-[15px] text-muted">No balance changes recorded. Spending at the store only shows here if you update the balance or the store emails you.</p>
          ) : (
            <ul className="divide-y divide-line">
              {[...item.history].reverse().map((h, i) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                  <span>
                    <span className="block text-[15px]">{h.label}</span>
                    <span className="block text-[13px] text-muted">{formatDate(h.at, today)}</span>
                  </span>
                  <span className={`tabular font-semibold ${h.amount < 0 ? "" : "text-sage-ink"}`}>
                    {h.amount < 0 ? "−" : "+"}
                    {money(Math.abs(h.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Disclosure>
        <Disclosure title="How to use it" summary={item.redemption.split(".")[0]}>
          <p className="text-[15px]">{item.redemption}</p>
        </Disclosure>
        <Disclosure
          title="Expiration & restrictions"
          summary={exp.kind === "none" ? "Doesn't expire" : exp.kind === "unknown" ? "Expiration not confirmed" : `Expires ${formatDate(exp.date, today)}`}
        >
          <Rows>
            <Row label="Expires">
              {exp.kind === "none" ? "Never" : exp.kind === "unknown" ? <span className="text-sand-ink">Not confirmed</span> : `${formatDate(exp.date, today)}${expDays != null && expDays >= 0 ? ` (${expDays} days)` : ""}`}
            </Row>
            <Row label="Transferable" hint={item.transferable == null ? "Treated as not transferable until confirmed" : undefined}>
              {item.transferable == null ? "Unknown" : item.transferable ? "Yes" : "No"}
            </Row>
          </Rows>
          {item.restrictions.length > 0 && (
            <ul className="mt-2 space-y-1 text-[15px] text-muted">
              {item.restrictions.map((r) => (
                <li key={r}>• {r}</li>
              ))}
            </ul>
          )}
        </Disclosure>
        <Disclosure title="Balance & verification" summary={status.text}>
          <Rows>
            <Row label="Balance">{money(item.balance)}</Row>
            <Row label="Status">{status.text}</Row>
            {"source" in item.balanceStatus && <Row label="Source">{item.balanceStatus.source}</Row>}
            <Row label="Added">{formatDate(item.addedAt.slice(0, 10), today)}</Row>
          </Rows>
          <Button variant="secondary" size="md" className="mt-2 w-full" onClick={() => { setNewBalance(String(item.balance ?? "")); setBalanceSheet(true); }}>
            Update Balance
          </Button>
        </Disclosure>
      </Card>

      <div className="mt-6 flex justify-center">
        <Button variant="ghost" size="sm" className="text-muted" onClick={() => setRemoveSheet(true)}>
          Remove from Wallet
        </Button>
      </div>

      <Sheet
        open={confirmReveal}
        onOpenChange={setConfirmReveal}
        title="Reveal code?"
        description="Make sure no one can see your screen. The code hides again after 30 seconds."
        footer={
          <Button
            icon={<LockKeyhole aria-hidden className="size-5" />}
            onClick={() => {
              setConfirmReveal(false);
              setRevealLeft(REVEAL_SECONDS);
            }}
          >
            Reveal Code
          </Button>
        }
      >
        <p className="text-[14px] text-muted">In the full app, revealing a code requires Face ID, Touch ID or your device passcode, and codes are stored encrypted.</p>
      </Sheet>

      <Sheet open={noCode} onOpenChange={setNoCode} title="No code saved" description={`This ${creditTypeLabel[item.type].toLowerCase()} doesn't have a code in Tote.`}>
        <p className="text-[15px]">{item.redemption}</p>
      </Sheet>

      <Sheet
        open={balanceSheet}
        onOpenChange={setBalanceSheet}
        title="Update balance"
        description={`Enter the balance shown on ${retailer.name}'s site or your latest receipt.`}
        footer={
          <Button
            disabled={newBalance === "" || Number.isNaN(Number(newBalance))}
            onClick={() => {
              actions.updateBalance(item.id, Number(newBalance));
              toast("Balance updated", "Marked as reported by you, with today's date.");
              setBalanceSheet(false);
            }}
          >
            Save Balance
          </Button>
        }
      >
        <Field label="Current balance" htmlFor="bal" hint="We'll label it “Updated by you” so it's never mistaken for a verified balance.">
          <Input id="bal" inputMode="decimal" value={newBalance} onChange={(e) => setNewBalance(e.target.value.replace(/[^0-9.]/g, ""))} />
        </Field>
      </Sheet>

      <Sheet
        open={removeSheet}
        onOpenChange={setRemoveSheet}
        title="Remove this card?"
        description="It will be deleted from Tote, including its saved code. The balance stays with the retailer."
        footer={
          <Button
            variant="danger"
            onClick={() => {
              actions.removeWalletItem(item.id);
              router.replace("/wallet/");
            }}
          >
            Remove Card
          </Button>
        }
      >
        <span />
      </Sheet>
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading nav={false} />}>
      <CardDetail />
    </Suspense>
  );
}
