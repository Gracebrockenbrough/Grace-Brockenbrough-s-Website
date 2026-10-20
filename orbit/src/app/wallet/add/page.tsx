"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackBar, Shell } from "@/components/layout/shell";
import { Button } from "@/components/ui/button";
import { Choice, Field, Input, Select } from "@/components/ui/form";
import { Notice } from "@/components/ui/notice";
import { creditTypeLabel } from "@/lib/domain/format";
import type { CreditType, Expiration } from "@/lib/domain/types";
import { actions, useOrbit } from "@/lib/store/store";

export default function AddCardPage() {
  const o = useOrbit();
  const router = useRouter();
  const [retailerId, setRetailerId] = useState("");
  const [otherName, setOtherName] = useState("");
  const [type, setType] = useState<CreditType>("purchased_gift_card");
  const [balance, setBalance] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [expKind, setExpKind] = useState<Expiration["kind"]>("unknown");
  const [expDate, setExpDate] = useState("");
  if (!o) return <Shell loading nav={false} />;

  const retailers = [...o.data.retailers].sort((a, b) => a.name.localeCompare(b.name));
  const valid = (retailerId && (retailerId !== "other" || otherName.trim())) && (expKind !== "date" || expDate);

  const save = () => {
    const id = retailerId === "other" ? actions.ensureRetailer(otherName) : retailerId;
    const expiration: Expiration = expKind === "date" ? { kind: "date", date: expDate } : { kind: expKind } as Expiration;
    const walletId = actions.addWalletItem({
      retailerId: id,
      type,
      balance: balance === "" ? null : Number(balance),
      balanceStatus: balance === "" ? { kind: "unknown" } : { kind: "user_reported", at: new Date().toISOString() },
      secret: code.trim() ? { code: code.trim(), pin: pin.trim() || null } : null,
      redemption: type === "promotional_credit" ? "Enter the code at checkout." : "Enter the card number and PIN at checkout, or show the code in store.",
      expiration,
      restrictions: [`Can only be used at ${retailerId === "other" ? otherName.trim() : retailers.find((r) => r.id === id)?.name}.`],
      transferable: type === "return_credit" || type === "promotional_credit" ? false : null,
      from: null,
      sourceOrderId: null,
    });
    router.replace(`/wallet/card/?id=${walletId}`);
  };

  return (
    <Shell nav={false}>
      <BackBar fallback="/wallet/" title="Add to Wallet" />
      <div className="space-y-5 pt-3">
        <Field label="Retailer" htmlFor="retailer">
          <Select id="retailer" value={retailerId} onChange={(e) => setRetailerId(e.target.value)}>
            <option value="">Choose a retailer</option>
            {retailers.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            <option value="other">Another retailer…</option>
          </Select>
        </Field>
        {retailerId === "other" && (
          <Field label="Retailer name" htmlFor="other">
            <Input id="other" value={otherName} onChange={(e) => setOtherName(e.target.value)} autoComplete="off" />
          </Field>
        )}

        <div className="space-y-2">
          <p className="text-[15px] font-semibold">Type</p>
          <Choice
            name="type"
            value={type}
            onChange={setType}
            options={(Object.keys(creditTypeLabel) as CreditType[]).map((t) => ({ value: t, label: creditTypeLabel[t] }))}
          />
        </div>

        <Field label="Current balance" htmlFor="balance" hint="Leave blank if you're not sure. We'll show it as unknown.">
          <Input id="balance" inputMode="decimal" placeholder="$0.00" value={balance} onChange={(e) => setBalance(e.target.value.replace(/[^0-9.]/g, ""))} />
        </Field>

        <Field label="Card number or code" htmlFor="code" hint="Stored encrypted and hidden until you reveal it.">
          <Input id="code" autoComplete="off" spellCheck={false} value={code} onChange={(e) => setCode(e.target.value)} />
        </Field>
        {type !== "promotional_credit" && (
          <Field label="PIN (if any)" htmlFor="pin">
            <Input id="pin" autoComplete="off" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
          </Field>
        )}

        <div className="space-y-2">
          <p className="text-[15px] font-semibold">Expiration</p>
          <Choice
            name="exp"
            value={expKind}
            onChange={setExpKind}
            options={[
              { value: "unknown", label: "I'm not sure" },
              { value: "none", label: "Doesn't expire" },
              { value: "date", label: "Expires on a date" },
            ]}
          />
          {expKind === "date" && <Input aria-label="Expiration date" type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />}
        </div>

        <Notice tone="demo">In this prototype, cards are saved only in this browser.</Notice>
        <Button disabled={!valid} onClick={save}>
          Add to Wallet
        </Button>
      </div>
    </Shell>
  );
}
