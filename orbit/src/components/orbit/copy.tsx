"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** A labeled value with a copy button, for pasting details into retailer forms. */
export function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex min-h-14 items-center gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-muted">{label}</p>
        <p className="tabular truncate text-[16px] font-medium">{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          } catch {
            // Clipboard blocked: the value is still visible to copy by hand.
          }
        }}
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-[14px] font-semibold hover:bg-ivory-deep"
        aria-label={`Copy ${label}`}
      >
        {copied ? <Check aria-hidden className="size-4 text-sage-ink" /> : <Copy aria-hidden className="size-4" />}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
