"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Tag } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { PromoCard } from "@/components/orbit/promo-card";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { money } from "@/lib/domain/format";
import { daysBetween } from "@/lib/domain/dates";
import { activeWishes, matchesWish } from "@/lib/intelligence/discover";
import { creditAt, retailerOf } from "@/lib/store/selectors";
import { useOrbit } from "@/lib/store/store";

function PromoDetail() {
  const id = useSearchParams().get("id");
  const o = useOrbit();
  if (!o) return <Shell loading />;
  const p = o.data.promotions.find((x) => x.id === id);
  if (!p)
    return (
      <Shell>
        <BackBar fallback="/" />
        <EmptyState icon={<Tag aria-hidden />} title="This sale isn't available" action={<ButtonLink href="/">Back to Discover</ButtonLink>} />
      </Shell>
    );
  const { data, today } = o;
  const retailer = retailerOf(data, p.retailerId);
  const credit = creditAt(data, p.retailerId, today);
  const cards = data.wallet.filter((w) => w.retailerId === p.retailerId && (w.balance ?? 0) > 0);
  const wishes = activeWishes(data, today).filter((w) => matchesWish(p, w));
  const item = { promo: p, retailer, favorite: data.shopping.favoriteRetailerIds.includes(p.retailerId), wishes, credit, endsIn: p.endsAt ? daysBetween(today, p.endsAt) : null, reasons: [], score: 0 };

  return (
    <Shell>
      <BackBar fallback="/" title={retailer.name} />
      <div className="pt-2">
        <PromoCard item={item} />
      </div>
      {cards.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[17px] font-semibold">Use what you already have</h2>
          <Card className="divide-y divide-line">
            {cards.map((w) => (
              <Link key={w.id} href={`/wallet/card/?id=${w.id}`} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-ivory-deep">
                <span className="flex-1">
                  <span className="block font-semibold">{money(w.balance)} {w.type === "return_credit" ? "store credit" : w.type === "promotional_credit" ? "promo credit" : "gift card"}</span>
                  <span className="block text-[14px] text-muted">{w.balanceStatus.kind === "verified" ? "Balance verified" : "Last known balance"}</span>
                </span>
                <ChevronRight aria-hidden className="size-5 text-muted/60" />
              </Link>
            ))}
          </Card>
        </section>
      )}
      {wishes.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-[17px] font-semibold">Matches your wishlist</h2>
          <Card className="divide-y divide-line">
            {wishes.map((w) => (
              <Link key={w.id} href="/wishlist/" className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-ivory-deep">
                <span className="flex-1 font-semibold">{w.text}</span>
                <ChevronRight aria-hidden className="size-5 text-muted/60" />
              </Link>
            ))}
          </Card>
        </section>
      )}
      <p className="mt-6 px-1 text-[13px] text-muted">
        {p.source === "email" ? `Found in a promotional email from ${retailer.name}.` : p.source === "community" ? "Shared by shoppers. Check the code works before you rely on it." : "From a retailer partner."} Prices and terms are set by the store.
      </p>
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading />}>
      <PromoDetail />
    </Suspense>
  );
}
