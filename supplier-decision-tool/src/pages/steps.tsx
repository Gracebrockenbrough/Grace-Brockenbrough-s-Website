import { useMemo } from 'react';
import { BreakEvenPanel, NegotiationPanel } from '../components/NegotiationPanel';
import { MethodologyPanel } from '../components/MethodologyPanel';
import { ModeSelector, ModeTabs, WeightsPanel } from '../components/ModeSelector';
import { PrioritySelector } from '../components/PrioritySelector';
import { PurchaseSetup } from '../components/PurchaseSetup';
import { RecommendationCard, SplitPanel } from '../components/RecommendationCard';
import { SupplierComparison } from '../components/SupplierComparison';
import { SupplierForm } from '../components/SupplierForm';
import { Callout, Card, CardHeader } from '../components/ui/primitives';
import { modeById } from '../data/modes';
import type { AppActions } from '../state/useAppState';
import type { AppState, Evaluation, Recommendation } from '../types';
import { buildBreakEven } from '../utils/breakeven';
import type { EvalInput } from '../utils/evaluate';
import { buildNegotiation } from '../utils/negotiation';
import { sensitivityAnalysis } from '../utils/recommendation';
import { buildSplitSuggestion } from '../utils/splitting';
import type { ModeWinner } from '../components/SupplierComparison';

export interface Analysis {
  input: EvalInput;
  evaluation: Evaluation;
  recommendation: Recommendation | null;
  winners: ModeWinner[];
}

interface PageProps {
  state: AppState;
  actions: AppActions;
  showErrors: boolean;
}

export const PurchasePage = ({ state, actions, showErrors }: PageProps) => (
  <PurchaseSetup purchase={state.purchase} onChange={actions.updatePurchase} showErrors={showErrors} />
);

export const PrioritiesPage = ({ state, actions, weights }: PageProps & { weights: Evaluation['weights'] }) => (
  <div className="space-y-5">
    <Card>
      <CardHeader
        eyebrow="Decision mode"
        title="Choose a strategy"
        subtitle="Pick a preset, or choose Custom to use your own ratings below. You can switch modes at any time after entering quotes."
      />
      <div className="space-y-4 px-5 py-5">
        <ModeSelector value={state.mode} onChange={actions.setMode} />
        <WeightsPanel mode={state.mode} weights={weights} />
      </div>
    </Card>
    <PrioritySelector
      priorities={state.priorities}
      purchase={state.purchase}
      onChange={actions.setPriority}
      advancedWeights={state.advancedWeights}
      onAdvancedWeights={actions.setAdvancedWeights}
    />
    {state.mode !== 'custom' && (
      <Callout tone="neutral">
        Your ratings are used by the <strong>Custom</strong> mode. You are currently using the <strong>{modeById(state.mode).label}</strong> preset —{' '}
        <button type="button" className="font-medium text-accent underline" onClick={() => actions.setMode('custom')}>
          switch to Custom
        </button>{' '}
        to rank suppliers by the ratings above.
      </Callout>
    )}
  </div>
);

export const SuppliersPage = ({ state, actions, showErrors }: PageProps) => (
  <SupplierForm suppliers={state.suppliers} purchase={state.purchase} actions={actions} showErrors={showErrors} isDemo={state.isDemo} />
);

const ModeBar = ({ state, actions, evaluation }: { state: AppState; actions: AppActions; evaluation: Evaluation }) => (
  <div className="no-print space-y-3">
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium text-ink-2">Decision mode</span>
      <ModeTabs value={state.mode} onChange={actions.setMode} />
    </div>
    <WeightsPanel mode={state.mode} weights={evaluation.weights} />
  </div>
);

export const ComparePage = ({ state, actions, analysis }: PageProps & { analysis: Analysis }) => (
  <div className="space-y-5">
    <ModeBar state={state} actions={actions} evaluation={analysis.evaluation} />
    {state.isDemo && (
      <Callout tone="caution">These suppliers and figures are fictional and are included only to demonstrate how the tool works.</Callout>
    )}
    <SupplierComparison
      evaluation={analysis.evaluation}
      suppliers={analysis.input.suppliers}
      purchase={state.purchase}
      winners={analysis.winners}
      onModeChange={actions.setMode}
    />
  </div>
);

export const RecommendationPage = ({ state, actions, analysis }: PageProps & { analysis: Analysis }) => {
  const { input, evaluation, recommendation } = analysis;
  const split = useMemo(() => buildSplitSuggestion(input, evaluation), [input, evaluation]);
  const sensitivity = useMemo(() => sensitivityAnalysis(input, evaluation), [input, evaluation]);
  if (!recommendation) return null;
  return (
    <div className="space-y-5">
      <ModeBar state={state} actions={actions} evaluation={evaluation} />
      <RecommendationCard rec={recommendation} evaluation={evaluation} purchase={state.purchase} suppliers={input.suppliers} isDemo={state.isDemo} />
      <SplitPanel split={split} currency={state.purchase.baseCurrency} />
      <MethodologyPanel
        evaluation={evaluation}
        purchase={state.purchase}
        assumptions={state.assumptions}
        suppliers={input.suppliers}
        sensitivity={sensitivity}
        onAssumptions={actions.updateAssumptions}
        onPurchase={actions.updatePurchase}
      />
    </div>
  );
};

export const NegotiationPage = ({ state, actions, analysis }: PageProps & { analysis: Analysis }) => {
  const { input, evaluation } = analysis;
  const negotiation = useMemo(() => buildNegotiation(input, evaluation), [input, evaluation]);
  const breakEven = useMemo(() => buildBreakEven(input, evaluation), [input, evaluation]);
  const top = evaluation.results[0];
  const supplier = input.suppliers.find((s) => s.id === top?.supplierId);
  if (!top || !supplier) return null;
  return (
    <div className="space-y-5">
      <ModeBar state={state} actions={actions} evaluation={evaluation} />
      <NegotiationPanel items={negotiation} supplier={supplier} score={top} currency={state.purchase.baseCurrency} />
      <BreakEvenPanel results={breakEven} winnerName={top.name} modeLabel={modeById(evaluation.mode).label} />
    </div>
  );
};
