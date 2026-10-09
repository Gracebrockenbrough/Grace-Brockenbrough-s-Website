import {
  BookOpen,
  CalendarDays,
  Camera,
  FileText,
  GraduationCap,
  Mail,
  MessageCircle,
  MessagesSquare,
  Mic,
  PenLine,
  Sparkles,
} from "lucide-react";
import type { PriorityLevel, Source, SourceKind } from "@/types";
import { cn } from "@/lib/cn";
import { confidenceLabel } from "@/services/changes";

const SOURCE_ICON: Record<SourceKind, typeof Mail> = {
  email: Mail,
  calendar: CalendarDays,
  syllabus: FileText,
  groupme: MessagesSquare,
  text: MessageCircle,
  canvas: GraduationCap,
  manual: PenLine,
  screenshot: Camera,
  voice: Mic,
  orbit: Sparkles,
};

/** Where ORBIT learned something. Subtle by design. */
export function SourceBadge({ source, prefix = true, className }: { source: Source; prefix?: boolean; className?: string }) {
  const Icon = SOURCE_ICON[source.kind] ?? BookOpen;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] text-ink-3", className)}>
      <Icon size={14} aria-hidden />
      <span>
        {prefix && <span className="sr-only">Source: </span>}
        {source.label}
      </span>
    </span>
  );
}

const PRIORITY_STYLE: Record<PriorityLevel, { label: string; dot: string; text: string }> = {
  high: { label: "High priority", dot: "bg-critical", text: "text-critical" },
  medium: { label: "Medium priority", dot: "bg-attention", text: "text-attention" },
  low: { label: "Low priority", dot: "bg-ink-3", text: "text-ink-3" },
};

/** Priority is always communicated with text, never color alone. */
export function PriorityTag({ level, className }: { level: PriorityLevel; className?: string }) {
  const s = PRIORITY_STYLE[level];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", s.text, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}

export function ConfidenceTag({ confidence, className }: { confidence: number; className?: string }) {
  const label = confidenceLabel(confidence);
  const style =
    label === "High confidence"
      ? "bg-success-soft text-success"
      : label === "Needs review"
        ? "bg-attention-soft text-attention"
        : "bg-sunken text-ink-2";
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[12.5px] font-medium", style, className)}>{label}</span>;
}

export function Pill({ children, tone = "neutral", className }: { children: React.ReactNode; tone?: "neutral" | "accent" | "attention" | "critical" | "success"; className?: string }) {
  const tones = {
    neutral: "bg-sunken text-ink-2",
    accent: "bg-accent-soft text-accent-strong",
    attention: "bg-attention-soft text-attention",
    critical: "bg-critical-soft text-critical",
    success: "bg-success-soft text-success",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12.5px] font-medium", tones[tone], className)}>{children}</span>;
}
