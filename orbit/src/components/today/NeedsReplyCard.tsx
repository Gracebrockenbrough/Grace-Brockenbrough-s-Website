"use client";

import { Ban, Star } from "lucide-react";
import type { Message, RankedLoop } from "@/types";
import { relativePast } from "@/lib/time";
import { useOrbit } from "@/store/OrbitProvider";
import { useUI } from "@/store/UIProvider";
import { useMessageActions } from "@/store/useActions";
import { Button } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { WhyThisPopover } from "@/components/ui/WhyThisPopover";
import { SOURCE_KIND_LABEL } from "@/data/mockSources";

function firstQuestion(content: string): string {
  const body = content.replace(/^(hi|hey|hello)[^\n]*\n+/i, "").trim();
  const q = body.split(/(?<=[?.!])\s/).find((s) => s.includes("?"));
  return (q ?? body.split("\n")[0]).trim();
}

/** ORBIT is not an email client: it shows the question and who's waiting, nothing more. */
export function NeedsReplyCard({ message, loop }: { message: Message; loop?: RankedLoop }) {
  const { derived } = useOrbit();
  const { open } = useUI();
  const feedback = useMessageActions();

  return (
    <li className="animate-rise-in rounded-2xl border border-line bg-surface p-4 shadow-card md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-accent">Reply needed</p>
          <p className="mt-0.5 text-[16.5px] font-semibold text-ink">{message.sender}</p>
        </div>
        <Menu
          label={`More options for ${message.sender}`}
          items={[
            { label: "This is important", icon: <Star size={16} />, onSelect: () => feedback(message.id, "important") },
            { label: "Mark as replied", onSelect: () => feedback(message.id, "replied") },
            { label: "Always ignore this source", icon: <Ban size={16} />, tone: "danger", onSelect: () => feedback(message.id, "ignore_source") },
          ]}
        />
      </div>
      <blockquote className="mt-2 border-l-2 border-accent-line pl-3 text-[15px] leading-relaxed text-ink">“{firstQuestion(message.content)}”</blockquote>
      <p className="mt-2 text-[13.5px] text-ink-3">
        Received {relativePast(message.timestamp, derived.now).toLowerCase()} · {SOURCE_KIND_LABEL[message.source]}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="primary" onClick={() => open({ type: "message", id: message.id })}>
          Open message
        </Button>
        <Button size="sm" variant="secondary" onClick={() => feedback(message.id, "remind_later")}>
          Remind me later
        </Button>
        <Button size="sm" variant="ghost" onClick={() => feedback(message.id, "not_important")}>
          Not important
        </Button>
      </div>
      {loop?.why && <WhyThisPopover why={`ORBIT surfaced this because ${loop.why.charAt(0).toLowerCase()}${loop.why.slice(1)}`} className="mt-1" />}
    </li>
  );
}
