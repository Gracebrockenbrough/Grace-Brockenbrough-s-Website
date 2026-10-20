import { BadgeCheck, Box, Clock, CreditCard, MapPin, Printer, Receipt } from "lucide-react";
import type { ReactNode } from "react";
import { dropOffLabel, money } from "@/lib/domain/format";
import type { ReturnFacts } from "@/lib/intelligence/returns";

function Fact({ icon, children, unknown }: { icon: ReactNode; children: ReactNode; unknown?: boolean }) {
  return (
    <li className="flex gap-3 py-2.5">
      <span className="mt-0.5 text-muted [&_svg]:size-5">{icon}</span>
      <span className={unknown ? "text-sand-ink" : undefined}>{children}</span>
    </li>
  );
}

/** Plain-language answers to "what do I need to do?" Unknowns are said out loud. */
export function ReturnFactsList({ facts, retailerName }: { facts: ReturnFacts; retailerName: string }) {
  const f = facts;
  return (
    <ul className="divide-y divide-line text-[16px]">
      <Fact icon={<Box aria-hidden />} unknown={f.boxRequired == null}>
        {f.boxRequired == null ? "Box requirement not confirmed. Have one ready to be safe" : f.boxRequired ? "Pack it in a box or mailer" : "No box needed"}
      </Fact>
      <Fact icon={<Printer aria-hidden />} unknown={f.printingRequired == null && f.qrCodeAvailable == null}>
        {f.qrCodeAvailable
          ? "No printer needed. You'll get a QR code"
          : f.printingRequired
            ? "You'll need to print a label"
            : f.printingRequired === false
              ? "No printing needed"
              : "Printing requirement not confirmed"}
      </Fact>
      <Fact icon={<MapPin aria-hidden />}>
        {f.dropOff.length ? `Drop off at ${f.dropOff.map((d) => (d === "store" ? `a ${retailerName} store` : dropOffLabel[d])).join(" or ")}` : "Drop-off options not confirmed"}
      </Fact>
      <Fact icon={<Receipt aria-hidden />} unknown={f.fee == null}>
        {f.fee == null ? "Return fee not confirmed" : f.fee === 0 ? "No return fee" : `${money(f.fee)} return fee, deducted from your refund`}
      </Fact>
      <Fact icon={<CreditCard aria-hidden />} unknown={!f.refundTo}>
        {f.refundTo === "store_credit"
          ? `Refund as ${retailerName} store credit`
          : f.refundTo === "original_payment"
            ? "Refund to your original payment method"
            : f.refundTo === "exchange"
              ? "Exchange for another item"
              : "Refund method not confirmed"}
      </Fact>
      <Fact icon={<BadgeCheck aria-hidden />} unknown={f.approvalRequired == null}>
        {f.approvalRequired == null
          ? "Not confirmed whether approval is needed"
          : f.approvalRequired
            ? `${retailerName} must approve before you get a label`
            : `No approval needed from ${retailerName}`}
      </Fact>
      {f.refundTimelineDays != null && (
        <Fact icon={<Clock aria-hidden />}>Refunds usually arrive within {f.refundTimelineDays} days after {retailerName} receives it</Fact>
      )}
    </ul>
  );
}
