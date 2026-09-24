import { useCallback, useEffect, useMemo, useState } from 'react';
import { demoState } from '../data/demo';
import { emptySupplier, initialState, newId } from '../data/defaults';
import type { AppState, Assumptions, DecisionMode, DecisionWeights, PriorityFactor, PriorityLevel, Purchase, Supplier } from '../types';
import { loadState, saveState } from '../utils/storage';

export const MAX_SUPPLIERS = 10;
export const MIN_SUPPLIERS = 2;

type SectionKey = 'info' | 'quote' | 'delivery' | 'quality' | 'protection' | 'risk';

export interface AppActions {
  setStep: (step: number) => void;
  updatePurchase: (patch: Partial<Purchase>) => void;
  setPriority: (factor: PriorityFactor, level: PriorityLevel) => void;
  setMode: (mode: DecisionMode) => void;
  setAdvancedWeights: (w: DecisionWeights | null) => void;
  updateAssumptions: (patch: Partial<Assumptions>) => void;
  addSupplier: () => void;
  removeSupplier: (id: string) => void;
  duplicateSupplier: (id: string) => void;
  updateSupplier: <K extends SectionKey>(id: string, section: K, patch: Partial<Supplier[K]>) => void;
  setNotes: (id: string, notes: string) => void;
  loadDemo: () => void;
  reset: () => void;
}

export const useAppState = (): [AppState, AppActions] => {
  const [state, setState] = useState<AppState>(() => loadState());

  useEffect(() => {
    const t = window.setTimeout(() => saveState(state), 250);
    return () => window.clearTimeout(t);
  }, [state]);

  const patch = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  const actions = useMemo<AppActions>(
    () => ({
      setStep: (step) => patch((s) => ({ ...s, step })),
      updatePurchase: (p) => patch((s) => ({ ...s, purchase: { ...s.purchase, ...p } })),
      setPriority: (factor, level) => patch((s) => ({ ...s, priorities: { ...s.priorities, [factor]: level } })),
      setMode: (mode) => patch((s) => ({ ...s, mode })),
      setAdvancedWeights: (w) => patch((s) => ({ ...s, advancedWeights: w })),
      updateAssumptions: (p) => patch((s) => ({ ...s, assumptions: { ...s.assumptions, ...p } })),
      addSupplier: () =>
        patch((s) =>
          s.suppliers.length >= MAX_SUPPLIERS ? s : { ...s, suppliers: [...s.suppliers, emptySupplier(s.purchase.baseCurrency)] },
        ),
      removeSupplier: (id) => patch((s) => ({ ...s, suppliers: s.suppliers.filter((x) => x.id !== id) })),
      duplicateSupplier: (id) =>
        patch((s) => {
          if (s.suppliers.length >= MAX_SUPPLIERS) return s;
          const src = s.suppliers.find((x) => x.id === id);
          if (!src) return s;
          const copy: Supplier = structuredClone(src);
          copy.id = newId();
          copy.info.name = src.info.name ? `${src.info.name} (copy)` : '';
          copy.info.isFictional = false;
          const idx = s.suppliers.indexOf(src);
          const suppliers = [...s.suppliers];
          suppliers.splice(idx + 1, 0, copy);
          return { ...s, suppliers };
        }),
      updateSupplier: (id, section, p) =>
        patch((s) => ({
          ...s,
          suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, [section]: { ...x[section], ...p } } : x)),
        })),
      setNotes: (id, notes) => patch((s) => ({ ...s, suppliers: s.suppliers.map((x) => (x.id === id ? { ...x, notes } : x)) })),
      loadDemo: () => patch(() => demoState()),
      reset: () => patch(() => initialState()),
    }),
    [patch],
  );

  return [state, actions];
};
