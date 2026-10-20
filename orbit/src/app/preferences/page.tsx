"use client";

import { BackBar, Shell } from "@/components/layout/shell";
import { BrandPicker, CategoryPicker, DiscountPicker, SponsoredToggle } from "@/components/orbit/prefs-editor";
import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { actions, useOrbit } from "@/lib/store/store";

export default function PreferencesPage() {
  const o = useOrbit();
  if (!o) return <Shell loading nav={false} />;
  const prefs = o.data.shopping;
  const hiddenSales = prefs.hiddenPromotionIds.length;
  return (
    <Shell nav={false}>
      <BackBar fallback="/" title="Shopping preferences" />
      <p className="pt-1 text-[16px] text-muted">These shape your Discover feed. Change them any time.</p>

      <section className="mt-6">
        <SectionTitle>Brands</SectionTitle>
        <p className="-mt-2 mb-3 text-[14px] text-muted">Star favorites to see their sales first. Hide brands you don&apos;t want to hear about.</p>
        <BrandPicker data={o.data} />
      </section>

      <section className="mt-8">
        <SectionTitle>What you shop for</SectionTitle>
        <CategoryPicker prefs={prefs} />
      </section>

      <section className="mt-8">
        <SectionTitle>Minimum discount</SectionTitle>
        <DiscountPicker prefs={prefs} />
        <p className="mt-2 text-[14px] text-muted">Sales with a code always show, so you can decide.</p>
      </section>

      <section className="mt-8">
        <SectionTitle>Sponsored</SectionTitle>
        <Card className="px-4">
          <SponsoredToggle prefs={prefs} />
        </Card>
      </section>

      {hiddenSales > 0 && (
        <Button variant="secondary" size="md" className="mt-6 w-full" onClick={() => actions.setShopping({ hiddenPromotionIds: [] })}>
          Show {hiddenSales} hidden {hiddenSales === 1 ? "sale" : "sales"} again
        </Button>
      )}
    </Shell>
  );
}
