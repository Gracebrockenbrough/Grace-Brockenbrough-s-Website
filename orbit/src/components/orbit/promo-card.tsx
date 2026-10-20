"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Copy, EyeOff, Heart, Star, ThumbsDown, ThumbsUp, WalletCards } from "lucide-react";
import { money } from "@/lib/domain/format";
import { codeTrust, type FeedItem } from "@/lib/intelligence/discover";
import { actions } from "@/lib/store/store";
import { cn } from "../ui/cn";
import { RetailerMark } from "./retail";

function endsText(n: number | null) {
  if (n == null) return "No end date";
  if (n === 0) return "Ends today";
  if (n === 1) return "Ends tomorrow";
  return `Ends in ${n} days`;
}

/** One sale. Says why it's here, shows any code and your credit at the store, and links out. */
export function PromoCard({ item, compact = false }: { item: FeedItem; compact?: boolean }) {
  const { promo: p, retailer } = item;
  const [copied, setCopied] = useState(false);
  const [voted, setVoted] = useState(false);
  const trust = p.code ? codeTrust(p) : null;

  return (
    <article className="animate-in rounded-[20px] border border-line bg-card shadow-[var(--shadow-card)]">
      <Link href={`/promo/?id=${p.id}`} className="block rounded-t-[20px] px-4 pb-3 pt-4 hover:bg-ivory/60">
        <div className="flex items-start gap-3">
          <RetailerMark retailer={retailer} className="size-10 rounded-xl text-[13px]" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[14px] font-semibold text-muted">
              {retailer.name}
              {item.favorite && <Star aria-label="Favorite brand" className="size-3.5 fill-current text-terracotta" />}
              {p.sponsored && <span className="rounded-full border border-line px-2 text-[11px] font-semibold uppercase tracking-wide">Sponsored</span>}
            </p>
            <h3 className="text-[17px] font-semibold leading-snug">{p.title}</h3>
            {p.detail && !compact && <p className="text-[14px] text-muted">{p.detail}</p>}
          </div>
          {p.discountPct != null && (
            <span className="tabular shrink-0 rounded-xl bg-terracotta-soft px-2.5 py-1.5 text-center text-[18px] font-semibold leading-none text-terracotta">
              {p.discountPct}%<span className="block text-[11px] font-semibold">off</span>
            </span>
          )}
        </div>

        {(item.wishes.length > 0 || item.credit > 0) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.wishes.slice(0, 1).map((w) => (
              <span key={w.id} className="inline-flex items-center gap-1 rounded-full bg-terracotta-soft px-2.5 py-1 text-[13px] font-semibold text-terracotta">
                <Heart aria-hidden className="size-3.5" /> On your wishlist: {w.text}
              </span>
            ))}
            {item.credit > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sage px-2.5 py-1 text-[13px] font-semibold text-sage-ink">
                <WalletCards aria-hidden className="size-3.5" /> You have {money(item.credit)} here
              </span>
            )}
          </div>
        )}
      </Link>

      {p.code && (
        <div className="mx-4 mb-3 rounded-2xl border border-dashed border-line bg-ivory px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="tabular flex-1 truncate text-[16px] font-semibold tracking-[0.06em]">{p.code}</span>
            <button
              type="button"
              aria-label={`Copy code ${p.code}`}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(p.code!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                } catch {
                  // Clipboard blocked; the code is visible to copy by hand.
                }
              }}
              className="inline-flex h-10 items-center gap-1 rounded-full bg-card px-3 text-[14px] font-semibold shadow-[var(--shadow-card)]"
            >
              {copied ? <Check aria-hidden className="size-4 text-sage-ink" /> : <Copy aria-hidden className="size-4" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
            <span className={cn("text-[13px] font-medium", trust?.tone === "verified" ? "text-sage-ink" : trust?.tone === "mixed" ? "text-sand-ink" : "text-muted")}>
              {p.source === "community" ? "Shared by shoppers · " : ""}
              {trust?.label}
            </span>
            {voted ? (
              <span className="text-[13px] font-semibold text-sage-ink">Thanks! +5 points</span>
            ) : (
              <span className="flex items-center gap-1 text-[13px] text-muted">
                Worked for you?
                <button type="button" aria-label="Code worked" onClick={() => { actions.voteCode(p.id, true); setVoted(true); }} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-card">
                  <ThumbsUp aria-hidden className="size-4" />
                </button>
                <button type="button" aria-label="Code didn't work" onClick={() => { actions.voteCode(p.id, false); setVoted(true); }} className="inline-flex size-9 items-center justify-center rounded-full hover:bg-card">
                  <ThumbsDown aria-hidden className="size-4" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-line/70 px-2 py-1">
        <span className={cn("flex-1 pl-2 text-[13px] font-medium", item.endsIn != null && item.endsIn <= 2 ? "text-terracotta" : "text-muted")}>{endsText(item.endsIn)}</span>
        <button
          type="button"
          onClick={() => actions.hidePromotion(p.id)}
          aria-label={`Hide this ${retailer.name} sale`}
          className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 text-[13px] font-semibold text-muted hover:bg-ivory-deep"
        >
          <EyeOff aria-hidden className="size-4" /> Hide
        </button>
        {p.url && (
          <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 rounded-full bg-navy px-4 text-[14px] font-semibold text-white hover:bg-navy-soft">
            Shop {retailer.name}
            <ArrowUpRight aria-hidden className="size-4" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
      {(p.affiliate || p.sponsored) && !compact && (
        <p className="px-4 pb-3 text-[12px] text-muted">{p.sponsored ? "Paid placement by the retailer. " : ""}{p.affiliate ? "Tote may earn a commission if you buy." : ""}</p>
      )}
    </article>
  );
}
