"use client";

import { useState } from "react";
import { Button, ExternalButton } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { formatDate } from "@/lib/domain/dates";
import { money } from "@/lib/domain/format";
import type { DateOnly, Refund, Retailer, ReturnRequest } from "@/lib/domain/types";
import { askerPrompt, refundAskerStatus } from "@/lib/intelligence/refunds";
import { actions, getState } from "@/lib/store/store";
import { recoveredThisYear } from "@/lib/store/selectors";
import { cn } from "../ui/cn";
import { toast } from "@/components/ui/toast";

/**
 * Refund Asker. Tote can't see a bank account, so after the store issues a card refund it
 * asks once, with three plain answers, and only marks it received when the customer says so.
 */
export function RefundAsker({ refund, request, retailer, orderNumber, today, compact = false }: { refund: Refund; request: ReturnRequest | null; retailer: Retailer; orderNumber: string | null; today: DateOnly; compact?: boolean }) {
  const [sheet, setSheet] = useState<"yes" | "resolve" | null>(null);
  const [amount, setAmount] = useState("");
  const status = refundAskerStatus(refund, request, today);
  const prompt = askerPrompt(refund, retailer.name, status);
  const expected = refund.confirmed?.amount ?? refund.expected?.amount ?? null;

  const openYes = (kind: "yes" | "resolve") => {
    setAmount(expected != null ? String(expected) : "");
    setSheet(kind);
  };

  let body: React.ReactNode = null;
  if (prompt) {
    body = (
      <>
        <p className="text-[16px] font-semibold">{prompt.title}</p>
        <p className="mt-0.5 text-[15px] text-muted">{prompt.body}</p>
        <div className="mt-3 grid gap-2">
          <Button size="md" onClick={() => openYes("yes")}>
            Yes, I Received It
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="md" onClick={() => actions.answerRefund(refund.id, "not_yet")}>
              Not Yet
            </Button>
            <Button variant="secondary" size="md" onClick={() => actions.answerRefund(refund.id, "later")}>
              Remind Me Later
            </Button>
          </div>
          {(refund.asker?.askedCount ?? 0) > 0 && (
            <Button variant="ghost" size="sm" onClick={() => actions.answerRefund(refund.id, "missing")}>
              It&apos;s Been a While. Report Missing Refund
            </Button>
          )}
        </div>
      </>
    );
  } else if (status === "refund_issued" && refund.asker?.remindOn) {
    body = (
      <p className="text-[15px] text-muted">
        We&apos;ll ask again on {formatDate(refund.asker.remindOn, today)}.{" "}
        <button type="button" className="font-semibold text-navy underline-offset-4 hover:underline" onClick={() => openYes("yes")}>
          It arrived
        </button>
      </p>
    );
  } else if (status === "reported_missing") {
    body = (
      <>
        <p className="text-[16px] font-semibold">You reported this refund missing</p>
        <p className="mt-0.5 text-[15px] text-muted">
          Contact {retailer.name} with your order number{orderNumber ? ` (${orderNumber})` : ""} and the date they issued it
          {refund.confirmed ? ` (${formatDate(refund.confirmed.at, today)})` : ""}. Your card issuer can also trace refunds.
        </p>
        <div className="mt-3 grid gap-2">
          {retailer.supportUrl && <ExternalButton href={retailer.supportUrl} size="md">Contact {retailer.name}</ExternalButton>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="md" onClick={() => openYes("resolve")}>
              It Arrived
            </Button>
            <Button variant="secondary" size="md" onClick={() => actions.resolveRefund(refund.id, "Sorted out with the store")}>
              It&apos;s Sorted
            </Button>
          </div>
        </div>
      </>
    );
  }
  if (!body) return null;

  return (
    <div className={cn("rounded-[18px] border border-line bg-card", compact ? "mt-3 p-3.5" : "p-4")} aria-label="Did your refund arrive?" role="group">
      {body}
      <Sheet
        open={sheet != null}
        onOpenChange={(v) => !v && setSheet(null)}
        title="How much arrived?"
        description="Check your bank or card statement. We'll mark the refund as received."
        footer={
          <Button
            disabled={!(Number(amount) > 0)}
            onClick={() => {
              if (sheet === "resolve") actions.resolveRefund(refund.id, "Arrived late", Number(amount));
              else actions.markRefundArrived(refund.id, Number(amount));
              const total = recoveredThisYear(getState().data, today);
              toast(`${money(Number(amount))} is back`, `Refund confirmed. ${money(total)} recovered so far this year.`);
              setSheet(null);
            }}
          >
            Confirm {Number(amount) > 0 ? money(Number(amount)) : ""}
          </Button>
        }
      >
        <Field label="Amount on your statement" htmlFor={`amt-${refund.id}`} hint={expected != null ? `${retailer.name} said ${money(expected)}` : undefined}>
          <Input id={`amt-${refund.id}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} />
        </Field>
      </Sheet>
    </div>
  );
}
