/**
 * In-memory stand-in for next/navigation, used by the single-file prototype build.
 * Routes live in history.state so Back works inside a sandboxed frame without changing its URL.
 */
import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
const current = () => (typeof history !== "undefined" && (history.state as { route?: string } | null)?.route) || "/";

function notify() {
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", notify);
  if (!(history.state as { route?: string } | null)?.route) history.replaceState({ route: "/" }, "");
}

export function navigate(route: string, replace = false) {
  if (replace) history.replaceState({ route }, "");
  else history.pushState({ route }, "");
  window.scrollTo(0, 0);
  notify();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useRoute() {
  return useSyncExternalStore(subscribe, current, () => "/");
}

export function splitRoute(route: string) {
  const [path, query = ""] = route.split("?");
  return { path: path.endsWith("/") ? path : `${path}/`, query };
}

export function usePathname() {
  return splitRoute(useRoute()).path;
}

export function useSearchParams() {
  return new URLSearchParams(splitRoute(useRoute()).query);
}

export function useRouter() {
  return {
    push: (r: string) => navigate(r),
    replace: (r: string) => navigate(r, true),
    back: () => history.back(),
  };
}
