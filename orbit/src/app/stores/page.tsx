"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight, Lock, Share2, Store } from "lucide-react";
import { BackBar, Shell } from "@/components/layout/shell";
import { RetailerMark } from "@/components/orbit/retail";
import { SaveStoreButton } from "@/components/orbit/save-store";
import { ButtonLink, ExternalButton, TextLink } from "@/components/ui/button";
import { Card, Row, Rows } from "@/components/ui/card";
import { Disclosure } from "@/components/ui/disclosure";
import { Tag } from "@/components/ui/notice";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/states";
import { formatDate } from "@/lib/domain/dates";
import { money, plural } from "@/lib/domain/format";
import { beforeYouBuy, storeCategoryLabel } from "@/lib/retailers/storeFacts";
import { creditAt, policyOf, retailerOf } from "@/lib/store/selectors";
import { useOrbit } from "@/lib/store/store";


/**
 * Store Profile: what buying from a store is actually like. Official policy facts and
 * community experience are kept visibly separate, and neither is invented.
 */
function StoreProfile() {
  const id = useSearchParams().get("id");
  const o = useOrbit();
  if (!o) return <Shell loading nav={false} />;
  const exists = o.data.retailers.some((r) => r.id === id);
  if (!id || !exists)
    return (
      <Shell nav={false}>
        <BackBar fallback="/discover/" />
        <EmptyState icon={<Store aria-hidden />} title="Store not found" action={<ButtonLink href="/discover/">Back to Discover</ButtonLink>} />
      </Shell>
    );

  const r = retailerOf(o.data, id);
  const policy = policyOf(o.data, id);
  const facts = beforeYouBuy(policy);
  const saved = (o.data.favoriteStores ?? []).some((f) => f.retailerId === id);
  const credit = creditAt(o.data, id, o.today);
  const orders = o.data.orders.filter((x) => x.retailerId === id).length;
  const card = o.data.wallet.find((w) => w.retailerId === id && (w.balance ?? 0) > 0);
  const onLists = (o.data.collections ?? []).filter((c) => (c.ownerId ? c.visibility !== "private" : true) && c.items.some((i) => i.retailerId === id));

  const share = async () => {
    const text = r.name;
    try {
      if (navigator.share) await navigator.share({ title: text, url: r.websiteUrl });
      else {
        await navigator.clipboard.writeText(r.websiteUrl);
        toast("Link copied", "Share it wherever you like.");
      }
    } catch {
      // Share sheet dismissed.
    }
  };

  return (
    <Shell nav={false}>
      <BackBar fallback="/discover/" title={r.name} />

      {/* 1. Store header */}
      <header className="flex items-center gap-4 pb-4 pt-2">
        <RetailerMark retailer={r} className="size-16 rounded-[20px] text-[18px]" />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[30px] leading-tight">{r.name}</h1>
          <p className="text-[15px] text-muted">{storeCategoryLabel[r.category]}</p>
        </div>
      </header>
      <div className="flex gap-2">
        <ExternalButton href={r.websiteUrl} size="md" className="flex-1">
          Visit Store
        </ExternalButton>
        <SaveStoreButton retailerId={r.id} name={r.name} saved={saved} size="lg" />
        <button type="button" onClick={share} aria-label={`Share ${r.name}`} className="inline-flex size-11 items-center justify-center rounded-full border border-line bg-card hover:bg-ivory-deep">
          <Share2 aria-hidden className="size-5" />
        </button>
      </div>

      {/* Private context, only for this customer */}
      {(credit > 0 || orders > 0) && (
        <Card className="mt-4 divide-y divide-line overflow-hidden">
          {card && (
            <Link href={`/wallet/card/?id=${card.id}`} className="flex min-h-14 items-center gap-3 bg-wallet-soft/60 px-4 py-3 hover:bg-wallet-soft">
              <span className="flex-1 text-[15px]">
                <span className="font-semibold text-wallet">You have {money(credit)} here</span> <span className="text-muted">· recorded credit</span>
              </span>
              <ChevronRight aria-hidden className="size-5 text-muted/60" />
            </Link>
          )}
          {orders > 0 && (
            <p className="flex items-center gap-2 px-4 py-3 text-[14px] text-muted">
              <Lock aria-hidden className="size-4 shrink-0" /> {plural(orders, "purchase")} from {r.name} in your Returns. Only you can see this.
            </p>
          )}
        </Card>
      )}

      {/* 2. Before You Buy: official policy only */}
      <section aria-labelledby="byb" className="mt-6 rounded-[22px] bg-returns-soft p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="byb" className="text-[17px] font-semibold text-returns">
            Before you buy
          </h2>
          {policy && <Tag tone={policy.verification === "verified" ? "success" : "warning"}>{policy.verification === "verified" ? "Verified" : "Sample, not verified"}</Tag>}
        </div>
        {!policy ? (
          <p className="mt-2 text-[15px]">We don&apos;t have {r.name}&apos;s return policy yet, so we won&apos;t guess. Check their site before you buy.</p>
        ) : (
          <>
            <Rows className="mt-1">
              {facts.slice(0, 4).map((f) => (
                <Row key={f.label} label={f.label}>
                  <span className={f.known ? undefined : "font-normal text-sand-ink"}>{f.value}</span>
                </Row>
              ))}
            </Rows>
            <Card className="mt-3 overflow-hidden">
              <Disclosure title="Full return policy" summary={`Last checked ${formatDate(policy.lastCheckedAt, o.today)}`}>
                <Rows>
                  {facts.slice(4).map((f) => (
                    <Row key={f.label} label={f.label}>
                      <span className={f.known ? undefined : "font-normal text-sand-ink"}>{f.value}</span>
                    </Row>
                  ))}
                  <Row label="Region">United States</Row>
                  <Row label="Policy version">{policy.version}</Row>
                </Rows>
                {policy.exceptions.length > 0 && (
                  <ul className="mt-2 space-y-1 text-[14px] text-muted">
                    {policy.exceptions.map((e) => (
                      <li key={e.description}>• {e.description}</li>
                    ))}
                  </ul>
                )}
                <TextLink href={policy.sourceUrl} external className="mt-2">
                  Official policy on {r.name}&apos;s site
                </TextLink>
              </Disclosure>
            </Card>
          </>
        )}
      </section>

      {/* Lists from friends that include this store */}
      {onLists.length > 0 && (
        <section className="mt-7" aria-label="On lists">
          <h2 className="font-display mb-3 text-[22px] leading-none">On lists</h2>
          <ul className="space-y-2">
            {onLists.map((c) => (
              <li key={c.id}>
                <Link href={`/discover/list/?id=${c.id}`} className="flex min-h-14 items-center gap-3 rounded-[18px] bg-card px-4 py-2.5 shadow-[var(--shadow-card)]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{c.title}</span>
                    <span className="block text-[13px] text-muted">{(o.data.authors ?? []).find((x) => x.id === c.ownerId)?.name ?? "You"}</span>
                  </span>
                  <ChevronRight aria-hidden className="size-4 text-muted/60" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Shell loading nav={false} />}>
      <StoreProfile />
    </Suspense>
  );
}
