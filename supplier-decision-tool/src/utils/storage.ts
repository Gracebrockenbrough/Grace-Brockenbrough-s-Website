import type { AppState } from '../types';
import { emptySupplier, initialState } from '../data/defaults';
import type { Supplier } from '../types';

/** Fills in any fields added since the data was saved. */
const hydrateSupplier = (s: Partial<Supplier>): Supplier => {
  const e = emptySupplier();
  return {
    ...e,
    ...s,
    id: s.id ?? e.id,
    info: { ...e.info, ...s.info },
    quote: { ...e.quote, ...s.quote },
    delivery: { ...e.delivery, ...s.delivery },
    quality: { ...e.quality, ...s.quality },
    protection: { ...e.protection, ...s.protection },
    risk: { ...e.risk, ...s.risk },
    notes: s.notes ?? '',
  };
};

const KEY = 'supplier-quote-evaluator:v1';

/** Loads saved state; falls back to a fresh state if storage is unavailable or corrupt. */
export const loadState = (): AppState => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const base = initialState();
    return {
      ...base,
      ...parsed,
      purchase: { ...base.purchase, ...parsed.purchase },
      priorities: { ...base.priorities, ...parsed.priorities },
      assumptions: { ...base.assumptions, ...parsed.assumptions },
      suppliers: Array.isArray(parsed.suppliers) && parsed.suppliers.length ? parsed.suppliers.map(hydrateSupplier) : base.suppliers,
    };
  } catch {
    return initialState();
  }
};

export const saveState = (state: AppState): void => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable (private mode, quota) — the app still works for this session */
  }
};
