"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import type { ConnectedSource } from "@/types";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { ConnectionIcon } from "@/components/connections/ConnectionIcon";

function Row({ source }: { source: ConnectedSource }) {
  const { open } = useUI();
  const connected = source.status === "connected";
  const paused = source.status === "paused";
  return (
    <li className="flex items-center gap-3 py-3">
      <button type="button" onClick={() => open({ type: "connection", id: source.id })} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <ConnectionIcon source={source} />
        <span className="min-w-0">
          <span className="block text-[16px] font-medium">{source.name}</span>
          <span className="block truncate text-[14px] text-ink-3">{source.blurb}</span>
        </span>
      </button>
      {connected ? (
        <button type="button" onClick={() => open({ type: "connection", id: source.id })} className="flex shrink-0 items-center gap-1 text-[14.5px] font-medium text-success">
          Connected <Check size={16} aria-hidden />
        </button>
      ) : paused ? (
        <button type="button" onClick={() => open({ type: "connection", id: source.id })} className="flex shrink-0 items-center gap-1 text-[14.5px] font-medium text-ink-3">
          Paused <ChevronRight size={16} aria-hidden />
        </button>
      ) : (
        <button type="button" onClick={() => open({ type: "connect", id: source.id })} className="min-h-9 shrink-0 rounded-xl border border-line-strong px-3.5 text-[14.5px] font-medium hover:bg-sunken">
          Connect
        </button>
      )}
    </li>
  );
}

export default function ConnectionsPage() {
  const { state } = useOrbit();
  const [showAll, setShowAll] = useState(false);
  const linked = state.sources.filter((s) => s.status !== "available");
  const more = state.sources.filter((s) => s.status === "available" && s.group !== "other");
  const others = state.sources.filter((s) => s.status === "available" && s.group === "other");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/settings" className="mb-4 inline-flex min-h-10 items-center gap-1.5 rounded-lg text-[15px] text-ink-2 hover:text-ink">
        <ArrowLeft size={17} aria-hidden /> Profile
      </Link>
      <header className="mb-8">
        <h1 className="text-[28px] font-semibold tracking-tight md:text-[32px]">Connections</h1>
        <p className="mt-1 text-[16px] text-ink-2">Connect the places where your life already happens.</p>
      </header>

      <section aria-labelledby="connected">
        <h2 id="connected" className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Connected</h2>
        {linked.length ? (
          <ul className="divide-y divide-line">{linked.map((s) => <Row key={s.id} source={s} />)}</ul>
        ) : (
          <p className="py-4 text-[15px] text-ink-2">Nothing yet. Start with your calendar.</p>
        )}
      </section>

      <section aria-labelledby="add-more" className="mt-8">
        <h2 id="add-more" className="text-[13px] font-semibold uppercase tracking-wider text-ink-3">Add more</h2>
        <ul className="divide-y divide-line">{(showAll ? [...more, ...others] : more).map((s) => <Row key={s.id} source={s} />)}</ul>
        {!showAll && others.length > 0 && (
          <button type="button" onClick={() => setShowAll(true)} className="mt-2 min-h-9 rounded-lg text-[14.5px] font-medium text-ink-2 hover:text-ink">
            See all connections →
          </button>
        )}
      </section>

      <ul className="mt-10 space-y-1.5 rounded-2xl bg-sunken px-5 py-4 text-[14.5px] text-ink-2">
        <li>Your information stays connected to your account.</li>
        <li>ORBIT uses it to organize what matters.</li>
        <li>ORBIT will not send messages without you.</li>
        <li>You can disconnect a source anytime.</li>
      </ul>
      <p className="mt-3 text-[13px] text-ink-3">Prototype: connections are simulated with sample data.</p>
    </div>
  );
}
