import type { ReactNode } from "react";
import { CircleAlert, Info, ShieldCheck, FlaskConical } from "lucide-react";
import { cn } from "./cn";

type Tone = "info" | "warning" | "success" | "demo";

const tones: Record<Tone, { box: string; icon: ReactNode }> = {
  info: { box: "bg-ivory-deep text-navy", icon: <Info aria-hidden className="size-[18px] shrink-0 text-muted" /> },
  warning: { box: "bg-sand text-sand-ink", icon: <CircleAlert aria-hidden className="size-[18px] shrink-0" /> },
  success: { box: "bg-sage text-sage-ink", icon: <ShieldCheck aria-hidden className="size-[18px] shrink-0" /> },
  demo: { box: "bg-ivory-deep text-muted border border-dashed border-line", icon: <FlaskConical aria-hidden className="size-[18px] shrink-0" /> },
};

/** Inline explanation. Use sparingly; one per decision at most. */
export function Notice({ tone = "info", title, children, action, className }: { tone?: Tone; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const t = tones[tone];
  return (
    <div role={tone === "warning" ? "status" : undefined} className={cn("flex gap-3 rounded-2xl px-4 py-3.5 text-[15px] leading-snug", t.box, className)}>
      <span className="mt-0.5">{t.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "opacity-95")}>{children}</div>}
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

/** Small pill used for a status the user must not misread (Estimated, Unverified, Demo). */
export function Tag({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "urgent" | "success" | "warning" | "progress"; className?: string }) {
  const map = {
    neutral: "bg-ivory-deep text-muted",
    urgent: "bg-terracotta-soft text-terracotta",
    success: "bg-sage text-sage-ink",
    warning: "bg-sand text-sand-ink",
    progress: "bg-progress-soft text-progress",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[13px] font-semibold", map[tone], className)}>{children}</span>;
}
