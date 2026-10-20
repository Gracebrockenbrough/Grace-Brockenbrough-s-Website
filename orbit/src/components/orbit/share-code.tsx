"use client";

import { useState } from "react";
import { actions } from "@/lib/store/store";
import { Button } from "../ui/button";
import { Field, Input } from "../ui/form";
import { Sheet } from "../ui/sheet";

const CODE = /^[A-Za-z0-9-]{3,24}$/;

/** Share a working code with other shoppers. Starts unverified; earns points. */
export function ShareCode({ open, onOpenChange, retailers }: { open: boolean; onOpenChange: (v: boolean) => void; retailers: { id: string; name: string }[] }) {
  const [f, setF] = useState({ store: "", code: "", title: "", pct: "" });
  const valid = f.store.trim() && CODE.test(f.code.trim());
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Share a code"
      description="Help other shoppers save. Codes show as unverified until people confirm they work. You earn 10 points."
      footer={
        <Button
          disabled={!valid}
          onClick={() => {
            actions.submitCode({ retailerName: f.store, code: f.code, title: f.title, discountPct: f.pct ? Number(f.pct) : null, endsAt: null });
            setF({ store: "", code: "", title: "", pct: "" });
            onOpenChange(false);
          }}
        >
          Share Code
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Store" htmlFor="sc-store">
          <Input id="sc-store" list="sc-stores" value={f.store} onChange={(e) => setF({ ...f, store: e.target.value })} autoComplete="off" />
          <datalist id="sc-stores">
            {retailers.map((r) => (
              <option key={r.id} value={r.name} />
            ))}
          </datalist>
        </Field>
        <Field label="Code" htmlFor="sc-code" hint={f.code && !CODE.test(f.code.trim()) ? "Letters, numbers and dashes only." : undefined}>
          <Input id="sc-code" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="What it gets you (optional)" htmlFor="sc-title">
          <Input id="sc-title" placeholder="e.g. 20% off full-price items" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
        </Field>
        <Field label="Percent off (optional)" htmlFor="sc-pct">
          <Input id="sc-pct" inputMode="numeric" value={f.pct} onChange={(e) => setF({ ...f, pct: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) })} />
        </Field>
      </div>
    </Sheet>
  );
}
