import { useEffect, useMemo, useState } from 'react';
import { ProgressSteps, STEPS } from './components/ProgressSteps';
import { Badge, Button, Callout, Icon } from './components/ui/primitives';
import { DEMO_NAME } from './data/demo';
import { MODES } from './data/modes';
import { useAppState } from './state/useAppState';
import type { AppState } from './types';
import { evaluate, winnersByMode, type EvalInput } from './utils/evaluate';
import { buildRecommendation } from './utils/recommendation';
import { getWeights } from './utils/weights';
import {
  ComparePage,
  NegotiationPage,
  PrioritiesPage,
  PurchasePage,
  RecommendationPage,
  SuppliersPage,
  type Analysis,
} from './pages/steps';

const STEP_INTRO = [
  'Describe the raw material, how it is used, and what a quality failure or late delivery would cost you.',
  'Tell the tool what matters most. Ratings are converted into weights automatically.',
  'Enter each supplier’s quote and terms. Anything you don’t know can stay Unknown — it lowers confidence instead of excluding the supplier.',
  'True costs and risks side by side. The cheapest quote is not always the cheapest decision.',
  'A procurement decision memo: the recommended supplier, why, the financial case, risks and the next-best alternative.',
  'Concrete asks for the recommended supplier, and what would have to change for each other supplier to win.',
];

const purchaseValid = (s: AppState) =>
  !!s.purchase.name.trim() &&
  s.purchase.quantity != null &&
  s.purchase.quantity > 0 &&
  !!s.purchase.unit.trim() &&
  (s.purchase.category !== 'Other' || !!s.purchase.customCategory.trim());

const validSuppliers = (s: AppState) => s.suppliers.filter((x) => x.info.name.trim() && x.quote.unitPrice != null && x.quote.unitPrice > 0);

export default function App() {
  const [state, actions] = useAppState();
  const [showErrors, setShowErrors] = useState<Record<number, boolean>>({});
  const step = state.step;

  const ready = purchaseValid(state) && validSuppliers(state).length >= 2;

  const input: EvalInput = useMemo(
    () => ({
      purchase: state.purchase,
      suppliers: validSuppliers(state),
      assumptions: state.assumptions,
      priorities: state.priorities,
      mode: state.mode,
      advancedWeights: state.advancedWeights,
    }),
    [state],
  );

  const analysis: Analysis | null = useMemo(() => {
    if (!ready) return null;
    const evaluation = evaluate(input);
    return {
      input,
      evaluation,
      recommendation: buildRecommendation(input, evaluation),
      winners: winnersByMode(input, MODES.map((m) => m.id)),
    };
  }, [input, ready]);

  const weights = useMemo(
    () => getWeights(state.mode, state.priorities, state.purchase, state.advancedWeights),
    [state.mode, state.priorities, state.purchase, state.advancedWeights],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // If data becomes incomplete while on an analysis step, fall back to quote entry.
  useEffect(() => {
    if (step >= 3 && !ready) actions.setStep(purchaseValid(state) ? 2 : 0);
  }, [step, ready, state, actions]);

  const canEnter = (i: number) => i <= 2 || ready;

  const blockers = (i: number): string | null => {
    if (i === 0 && !purchaseValid(state)) return 'Add a purchase name, a volume greater than zero and a unit of measure to continue.';
    if (i === 2 && validSuppliers(state).length < 2)
      return `Enter at least two suppliers with a name and unit price to compare (currently ${validSuppliers(state).length}).`;
    if (i === 2 && !purchaseValid(state)) return 'Complete Step 1 (purchase name, volume and unit) before comparing.';
    return null;
  };

  const next = () => {
    const b = blockers(step);
    if (b) {
      setShowErrors((e) => ({ ...e, [step]: true }));
      return;
    }
    actions.setStep(Math.min(STEPS.length - 1, step + 1));
  };

  const startNew = () => {
    if (window.confirm('Start a new analysis? This clears the current purchase, priorities and supplier quotes.')) {
      actions.reset();
      setShowErrors({});
    }
  };

  const loadDemo = () => {
    const hasData = state.purchase.name.trim() || validSuppliers(state).length > 0;
    if (!hasData || state.isDemo || window.confirm('Load the demo? This replaces the data you have entered.')) {
      actions.loadDemo();
      setShowErrors({});
    }
  };

  const blocker = showErrors[step] ? blockers(step) : null;

  return (
    <div className="min-h-screen">
      <header className="no-print border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy text-white" aria-hidden>
              <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                <path d="M3 16h3V9H3v7zm5 0h3V4H8v12zm5 0h3v-5h-3v5z" />
              </svg>
            </div>
            <div>
              <div className="text-[15px] font-semibold leading-tight text-navy">Supplier Quote Evaluator</div>
              <div className="text-xs text-muted">Risk-adjusted procurement decisions for raw materials</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {state.isDemo && <Badge tone="caution">Demo: fictional data</Badge>}
            <Button size="sm" variant="ghost" onClick={loadDemo}>
              Load demo
            </Button>
            <Button size="sm" variant="ghost" onClick={startNew}>
              New analysis
            </Button>
            {step >= 3 && (
              <Button size="sm" onClick={() => window.print()}>
                Print / save PDF
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="no-print sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <ProgressSteps current={step} onSelect={(i) => canEnter(i) && actions.setStep(i)} isEnabled={canEnter} />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-6">
          <div className="eyebrow">
            Step {step + 1} of {STEPS.length}
          </div>
          <h1 className="mt-1 text-2xl font-bold text-navy sm:text-[28px]">{STEPS[step].title}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">{STEP_INTRO[step]}</p>
        </div>

        {step === 0 && !state.purchase.name && !state.isDemo && (
          <Callout tone="accent" className="no-print mb-5" title="New here?">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>
                Explore a complete example first: the <strong>{DEMO_NAME}</strong> compares three fictional suppliers.
              </span>
              <Button size="sm" variant="primary" onClick={loadDemo}>
                Load the demo
              </Button>
            </div>
          </Callout>
        )}

        {step === 0 && <PurchasePage state={state} actions={actions} showErrors={!!showErrors[0]} />}
        {step === 1 && <PrioritiesPage state={state} actions={actions} showErrors={false} weights={weights} />}
        {step === 2 && <SuppliersPage state={state} actions={actions} showErrors={!!showErrors[2]} />}
        {step === 3 && analysis && <ComparePage state={state} actions={actions} showErrors={false} analysis={analysis} />}
        {step === 4 && analysis && <RecommendationPage state={state} actions={actions} showErrors={false} analysis={analysis} />}
        {step === 5 && analysis && <NegotiationPage state={state} actions={actions} showErrors={false} analysis={analysis} />}

        {blocker && (
          <Callout tone="risk" className="no-print mt-5">
            {blocker}
          </Callout>
        )}

        <nav className="no-print mt-8 flex items-center justify-between gap-3 border-t border-line pt-5" aria-label="Step navigation">
          <Button onClick={() => actions.setStep(Math.max(0, step - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button variant="primary" onClick={next}>
              Continue to {STEPS[step + 1].title} {Icon.arrow()}
            </Button>
          ) : (
            <Button variant="primary" onClick={() => window.print()}>
              Print / save as PDF
            </Button>
          )}
        </nav>
      </main>

      <footer className="no-print border-t border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-muted sm:px-6">
          Scores support the analysis — they don’t replace judgment. Expected failure and disruption costs are estimates based on the assumptions shown in “How this
          recommendation was calculated”. Your data is saved only in this browser.
        </div>
      </footer>
    </div>
  );
}
