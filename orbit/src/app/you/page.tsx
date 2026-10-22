"use client";

import Link from "next/link";
import { useState } from "react";
import { ChartNoAxesColumn, ChevronRight, Eye, EyeOff, Inbox, Lock, Plus, Settings, ShieldCheck } from "lucide-react";
import { toast } from "@/components/ui/toast";
import { itemKind } from "@/lib/intelligence/buckets";
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

const nextVis: Record<Visibility, Visibility> = { private: "public", friends: "private", public: "private" };
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
 * You: a personal style profile first, private tools second. "Preview public profile"
 * shows exactly what others could see: public stores and lists, never money or orders.
 */
export default function YouPage() {
  const o = useOrbit();
  const [edit, setEdit] = useState(false);
  const [asFriend, setAsFriend] = useState(false);
  const [newList, setNewList] = useState(false);
  const [listTitle, setListTitle] = useState("");
  const [listPublic, setListPublic] = useState(false);
  const [form, setForm] = useState({ name: "", bio: "", tags: "", palette: "orchid" as Palette });
  if (!o) return <Shell loading />;
  const { data, profile } = o;
  const pub = data.publicProfile ?? { displayName: profile.firstName, bio: null };
  const palette = (pub.palette ?? "orchid") as Palette;
  const shown = (v: Visibility) => !asFriend || v !== "private";
  const favs = (data.favoriteStores ?? []).filter((f) => shown(f.visibility));
  // Your own lists, plus others' lists you saved (those stay in your view only).
  const cols = (data.collections ?? []).filter((c) => (!c.ownerId && shown(c.visibility)) || (!asFriend && c.ownerId && c.saved));
  const authors = data.authors ?? [];
  const conns = data.connections.filter((c) => c.status !== "disconnected");
  const problems = connectionProblems(data);

  return (
    <div className="min-h-dvh">
      <Shell>
        <TabBanner
          tab="you"
          title="Your style, your space"
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
            {asFriend ? "Back to my view" : "Preview public profile"}
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
            {plural(favs.length, "favorite store")} · {plural(cols.filter((c) => !c.ownerId).length, "list")}
          </p>
        </section>

        {asFriend && (
          <p className="mt-4 rounded-[18px] bg-you-soft px-4 py-3 text-[14px] font-medium text-you">
            Only public stores and lists are shown. Orders, returns, money and email never are.
          </p>
        )}

        {/* Favorite boutiques */}
        <section id="favorites" className="mt-8 scroll-mt-16">
          <Heading action={!asFriend && <Link href="/discover/" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-you">Find stores</Link>}>Favorite boutiques</Heading>
          {favs.length === 0 ? (
            <p className="rounded-[18px] bg-card px-4 py-3.5 text-[15px] text-muted shadow-[var(--shadow-card)]">{asFriend ? "No public stores." : "Tap the heart on a store in Discover."}</p>
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
          <Heading action={!asFriend && <button type="button" onClick={() => setNewList(true)} className="inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold text-you"><Plus aria-hidden className="size-4" /> New list</button>}>My lists</Heading>
          {cols.length === 0 && asFriend ? (
            <p className="rounded-[18px] bg-card px-4 py-3.5 text-[15px] text-muted shadow-[var(--shadow-card)]">{asFriend ? "No public lists." : "Start a list of things you love."}</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-4">
              {!asFriend && (
                <CollectionTile
                  c={{ id: "saved", title: "Saved for Later", visibility: "private", palette: "apricot", createdAt: "", items: data.wishlist.filter((w) => w.status === "active").map((w) => ({ id: w.id, name: w.text, kind: itemKind({ name: `${w.text} ${w.tags.join(" ")}`, category: w.tags.some((t) => /sneaker|boot|shoe|heel/.test(t)) ? "shoes" : "clothing" }), image: w.image, url: w.url, retailerId: w.retailerId, addedAt: w.addedAt })) }}
                  href="/saved/"
                />
              )}
              {cols.map((c) => (
                <CollectionTile key={c.id} c={c} href={`/discover/list/?id=${c.id}`} owner={authors.find((a) => a.id === c.ownerId) ?? null} />
              ))}
            </div>
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
          open={newList}
          onOpenChange={setNewList}
          title="New list"
          footer={
            <Button
              disabled={!listTitle.trim()}
              onClick={() => {
                actions.createCollection(listTitle, listPublic ? "public" : "private");
                toast(`${listTitle.trim()} created`, listPublic ? "Public. You can share it." : "Private. Only you can see it.");
                setListTitle("");
                setNewList(false);
              }}
            >
              Create List
            </Button>
          }
        >
          <div className="space-y-4">
            <Field label="Name" htmlFor="list-title">
              <Input id="list-title" value={listTitle} maxLength={40} onChange={(e) => setListTitle(e.target.value)} placeholder="e.g. Summer trip" />
            </Field>
            <div role="radiogroup" aria-label="Who can see it" className="grid grid-cols-2 gap-2">
              {[false, true].map((pub2) => (
                <button key={String(pub2)} type="button" role="radio" aria-checked={listPublic === pub2} onClick={() => setListPublic(pub2)} className={cn("min-h-11 rounded-full border text-[15px] font-semibold", listPublic === pub2 ? "border-navy bg-navy text-white" : "border-line bg-card")}>
                  {pub2 ? "Public" : "Private"}
                </button>
              ))}
            </div>
          </div>
        </Sheet>

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
