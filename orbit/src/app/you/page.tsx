"use client";

import Link from "next/link";
import { useState } from "react";
import { ChartNoAxesColumn, ChevronRight, Eye, EyeOff, Inbox, Lock, MessageSquareQuote, Settings, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { type Palette } from "@/components/orbit/art";
import { TabBanner } from "@/components/layout/tab-banner";
import { CollectionTile, visibilityLabel } from "@/components/orbit/circle";
import { RetailerMark } from "@/components/orbit/retail";
import { Button, IconLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { plural } from "@/lib/domain/format";
import type { Visibility } from "@/lib/domain/types";
import { connectionProblems, retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

const nextVis: Record<Visibility, Visibility> = { private: "friends", friends: "public", public: "private" };
const PALETTES: Palette[] = ["orchid", "apricot", "rose", "sage", "sky", "ink"];
const SWATCH: Record<Palette, string> = { orchid: "#7948AF", apricot: "#A05B16", rose: "#E58FAA", sage: "#28794E", sky: "#2E5C9E", ink: "#25213C" };

function Heading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="font-display text-[24px] leading-none">{children}</h2>
      {action}
    </div>
  );
}

function NavRow({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: React.ReactNode; body: string }) {
  return (
    <Link href={href} className="flex min-h-14 items-center gap-3 px-4 py-2.5 hover:bg-ivory-deep">
      <span className="text-you [&_svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="block truncate text-[13px] text-muted">{body}</span>
      </span>
      <ChevronRight aria-hidden className="size-4 text-muted/60" />
    </Link>
  );
}

/**
 * You: a personal style profile first, private tools second. "View as a friend" shows
 * exactly what friends would see: only things deliberately shared, never money or orders.
 */
export default function YouPage() {
  const o = useOrbit();
  const [edit, setEdit] = useState(false);
  const [asFriend, setAsFriend] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", tags: "", palette: "orchid" as Palette });
  if (!o) return <Shell loading />;
  const { data, profile } = o;
  const pub = data.publicProfile ?? { displayName: profile.firstName, bio: null };
  const palette = (pub.palette ?? "orchid") as Palette;
  const shown = (v: Visibility) => !asFriend || v !== "private";
  const favs = (data.favoriteStores ?? []).filter((f) => shown(f.visibility));
  const cols = (data.collections ?? []).filter((c) => shown(c.visibility));
  const reviews = (data.posts ?? []).filter((p) => p.authorId === "me" && (p.type === "review" || p.type === "store_favorite") && shown(p.audience));
  const myPosts = (data.posts ?? []).filter((p) => p.authorId === "me" && shown(p.audience)).length;
  const conns = data.connections.filter((c) => c.status !== "disconnected");
  const problems = connectionProblems(data);

  return (
    <div className="min-h-dvh">
      <Shell>
        <TabBanner
          tab="you"
          title="Your style, your space"
          subtitle="Saved items, favorite stores, and a little more you."
          right={
            <IconLink href="/settings/" label="Settings" className="-mr-2">
              <Settings aria-hidden className="size-5" />
            </IconLink>
          }
        />
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            aria-pressed={asFriend}
            onClick={() => setAsFriend(!asFriend)}
            className={cn("inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold", asFriend ? "bg-you text-white" : "bg-white/70 text-you")}
          >
            {asFriend ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
            {asFriend ? "Back to my view" : "View as a friend"}
          </button>
        </div>

        {/* Style banner + identity */}
        <section className="mt-4">
          <div className="flex items-end gap-3">
            <span className="font-display flex size-16 shrink-0 items-center justify-center rounded-full bg-you-soft text-[28px] text-you ring-1 ring-you/30">{pub.displayName[0]}</span>
            {!asFriend && (
              <Button
                variant="secondary"
                size="sm"
                className="relative z-10 mb-1 ml-auto"
                onClick={() => {
                  setForm({ name: pub.displayName, bio: pub.bio ?? "", tags: (pub.styleTags ?? []).join(", "), palette });
                  setEdit(true);
                }}
              >
                Edit Profile
              </Button>
            )}
          </div>
          <p className="font-display mt-2 text-[30px] leading-none">{pub.displayName}</p>
          {pub.bio && <p className="mt-1.5 text-[16px]">{pub.bio}</p>}
          {(pub.styleTags ?? []).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {pub.styleTags!.map((t) => (
                <span key={t} className="rounded-full border border-navy/25 px-3 py-1 text-[13px] font-semibold">
                  {t}
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 text-[14px] text-muted">
            {plural(favs.length, "favorite store")} · {plural(cols.length, "collection")} · {plural(myPosts, "post")}
          </p>
        </section>

        {asFriend && (
          <p className="mt-4 rounded-[18px] bg-you-soft px-4 py-3 text-[14px] font-medium text-you">
            This is what friends see. Purchases, returns, refunds, balances, email and spending are never shown.
          </p>
        )}

        {/* Favorite boutiques */}
        <section id="favorites" className="mt-8 scroll-mt-16">
          <Heading action={!asFriend && <Link href="/circle/" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-you">Find stores</Link>}>Favorite boutiques</Heading>
          {favs.length === 0 ? (
            <p className="rounded-[18px] bg-card px-4 py-3.5 text-[15px] text-muted shadow-[var(--shadow-card)]">{asFriend ? "Nothing shared yet." : "Tap the heart on a store in Circle to save it here."}</p>
          ) : (
            <div className="-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
              {favs.map((f) => {
                const r = retailerOf(data, f.retailerId);
                return (
                  <div key={f.retailerId} className="w-[124px] shrink-0 rounded-[20px] bg-card p-3 shadow-[var(--shadow-card)]">
                    <Link href={`/stores/?id=${r.id}`} className="block">
                      <RetailerMark retailer={r} className="size-11 rounded-2xl text-[14px]" />
                      <span className="mt-2 block truncate font-bold">{r.name}</span>
                    </Link>
                    {!asFriend && (
                      <button
                        type="button"
                        onClick={() => actions.setFavoriteVisibility(f.retailerId, nextVis[f.visibility])}
                        aria-label={`${r.name} is visible to: ${visibilityLabel[f.visibility]}. Change`}
                        className="mt-0.5 inline-flex min-h-9 items-center gap-1 text-[12px] font-semibold text-muted hover:text-navy"
                      >
                        {f.visibility === "private" && <Lock aria-hidden className="size-3" />}
                        {visibilityLabel[f.visibility]}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Collections */}
        <section className="mt-8">
          <Heading action={<Link href="/circle/" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-you">All lists</Link>}>My collections</Heading>
          {cols.length === 0 ? (
            <p className="rounded-[18px] bg-card px-4 py-3.5 text-[15px] text-muted shadow-[var(--shadow-card)]">{asFriend ? "No shared collections." : "Make one in Circle → Lists."}</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {cols.slice(0, 4).map((c) => (
                <CollectionTile key={c.id} c={c} href={`/circle/list/?id=${c.id}`} />
              ))}
            </div>
          )}
        </section>

        {/* Reviews */}
        <section className="mt-8">
          <Heading>My reviews</Heading>
          {reviews.length === 0 ? (
            <Card className="flex items-center gap-3 p-4">
              <MessageSquareQuote aria-hidden className="size-5 shrink-0 text-you" />
              <p className="text-[15px] text-muted">{asFriend ? "No shared reviews." : "Reviews you choose to write show here. Tote never writes one for you, even after a return."}</p>
            </Card>
          ) : (
            <ul className="space-y-2">
              {reviews.map((p) => (
                <li key={p.id} className="rounded-[18px] bg-card px-4 py-3 shadow-[var(--shadow-card)]">
                  <p className="text-[13px] font-semibold text-muted">
                    {p.retailerIds.map((id) => retailerOf(data, id).name).join(", ")} · {visibilityLabel[p.audience]}
                  </p>
                  <p className="text-[15px]">“{p.caption}”</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Private tools: never shown to friends */}
        {!asFriend && (
          <Card className="mt-8 divide-y divide-line overflow-hidden">
            <NavRow
              href="/insights/"
              icon={<ChartNoAxesColumn aria-hidden />}
              title={
                <span className="inline-flex items-center gap-1.5">
                  Shopping Insights <Lock aria-hidden className="size-3.5 text-muted" />
                </span>
              }
              body="Private spending awareness"
            />
            <NavRow href="/settings/#email" icon={<Inbox aria-hidden />} title="Connected accounts" body={problems.length ? `${plural(problems.length, "inbox", "inboxes")} ${problems.length === 1 ? "needs" : "need"} attention` : `${plural(conns.length, "inbox", "inboxes")} connected`} />
            <NavRow href="/settings/#privacy" icon={<ShieldCheck aria-hidden />} title="Privacy & sharing" body="What's shared, import history, deletion" />
            <NavRow href="/settings/" icon={<Settings aria-hidden />} title="Settings" body="Notifications, preferences, data" />
          </Card>
        )}

        <Sheet
          open={edit}
          onOpenChange={setEdit}
          title="Edit profile"
          description="This is what friends see. Everything is optional except your name."
          footer={
            <Button
              disabled={!form.name.trim()}
              onClick={() => {
                actions.setPublicProfile({
                  displayName: form.name.trim(),
                  bio: form.bio.trim() || null,
                  palette: form.palette,
                  styleTags: form.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .slice(0, 4),
                });
                setEdit(false);
              }}
            >
              Save
            </Button>
          }
        >
          <div className="space-y-4">
            <Field label="Display name" htmlFor="pn">
              <Input id="pn" value={form.name} maxLength={40} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Bio" htmlFor="pb">
              <Textarea id="pb" className="min-h-20" value={form.bio} maxLength={140} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Vintage denim and good candles" />
            </Field>
            <Field label="Style words" htmlFor="pt" hint="Up to 4, separated by commas">
              <Input id="pt" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Minimal, Denim, Neutrals" />
            </Field>
            <div>
              <p className="mb-2 text-[15px] font-semibold">Banner color</p>
              <div className="flex gap-2">
                {PALETTES.map((p) => (
                  <button key={p} type="button" aria-label={p} aria-pressed={form.palette === p} onClick={() => setForm({ ...form, palette: p })} className={cn("size-11 rounded-full border-4", form.palette === p ? "border-navy" : "border-white")} style={{ background: SWATCH[p] }} />
                ))}
              </div>
            </div>
          </div>
        </Sheet>
      </Shell>
    </div>
  );
}
