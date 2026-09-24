# Supplier Quote Evaluator

A risk-adjusted procurement decision tool for raw materials. It answers:

> **Which supplier gives us the best risk-adjusted value for this specific raw material, based on what matters most for this purchase?**

Instead of comparing unit prices, it compares **true costs**: price, logistics, quality control, contract costs, and the *expected* cost of quality failures and supply disruptions. It then produces a procurement decision memo with negotiation suggestions.

## Guided workflow

1. **Define the Purchase**: the material, how it is used, volume, and what a quality failure or late delivery would cost.
2. **Define Priorities**: rate 13 factors from *Not Important* to *Critical*, or pick a preset decision mode (Lowest Risk, Lowest Total Cost, Quality First, Fastest Supply, Cash Preservation, Balanced, Custom). There is also an advanced option to set exact weights.
3. **Enter Supplier Quotes**: 2–10 suppliers, with any field left as *Unknown*.
4. **Compare Suppliers**: highlight cards, risk-adjusted cost chart, risk profile chart, detailed table, and a scored and explained card for every supplier.
5. **View Recommendation**: a decision memo covering the recommended supplier, confidence, financial reasoning, benefits, risks, the next-best alternative, optional order splitting, and "How this recommendation was calculated".
6. **Negotiation Opportunities**: specific asks for the recommended supplier, plus a break-even analysis ("What would make this supplier win?") for every other supplier.

Data is saved in the browser's `localStorage`. The demo, *Industrial Stainless Steel Purchase — Demo*, uses **fictional** suppliers.

## Running it

```bash
npm install
npm run dev        # local dev server
npm test           # unit tests for the calculation model
npm run build      # production build in dist/ (relative paths, can be hosted from any sub-folder)
```

## Code structure

```
src/
  types/       TypeScript types (Purchase, Supplier, SupplierQuote, SupplierRiskProfile, DecisionWeights, SupplierScore, Recommendation…)
  data/        dropdown options, decision-mode presets, defaults, fictional demo data
  utils/       all formulas, with no UI code
    costs.ts            cost buckets, expected failure / disruption cost, disruption risk index
    scoring.ts          ten 0–100 category scores, risk level
    weights.ts          priority ratings → weights, mode weights
    confidence.ts       data-quality confidence
    evaluate.ts         ranking under a mode
    insights.ts         strengths, weaknesses, ranking explanations
    recommendation.ts   decision memo, sensitivity analysis
    negotiation.ts      negotiation asks
    breakeven.ts        "what would make this supplier win?"
    splitting.ts        optional order-splitting analysis
    validation.ts       friendly input validation
  components/  PurchaseSetup, PrioritySelector, ModeSelector, SupplierForm, SupplierComparison, CostBreakdown,
               RecommendationCard, NegotiationPanel, ConfidenceIndicator, MethodologyPanel, charts, ui/
  pages/       one component per workflow step
  state/       app state + persistence
```

## Key formulas

- **Direct total cost** = purchase (unit price × quantity − discount) + logistics + quality control + contract/admin
- **Expected quality-failure cost** = (effective defect rate ÷ reference rate) × cost of a significant failure × (1 − protection offset)
- **Expected disruption cost** = (disruption risk index ÷ 100) × disruption days at maximum risk × daily disruption cost × (1 − late-credit offset)
- **Risk-adjusted total cost** = direct total + expected quality-failure cost + expected disruption cost
- **Overall deal score** = Σ category score × mode weight

Every assumption can be edited in the app, and the "How this recommendation was calculated" panel shows the formulas, weights, missing data and confidence adjustments.
