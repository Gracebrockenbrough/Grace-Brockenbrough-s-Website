// Minimal in-memory replacement for next/navigation so the app runs as one static page.
import { useSyncExternalStore } from "react";

let current = "/";
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => current;

export function navigate(href: string, opts: { scroll?: boolean } = {}) {
  if (href === current) return;
  current = href;
  listeners.forEach((l) => l());
  if (opts.scroll !== false) window.scrollTo(0, 0);
}

export function useLocation() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function usePathname() {
  return useLocation().split("?")[0] || "/";
}

export function useSearchParams() {
  const q = useLocation().split("?")[1] ?? "";
  return new URLSearchParams(q);
}

const router = {
  push: (href: string, opts?: { scroll?: boolean }) => navigate(href, opts),
  replace: (href: string, opts?: { scroll?: boolean }) => navigate(href, opts),
  back: () => navigate("/today"),
  refresh: () => undefined,
  prefetch: () => undefined,
};
export function useRouter() {
  return router;
}
