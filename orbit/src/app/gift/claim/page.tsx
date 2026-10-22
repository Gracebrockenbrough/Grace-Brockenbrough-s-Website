"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Gift } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { OrbitWordmark } from "@/components/layout/logo";
import { tones } from "@/components/orbit/retail";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Notice, Tag } from "@/components/ui/notice";
import { EmptyState } from "@/components/ui/states";
import { money } from "@/lib/domain/format";
import { retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

function Claim() {
  const id = useSearchParams().get("id");
  const o = useOrbit();
  if (!o) return <Shell loading nav={false} />;
  const gift = o.data.gifts.find((g) => g.id === id);

  if (!gift)
    return (
      <Shell nav={false}>
        <div className="flex h-16 items-center"><OrbitWordmark /></div>
        <EmptyState icon={<Gift aria-hidden />} title="This gift link isn't valid" action={<ButtonLink href="/">Go to Penny</ButtonLink>}>
          It may have expired, or it was created on another device in this demo.
        </EmptyState>
      </Shell>
    );

  const retailer = retailerOf(o.data, gift.retailerId);
  const t = tones[retailer.tone];
  const walletId = `w-${gift.id}`;
  const claimed = gift.status === "claimed" && o.data.wallet.some((w) => w.id === walletId);

  return (
    <Shell nav={false}>
      <div className="flex h-16 items-center justify-between">
        <OrbitWordmark />
        <Tag>Demo gift</Tag>
      </div>

      <section className="animate-in pt-6 text-center">
        <p className="text-[16px] text-muted">{gift.senderName} sent you a gift</p>
        <div className={cn("animate-reveal relative mx-auto mt-5 aspect-[1.586] w-full max-w-[360px] overflow-hidden rounded-[22px] p-5 text-left shadow-[var(--shadow-lift)]", t.face, t.ink)}>
          <div className="flex h-full flex-col justify-between">
            <p className="text-[20px] font-semibold">{retailer.name}</p>
            <div>
              <p className="text-[14px] opacity-80">Gift card</p>
              <p className="tabular text-[34px] font-semibold tracking-[-0.02em]">{money(gift.amount)}</p>
            </div>
          </div>
        </div>
        {gift.message && <p className="mx-auto mt-6 max-w-[320px] text-[18px] leading-snug">“{gift.message}”</p>}
        <p className="mt-2 text-[15px] text-muted">From {gift.senderName}</p>
      </section>

      <div className="mt-8 space-y-3">
        {claimed ? (
          <>
            <Notice tone="success" title="Added to your Wallet">
              Your {retailer.name} gift card is saved with its code, ready when you shop.
            </Notice>
            <ButtonLink href={`/wallet/card/?id=${walletId}`}>Open in Wallet</ButtonLink>
          </>
        ) : (
          <>
            <Button onClick={() => actions.claimGift(gift.id)}>Add to Penny Wallet</Button>
            <p className="text-center text-[14px] text-muted">Demo: claiming adds this fictional card to the wallet in this browser.</p>
          </>
        )}
      </div>
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading nav={false} />}>
      <Claim />
    </Suspense>
  );
}
