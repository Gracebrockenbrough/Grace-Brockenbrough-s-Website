import type {
  CancellationFlexibility,
  DataSource,
  Level,
  MaterialCategory,
  PriorityFactor,
  PriorityLevel,
  PurchaseFrequency,
  Relationship,
  ReplacementPolicy,
  ReturnShippingPayer,
  ScoreCategory,
  Severity,
} from '../types';

export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  'Metals',
  'Chemicals',
  'Plastics',
  'Textiles',
  'Packaging',
  'Food ingredients',
  'Electronics components',
  'Construction materials',
  'Manufacturing components',
  'Other',
];

export const FREQUENCIES: { value: PurchaseFrequency; label: string }[] = [
  { value: 'one-time', label: 'One-time purchase' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'annual', label: 'Annual contract' },
  { value: 'ongoing', label: 'Ongoing / recurring' },
];

export const SEVERITIES: { value: Severity; label: string; hint: string }[] = [
  { value: 'low', label: 'Low', hint: 'Minor rework or inconvenience' },
  { value: 'moderate', label: 'Moderate', hint: 'Noticeable cost or schedule impact' },
  { value: 'high', label: 'High', hint: 'Production stoppage, scrap, or customer impact' },
  { value: 'critical', label: 'Critical', hint: 'Safety, regulatory, or major contractual exposure' },
];

export const LEVELS: { value: Level | 'unknown'; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'high', label: 'High' },
  { value: 'unknown', label: 'Unknown' },
];

export const RELATIONSHIPS: { value: Relationship; label: string }[] = [
  { value: 'new', label: 'New supplier' },
  { value: 'limited', label: 'Limited history' },
  { value: 'existing', label: 'Existing supplier' },
  { value: 'strategic', label: 'Strategic supplier' },
];

export const REPLACEMENT_POLICIES: { value: ReplacementPolicy; label: string }[] = [
  { value: 'full', label: 'Full replacement or refund for verified defects' },
  { value: 'replacement-only', label: 'Replacement only' },
  { value: 'credit', label: 'Credit toward future orders' },
  { value: 'case-by-case', label: 'Case-by-case' },
  { value: 'none', label: 'No replacement' },
  { value: 'unknown', label: 'Unknown' },
];

export const RETURN_SHIPPING: { value: ReturnShippingPayer; label: string }[] = [
  { value: 'supplier', label: 'Supplier pays' },
  { value: 'shared', label: 'Shared' },
  { value: 'buyer', label: 'Buyer pays' },
  { value: 'unknown', label: 'Unknown' },
];

export const CANCELLATION: { value: CancellationFlexibility; label: string }[] = [
  { value: 'penalty-free', label: 'Penalty-free with notice' },
  { value: 'fee', label: 'Cancellation fee applies' },
  { value: 'non-cancellable', label: 'Non-cancellable once production begins' },
  { value: 'unknown', label: 'Unknown' },
];

export const DATA_SOURCES: { value: DataSource; label: string }[] = [
  { value: 'verified', label: 'Independently verified / audited' },
  { value: 'internal-history', label: 'Our own receiving history' },
  { value: 'self-reported', label: 'Supplier self-reported' },
  { value: 'unknown', label: 'Unknown' },
];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'MXN', 'CNY', 'JPY', 'INR', 'AUD', 'CHF'];

export const PRIORITY_LEVELS: { value: PriorityLevel; label: string }[] = [
  { value: 0, label: 'Not Important' },
  { value: 1, label: 'Slightly Important' },
  { value: 2, label: 'Important' },
  { value: 3, label: 'Very Important' },
  { value: 4, label: 'Critical' },
];

export const PRIORITY_FACTORS: { key: PriorityFactor; label: string; description: string }[] = [
  { key: 'quality', label: 'Material quality', description: 'Quality rating, batch consistency, certifications' },
  { key: 'defectRisk', label: 'Low defect risk', description: 'Estimated and historical defect rates' },
  { key: 'totalCost', label: 'Lowest total cost', description: 'Risk-adjusted total cost, not just unit price' },
  { key: 'fastDelivery', label: 'Fast delivery', description: 'Quoted lead time' },
  { key: 'reliableDelivery', label: 'Reliable delivery', description: 'On-time performance and lead-time variability' },
  { key: 'contractProtection', label: 'Contract protection', description: 'Warranty, liability, penalties and credits' },
  { key: 'returnFlexibility', label: 'Return flexibility', description: 'Return window, return freight, replacement policy' },
  { key: 'insurance', label: 'Insurance protection', description: 'Product liability and insurance coverage' },
  { key: 'financialStrength', label: 'Supplier financial strength', description: 'Financial rating, years in business, relationship' },
  { key: 'paymentTerms', label: 'Payment terms', description: 'Days to pay, deposits, cash tied up' },
  { key: 'priceStability', label: 'Price stability', description: 'Price-lock duration' },
  { key: 'flexibility', label: 'Supplier flexibility', description: 'Cancellation, surge capacity, expediting, MOQ' },
  { key: 'lowInspection', label: 'Low inspection requirements', description: 'Incoming inspection and testing burden' },
];

export const CATEGORY_LABELS: Record<ScoreCategory, string> = {
  totalCost: 'Total Cost',
  quality: 'Material Quality',
  failureRisk: 'Failure Risk',
  deliveryReliability: 'Delivery Reliability',
  leadTime: 'Lead Time',
  contractProtection: 'Contract Protection',
  paymentTerms: 'Payment Terms',
  supplierStrength: 'Supplier Strength',
  flexibility: 'Flexibility',
  supplyContinuity: 'Supply Continuity',
};

export const CATEGORY_DESCRIPTIONS: Record<ScoreCategory, string> = {
  totalCost: 'Risk-adjusted total cost relative to the lowest-cost supplier. Each 1% above the lowest costs 3 points.',
  quality: 'Material quality rating (60%), batch consistency (20%), certifications (10%) and past quality incidents (10%).',
  failureRisk: 'Effective defect rate: 100 − 60 × defect %. Higher score = lower risk of quality failure.',
  deliveryReliability: 'Historical on-time delivery (80%) and lead-time variability (20%).',
  leadTime: 'Quoted lead time relative to the fastest supplier (fastest = 100).',
  contractProtection: 'Returns, replacement, warranty, liability/insurance, defect compensation, late-delivery credits, price lock and cancellation terms.',
  paymentTerms: 'Payment days (70%), deposit required (20%) and minimum order vs. your need (10%).',
  supplierStrength: 'Financial strength rating (50%), years in business (25%) and relationship depth (25%).',
  flexibility: 'Cancellation terms, surge capacity, expedited shipping and MOQ flexibility.',
  supplyContinuity: '100 − disruption risk index (on-time delivery, variability, financial strength, concentration, geography, raw-material risk).',
};

export const SCORE_CATEGORIES: ScoreCategory[] = [
  'totalCost',
  'quality',
  'failureRisk',
  'deliveryReliability',
  'leadTime',
  'contractProtection',
  'paymentTerms',
  'supplierStrength',
  'flexibility',
  'supplyContinuity',
];
