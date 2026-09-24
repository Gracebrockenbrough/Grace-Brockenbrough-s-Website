import type { AppState, Assumptions, Priorities, Purchase, Supplier } from '../types';

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  referenceDefectRate: 1,
  expectedDisruptionDaysAtMaxRisk: 10,
  costOfCapital: 8,
};

export const DEFAULT_PRIORITIES: Priorities = {
  quality: 2,
  defectRisk: 2,
  totalCost: 2,
  fastDelivery: 2,
  reliableDelivery: 2,
  contractProtection: 2,
  returnFlexibility: 2,
  insurance: 2,
  financialStrength: 2,
  paymentTerms: 2,
  priceStability: 2,
  flexibility: 2,
  lowInspection: 2,
};

export const emptyPurchase = (): Purchase => ({
  name: '',
  category: 'Metals',
  customCategory: '',
  usage: '',
  frequency: 'annual',
  quantity: null,
  unit: 'lbs',
  baseCurrency: 'USD',
  defectConsequence: 'moderate',
  qualityFailureImpact: null,
  interruptionConsequence: 'moderate',
  dailyDisruptionCost: null,
});

let counter = 0;
export const newId = (): string => `s_${Date.now().toString(36)}_${(counter++).toString(36)}`;

export const emptySupplier = (baseCurrency = 'USD'): Supplier => ({
  id: newId(),
  info: {
    name: '',
    quoteDate: '',
    quoteReference: '',
    location: '',
    country: '',
    yearsInBusiness: null,
    supplierQualityRating: null,
    financialStrength: null,
    relationship: 'new',
    onboardingCost: null,
  },
  quote: {
    unitPrice: null,
    quotedQuantity: null,
    volumeDiscountPct: null,
    currency: baseCurrency,
    fxRate: null,
    freight: null,
    insurance: null,
    duties: null,
    handling: null,
    warehousing: null,
    otherLogistics: null,
    logisticsCostBasis: 'firm',
    moq: null,
    paymentTermsDays: null,
    depositPct: null,
    priceLockMonths: null,
    contractLengthMonths: null,
    cancellationFeePct: null,
    cancellation: 'unknown',
    adminFees: null,
  },
  delivery: {
    leadTimeDays: null,
    onTimePct: null,
    leadTimeVariabilityDays: null,
    expeditedAvailable: 'unknown',
    surgeCapacity: 'unknown',
  },
  quality: {
    qualityRating: null,
    estimatedDefectPct: null,
    historicalDefectPct: null,
    qualityDataSource: 'unknown',
    certifications: '',
    batchConsistency: null,
    inspectionRequired: 'unknown',
    inspectionCost: null,
    testingCost: null,
    certificationReviewCost: null,
    pastQualityIncidents: null,
  },
  protection: {
    returnWindowDays: null,
    returnShipping: 'unknown',
    replacementPolicy: 'unknown',
    warrantyMonths: null,
    productLiability: 'unknown',
    insuranceCoverage: 'unknown',
    defectCompensation: 'unknown',
    lateDeliveryCredits: 'unknown',
  },
  risk: {
    singleSource: 'unknown',
    multipleFacilities: 'unknown',
    backupProduction: 'unknown',
    geographicRisk: 'unknown',
    supplyChainConcentration: 'unknown',
    rawMaterialAvailabilityRisk: 'unknown',
  },
  notes: '',
});

export const initialState = (): AppState => ({
  step: 0,
  purchase: emptyPurchase(),
  priorities: { ...DEFAULT_PRIORITIES },
  mode: 'balanced',
  advancedWeights: null,
  assumptions: { ...DEFAULT_ASSUMPTIONS },
  suppliers: [emptySupplier(), emptySupplier()],
  isDemo: false,
});
