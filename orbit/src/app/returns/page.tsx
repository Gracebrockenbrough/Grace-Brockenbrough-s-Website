"use client";

import { useState } from "react";
import Link from "next/link";
import { Archive, ChevronDown, ChevronRight, PackageOpen, Plus, Sparkles } from "lucide-react";
import { PageHeader, Shell } from "@/components/layout/shell";
import { FocusCard } from "@/components/orbit/focus-card";
import { ReturnRow } from "@/components/orbit/return-row";
import { ButtonLink, IconLink } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { MoreList } from "@/components/ui/more-list";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { money } from "@/lib/domain/format";
import { bucketFor, bucketMeta, type Bucket } from "@/lib/intelligence/priorities";
import { returnTasks, type ReturnTask } from "@/lib/store/selectors";
import { actions, useOrbit } from "@/lib/store/store";

const sum = (list: ReturnTask[]) => list.reduce((s, t) => s + (t.amount ?? 0), 0);
const BUCKETS: Bucket[] = ["overdue", "soon", "week", "later", "missing"];

/** A quiet, collapsed group for things that need nothing from you right now. */
function Folded({ id, title, hint, tasks }: { id: string; title: string; hint: string; tasks: ReturnTask[] }) {
  const [open, setOpen] = useState(false);
  if (!tasks.length) return null;
  return (
    <section id={id} className="mt-7 scroll-mt-16">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex min-h-12 w-full items-center gap-2 text-left">
        <span className="flex-1">
          <span className="block text-[17px] font-semibold">
            {title} <span className="tabular font-normal text-muted">· {tasks.length}</span>
          </span>
          <span className="block text-[14px] text-muted">{hint}</span>
        </span>
        <span className="tabular text-[14px] text-muted">{money(sum(tasks))}</span>
        <ChevronDown aria-hidden className={cn("size-5 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-2 space-y-2">
          {tasks.map((t) => (
            <ReturnRow key={t.view.order.id} t={t} showAction={t.group !== "transit"} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function ReturnsPage() {
  const o = useOrbit();
  if (!o) return <Shell loading />;

  const tasks = returnTasks(o.data, o.today);
  const move = tasks.filter((t) => t.group === "move");
  const waiting = tasks.filter((t) => t.group === "waiting");
  const transit = tasks.filter((t) => t.group === "transit");
  const history = tasks.filter((t) => t.group === "history");
  const [first, ...rest] = move;

  const header = (
    <PageHeader
      title="Returns"
      subtitle="Unfinished business, most urgent first."
      action={
        <>
          <IconLink href="/ask/" label="Ask Orbit to find a purchase">
            <Sparkles aria-hidden className="size-[22px]" />
          </IconLink>
          <IconLink href="/add/" label="Add a purchase">
            <Plus aria-hidden className="size-[22px]" />
          </IconLink>
        </>
      }
    />
  );

  if (o.preview.outage === "returns")
    return (
      <Shell>
        {header}
        <ErrorState title="We couldn't load your returns" onRetry={() => actions.setPreview({ outage: "none" })}>
          Your wallet and saved labels are unaffected.
        </ErrorState>
      </Shell>
    );

  if (tasks.length === 0)
    return (
      <Shell>
        {header}
        <EmptyState icon={<PackageOpen aria-hidden />} title="No purchases yet" action={<ButtonLink href="/add/">Add a Purchase</ButtonLink>}>
          Add an order confirmation and Orbit will keep track of the return window.
        </EmptyState>
      </Shell>
    );

  const stats = [
    { id: "move", label: "Your move", n: move.length, amount: sum(move), strong: true },
    { id: "waiting", label: "Waiting", n: waiting.length, amount: sum(waiting), strong: false },
    { id: "transit", label: "On the way", n: transit.length, amount: sum(transit), strong: false },
  ];

  return (
    <Shell>
      {header}

      {/* At a glance */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={cn("rounded-[18px] px-3 py-3", s.strong ? "bg-navy text-white" : "border border-line bg-card")}
          >
            <span className={cn("block text-[13px] font-semibold", s.strong ? "text-white/70" : "text-muted")}>{s.label}</span>
            <span className="tabular block text-[24px] font-semibold leading-tight">{s.n}</span>
            <span className={cn("tabular block text-[13px]", s.strong ? "text-white/70" : "text-muted")}>{money(s.amount)}</span>
          </a>
        ))}
      </div>

      {first ? (
        <>
          <div className="mt-6">
            <FocusCard
              emoji={first.emoji}
              retailer={first.view.retailer}
              label={first.label}
              title={first.title}
              why={first.why}
              amount={first.amount}
              daysLeft={first.daysLeft}
              estimated={first.estimated}
              action={{ label: first.actionLabel, href: first.href }}
            />
          </div>

          <section id="move" className="scroll-mt-16">
            {BUCKETS.map((b) => {
              const list = rest.filter((t) => bucketFor(t.daysLeft) === b);
              if (!list.length) return null;
              return (
                <div key={b} className="mt-7">
                  <div className="mb-2.5 flex items-baseline justify-between gap-3">
                    <h2 className="text-[17px] font-semibold">
                      {bucketMeta[b].title} <span className="tabular font-normal text-muted">· {list.length}</span>
                    </h2>
                    <span className="tabular text-[14px] text-muted">{money(sum(list))}</span>
                  </div>
                  <MoreList limit={4}>
                    {list.map((t) => (
                      <ReturnRow key={t.view.order.id} t={t} />
                    ))}
                  </MoreList>
                </div>
              );
            })}
          </section>
        </>
      ) : (
        <p id="move" className="mt-6 rounded-[18px] bg-sage px-4 py-3.5 text-[15px] font-medium text-sage-ink">
          Nothing needs you right now. 🎉
        </p>
      )}

      <Folded id="waiting" title="Waiting on stores" hint="Nothing to do. We'll flag anything that runs late." tasks={waiting} />
      <Folded id="transit" title="On the way" hint="Return windows start when these arrive." tasks={transit} />

      {history.length > 0 && (
        <Link href="/returns/history/" className="mt-8 flex min-h-14 items-center gap-3 rounded-[18px] px-1 text-muted hover:bg-ivory-deep">
          <Archive aria-hidden className="size-5" />
          <span className="flex-1 text-[15px] font-semibold">History · {history.length} done</span>
          <ChevronRight aria-hidden className="size-5" />
        </Link>
      )}
    </Shell>
  );
}
