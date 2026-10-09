import { CalendarDays, GraduationCap, HardDrive, ListChecks, Mail, MessageCircle, MessagesSquare, StickyNote } from "lucide-react";
import type { ConnectedSource } from "@/types";
import { cn } from "@/lib/cn";

const ICON: Record<string, typeof Mail> = {
  calendar: CalendarDays,
  email: Mail,
  canvas: GraduationCap,
  groupme: MessagesSquare,
  text: MessageCircle,
  drive: HardDrive,
  reminders: ListChecks,
  notes: StickyNote,
};

export function ConnectionIcon({ source, size = 40 }: { source: ConnectedSource; size?: number }) {
  const Icon = ICON[source.kind] ?? Mail;
  return (
    <span
      className={cn("flex shrink-0 items-center justify-center rounded-xl", source.status === "connected" ? "bg-accent-soft text-accent" : "bg-sunken text-ink-2")}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Icon size={Math.round(size * 0.48)} />
    </span>
  );
}
