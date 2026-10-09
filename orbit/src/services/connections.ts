import type { ConnectedSource, SourceKind } from "@/types";

/** Source kinds whose information comes from a connection (others come from the user directly). */
const CONNECTED_KINDS: SourceKind[] = ["calendar", "email", "canvas", "groupme", "text"];

export const isActive = (s: ConnectedSource) => s.status === "connected";

/** Kinds of information ORBIT should not use because nothing active provides them. */
export function hiddenKinds(sources: ConnectedSource[]): Set<string> {
  const active = new Set(sources.filter(isActive).map((s) => s.kind as string));
  return new Set(CONNECTED_KINDS.filter((k) => !active.has(k)));
}
