// Core domain types for the risk-adjusted supplier comparison tool.
// A `null` numeric value always means "Unknown / not provided".

export type Severity = 'low' | 'moderate' | 'high' | 'critical';
export type Level = 'low' | 'moderate' | 'high';
export type TriState = 'yes' | 'no' | 'unknown';

export type MaterialCategory =
  | 'Metals'
  | 'Chemicals'
  | 'Plastics'
  | 'Textiles'
  | 'Packaging'
  | 'Food ingredients'
  | 'Electronics components'
  | 'Construction materials'
  | 'Manufacturing components'
  | 'Other';

export type PurchaseFrequency = 'one-time' | 'monthly' | 'quarterly' | 'annual' | 'ongoing';

export interface Purchase {
  name: string;
  category: MaterialCategory;
  customCategory: string;
  usage: string;
  frequency: PurchaseFrequency;
  quantity: number | null;
  unit: string;
  baseCurrency: string;
  defectConsequence: Severity;
  /** Estimated financial impact of a significant quality failure (optional). */
  qualityFailureImpact: number | null;
  interruptionConsequence: Severity;
  /** Estimated cost of one day of production disruption (optional). */
  dailyDisruptionCost: number | null;
}

/** Editable modelling assumptions — always shown to the user. */
export interface Assumptions {
  /** Defect rate (%) that corresponds to one "significant quality failure" of the stated impact. */
  referenceDefectRate: number;
  /** Expected production-disruption days per purchase period for a supplier at maximum risk. */
  expectedDisruptionDaysAtMaxRisk: number;
  /** Annual cost of capital used to value payment terms and deposits (%). */
  costOfCapital: number;
}

export type PriorityLevel = 0 | 1 | 2 | 3 | 4;

export type PriorityFactor =
  | 'quality'
  | 'defectRisk'
  | 'totalCost'
  | 'fastDelivery'
  | 'reliableDelivery'
  | 'contractProtection'
  | 'returnFlexibility'
  | 'insurance'
  | 'financialStrength'
  | 'paymentTerms'
  | 'priceStability'
  | 'flexibility'
  | 'lowInspection';

export type Priorities = Record<PriorityFactor, PriorityLevel>;

export type ScoreCategory =
  | 'totalCost'
  | 'quality'
  | 'failureRisk'
  | 'deliveryReliability'
  | 'leadTime'
  | 'contractProtection'
  | 'paymentTerms'
  | 'supplierStrength'
  | 'flexibility'
  | 'supplyContinuity';

/** Category weights; they are normalised before use so they need not sum to 100. */
export type DecisionWeights = Record<ScoreCategory, number>;

export type DecisionMode =
  | 'lowest-risk'
  | 'lowest-cost'
  | 'quality-first'
  | 'fastest-supply'
  | 'cash-preservation'
  | 'balanced'
  | 'custom';

export type Relationship = 'new' | 'limited' | 'existing' | 'strategic';
export type ReplacementPolicy = 'full' | 'replacement-only' | 'credit' | 'case-by-case' | 'none' | 'unknown';
export type ReturnShippingPayer = 'supplier' | 'shared' | 'buyer' | 'unknown';
export type CancellationFlexibility = 'penalty-free' | 'fee' | 'non-cancellable' | 'unknown';
export type DataSource = 'verified' | 'internal-history' | 'self-reported' | 'unknown';
export type CostBasis = 'firm' | 'estimate';

export interface SupplierInfo {
  name: string;
  quoteDate: string; // ISO yyyy-mm-dd
  quoteReference: string;
  location: string;
  country: string;
  yearsInBusiness: number | null;
  supplierQualityRating: number | null; // 1–10 (overall supplier rating, e.g. from audits)
  financialStrength: number | null; // 1–10
  relationship: Relationship;
  onboardingCost: number | null;
  isFictional?: boolean;
}

export interface SupplierQuote {
  unitPrice: number | null;
  quotedQuantity: number | null;
  volumeDiscountPct: number | null;
  currency: string;
  /** 1 unit of supplier currency = fxRate units of base currency. */
  fxRate: number | null;
  // Logistics
  freight: number | null;
  insurance: number | null;
  duties: number | null;
  handling: number | null;
  warehousing: number | null;
  otherLogistics: number | null;
  logisticsCostBasis: CostBasis;
  // Terms
  moq: number | null;
  paymentTermsDays: number | null;
  depositPct: number | null;
  priceLockMonths: number | null;
  contractLengthMonths: number | null;
  cancellationFeePct: number | null;
  cancellation: CancellationFlexibility;
  adminFees: number | null;
}

export interface SupplierDelivery {
  leadTimeDays: number | null;
  onTimePct: number | null;
  leadTimeVariabilityDays: number | null;
  expeditedAvailable: TriState;
  surgeCapacity: Level | 'unknown';
}

export interface SupplierQuality {
  qualityRating: number | null; // 1–10 material quality
  estimatedDefectPct: number | null;
  historicalDefectPct: number | null;
  qualityDataSource: DataSource;
  certifications: string;
  batchConsistency: number | null; // 1–10
  inspectionRequired: TriState;
  inspectionCost: number | null;
  testingCost: number | null;
  certificationReviewCost: number | null;
  pastQualityIncidents: number | null;
}

export interface SupplierProtection {
  returnWindowDays: number | null;
  returnShipping: ReturnShippingPayer;
  replacementPolicy: ReplacementPolicy;
  warrantyMonths: number | null;
  productLiability: TriState;
  insuranceCoverage: TriState;
  defectCompensation: TriState;
  lateDeliveryCredits: TriState;
}

export interface SupplierRiskProfile {
  singleSource: TriState;
  multipleFacilities: TriState;
  backupProduction: TriState;
  geographicRisk: Level | 'unknown';
  supplyChainConcentration: Level | 'unknown';
  rawMaterialAvailabilityRisk: Level | 'unknown';
}

export interface Supplier {
  id: string;
  info: SupplierInfo;
  quote: SupplierQuote;
  delivery: SupplierDelivery;
  quality: SupplierQuality;
  protection: SupplierProtection;
  risk: SupplierRiskProfile;
  notes: string;
}

export interface CostBreakdown {
  /** Quantity the costs were normalised to (the required purchase volume). */
  evaluatedQuantity: number;
  scaleFactor: number;
  unitPriceBase: number;
  purchase: number;
  logistics: number;
  qualityControl: number;
  contractAdmin: number;
  /** Purchase + logistics. */
  landed: number;
  /** Purchase + logistics + QC + contract/admin: known cash costs. */
  direct: number;
  expectedQualityFailure: number;
  expectedQualityFailureGross: number;
  protectionOffsetPct: number;
  expectedDisruption: number;
  expectedDisruptionGross: number;
  lateCreditOffsetPct: number;
  disruptionRiskIndex: number; // 0–100, higher = riskier
  expectedDisruptionDays: number;
  effectiveDefectPct: number;
  defectRateAssumed: boolean;
  riskAdjusted: number;
  upfrontCash: number;
}

export type ScoreSet = Record<ScoreCategory, number>;

export type ConfidenceLabel = 'High' | 'Medium' | 'Low';

export interface ConfidenceItem {
  reason: string;
  penalty: number;
  /** Higher = matters more when explaining. */
  importance: 'major' | 'minor';
}

export interface ConfidenceResult {
  score: number;
  label: ConfidenceLabel;
  items: ConfidenceItem[];
}

export type RiskLevel = 'Low' | 'Moderate' | 'Elevated' | 'High';

export interface SupplierScore {
  supplierId: string;
  name: string;
  costs: CostBreakdown;
  scores: ScoreSet;
  overall: number;
  rank: number;
  confidence: ConfidenceResult;
  riskLevel: RiskLevel;
  strengths: string[];
  weaknesses: string[];
  /** Plain-English explanation of rank relative to the leader. */
  rankExplanation: string;
  /** Scoring notes where a default was substituted for an unknown input. */
  assumedInputs: string[];
}

export interface Evaluation {
  mode: DecisionMode;
  weights: DecisionWeights; // normalised to sum to 1
  results: SupplierScore[]; // sorted by rank
  qualityFailureCostBasis: number;
  qualityFailureCostAssumed: boolean;
  dailyDisruptionCost: number;
  dailyDisruptionCostAssumed: boolean;
  evaluatedQuantity: number;
}

export interface Recommendation {
  recommended: SupplierScore;
  nextBest: SupplierScore | null;
  confidence: ConfidenceResult;
  headline: string;
  whyThisSupplier: string;
  financial: {
    directCost: number;
    riskAdjustedCost: number;
    nextBestName: string | null;
    directDiffVsNext: number | null; // recommended − next (positive = recommended costs more)
    riskAdjustedDiffVsNext: number | null;
    qcAndFailureSavingsVsNext: number | null;
    summary: string;
  };
  benefits: string[];
  risks: string[];
  nextBestAnalysis: {
    whySecond: string;
    whenToChoose: string;
    biggestStrength: string;
    biggestWeakness: string;
  } | null;
}

export interface NegotiationItem {
  id: string;
  term: string;
  current: string;
  target: string;
  suggestion: string;
  rationale: string;
  estimatedValue: number | null;
  leverage?: string;
}

export interface BreakEvenResult {
  supplierId: string;
  name: string;
  currentRank: number;
  scoreGap: number;
  levers: { label: string; detail: string; feasible: boolean; gapClosed?: number }[];
  costParity: string | null;
  summary: string;
}

export interface SplitSuggestion {
  show: boolean;
  primaryName: string;
  secondaryName: string;
  primaryShare: number; // 0–1
  singleSourceCost: number;
  splitCost: number;
  premium: number;
  disruptionReduction: number;
  explanation: string;
  reasonNotShown?: string;
  outageDays: number;
  worstCaseSingle: number;
  worstCaseSplit: number;
}

export interface AppState {
  step: number;
  purchase: Purchase;
  priorities: Priorities;
  mode: DecisionMode;
  advancedWeights: DecisionWeights | null;
  assumptions: Assumptions;
  suppliers: Supplier[];
  isDemo: boolean;
}
