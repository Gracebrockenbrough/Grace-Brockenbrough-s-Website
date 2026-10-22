import { addDays } from "../domain/dates";
import type { OrbitData } from "./state";

const DATE_IN_STRING = /\b(\d{4}-\d{2}-\d{2})\b/g;

function shiftDeep<T>(value: T, days: number): T {
  if (typeof value === "string") return value.replace(DATE_IN_STRING, (m) => addDays(m, days)) as T;
  if (Array.isArray(value)) return value.map((v) => shiftDeep(v, days)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = shiftDeep(v, days);
    return out as T;
  }
  return value;
}

const isSeed = (r: { id: string }) => r.id.startsWith("d-");

/**
 * Moves every date in the seeded demo records forward by `days`, so a demo
 * opened next week still shows "Return deadline in 3 days". Records the user
 * created are left untouched.
 */
export function shiftSeedDates(data: OrbitData, days: number): OrbitData {
  if (days === 0) return data;
  const pick = <T extends { id: string }>(list: T[]) => list.map((r) => (isSeed(r) ? shiftDeep(r, days) : r));
  return {
    ...data,
    policies: shiftDeep(data.policies, days),
    orders: pick(data.orders),
    returns: pick(data.returns),
    refunds: pick(data.refunds),
    wallet: pick(data.wallet),
    wishlist: pick(data.wishlist),
    evidence: pick(data.evidence),
    connections: shiftDeep(data.connections, days),
    jobs: data.jobs,
    collections: data.collections ? pick(data.collections) : data.collections,
    dismissed: shiftDeep(data.dismissed, days),
  };
}
