"use client";

import Link from "next/link";
import { useState } from "react";
import { Bookmark, ChartNoAxesColumn, ChevronRight, Heart, Inbox, Lock, Settings, ShieldCheck } from "lucide-react";
import { Shell } from "@/components/layout/shell";
import { RetailerMark } from "@/components/orbit/retail";
import { Button, IconLink } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Sheet } from "@/components/ui/sheet";
import { plural } from "@/lib/domain/format";
import type { Visibility } from "@/lib/domain/types";
import { connectionProblems, retailerOf } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

const visLabel: Record<Visibility, string> = { private: "Only you", friends: "Friends", public: "Everyone" };
const nextVis: Record<Visibility, Visibility> = { private: "friends", friends: "public", public: "private" };

function Row({ href, icon, title, body, tint }: { href: string; icon: React.ReactNode; title: React.ReactNode; body: string; tint: string }) {
  return (
    <Link href={href} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-ivory-deep">
      <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5", tint)}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-semibold">{title}</span>
        <span className="block truncate text-[14px] text-muted">{body}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 text-muted/60" />
    </Link>
  );
}

/** You: the personal side of Tote. Fun on top, private by default underneath. */
export default function YouPage() {
  const o = useOrbit();
  const [edit, setEdit] = useState(false);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  if (!o) return <Shell loading />;
  const { data, profile } = o;
  const pub = data.publicProfile ?? { displayName: profile.firstName, bio: null };
  const favs = data.favoriteStores ?? [];
  const saved = data.wishlist.filter((w) => w.status === "active").length;
  const conns = data.connections.filter((c) => c.status !== "disconnected");
  const problems = connectionProblems(data);

  return (
    <Shell>
      <header className="flex items-start justify-between pb-2 pt-6">
        <span aria-hidden className="mb-3 block h-1 w-8 rounded-full bg-you" />
        <IconLink href="/settings/" label="Settings" className="-mr-2 -mt-2">
          <Settings aria-hidden className="size-[22px]" />
        </IconLink>
      </header>

      {/* Identity */}
      <section className="flex items-center gap-4">
        <span className="flex size-[72px] shrink-0 items-center justify-center rounded-full bg-you-soft font-display text-[30px] text-you">{pub.displayName[0]}</span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[30px] leading-tight">{pub.displayName}</h1>
          <p className="text-[15px] text-muted">{pub.bio ?? "Add a short bio, if you like."}</p>
        </div>
      </section>
      <Button
        variant="secondary"
        size="md"
        className="mt-4 w-full"
        onClick={() => {
          setName(pub.displayName);
          setBio(pub.bio ?? "");
          setEdit(true);
        }}
      >
        Edit Profile
      </Button>

      {/* Favorite stores */}
      <section id="favorites" className="mt-8 scroll-mt-16">
        <SectionTitle action={<Link href="/circle/" className="inline-flex min-h-11 items-center text-[14px] font-semibold text-circle">Find stores</Link>}>Favorite stores</SectionTitle>
        {favs.length === 0 ? (
          <Card className="flex items-center gap-3 p-4">
            <Heart aria-hidden className="size-5 text-muted" />
            <p className="text-[15px] text-muted">Tap the heart on a store in Circle to save it here.</p>
          </Card>
        ) : (
          <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
            {favs.map((f) => {
              const r = retailerOf(data, f.retailerId);
              return (
                <div key={f.retailerId} className="w-[132px] shrink-0 rounded-[20px] bg-card p-3 shadow-[var(--shadow-card)]">
                  <Link href={`/stores/?id=${r.id}`} className="block">
                    <RetailerMark retailer={r} className="size-12 rounded-2xl text-[15px]" />
                    <span className="mt-2 block truncate font-semibold">{r.name}</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => actions.setFavoriteVisibility(f.retailerId, nextVis[f.visibility])}
                    aria-label={`${r.name} is visible to: ${visLabel[f.visibility]}. Change`}
                    className="mt-1 inline-flex min-h-9 items-center gap-1 rounded-full text-[13px] font-semibold text-muted hover:text-navy"
                  >
                    {f.visibility === "private" && <Lock aria-hidden className="size-3" />}
                    {visLabel[f.visibility]}
                  </button>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-2 px-1 text-[13px] text-muted">Tap who can see each one. Sharing a store never shares what you bought there.</p>
      </section>

      {/* Personal tools */}
      <Card className="mt-6 divide-y divide-line overflow-hidden">
        <Row href="/saved/" icon={<Bookmark aria-hidden />} tint="bg-circle-soft text-circle" title="My collections" body={saved ? `Saved for Later · ${plural(saved, "item")}` : "Save products and ideas you want to remember"} />
        <Row
          href="/insights/"
          icon={<ChartNoAxesColumn aria-hidden />}
          tint="bg-you-soft text-you"
          title={
            <span className="inline-flex items-center gap-1.5">
              Shopping Insights <Lock aria-hidden className="size-3.5 text-muted" />
            </span>
          }
          body="Private spending awareness, never shared"
        />
      </Card>

      <Card className="mt-3 divide-y divide-line overflow-hidden">
        <Row href="/settings/#email" icon={<Inbox aria-hidden />} tint="bg-ivory-deep text-navy" title="Connected accounts" body={problems.length ? `${plural(problems.length, "inbox", "inboxes")} ${problems.length === 1 ? "needs" : "need"} attention` : `${plural(conns.length, "inbox", "inboxes")} connected`} />
        <Row href="/settings/#privacy" icon={<ShieldCheck aria-hidden />} tint="bg-ivory-deep text-navy" title="Privacy & sharing" body="What's shared, import history, deletion" />
      </Card>

      <p className="mt-5 px-1 text-[13px] text-muted">Friends never see your purchases, returns, refunds, balances, email or spending.</p>

      <Sheet
        open={edit}
        onOpenChange={setEdit}
        title="Edit profile"
        description="This is what friends will see. Leave the bio blank if you prefer."
        footer={
          <Button
            disabled={!name.trim()}
            onClick={() => {
              actions.setPublicProfile({ displayName: name.trim(), bio: bio.trim() || null });
              setEdit(false);
            }}
          >
            Save
          </Button>
        }
      >
        <div className="space-y-3">
          <Field label="Display name" htmlFor="pn">
            <Input id="pn" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Bio (optional)" htmlFor="pb">
            <Textarea id="pb" className="min-h-20" value={bio} maxLength={140} onChange={(e) => setBio(e.target.value)} placeholder="Vintage denim and good candles" />
          </Field>
        </div>
      </Sheet>
    </Shell>
  );
}
