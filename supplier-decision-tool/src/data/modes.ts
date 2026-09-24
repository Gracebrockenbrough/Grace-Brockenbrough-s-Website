import type { DecisionMode, DecisionWeights } from '../types';

export interface ModeDefinition {
  id: DecisionMode;
  label: string;
  shortLabel: string;
  description: string;
  emphasis: string[];
  /** Preset category weights (percent). `custom` is derived from priorities instead. */
  weights: DecisionWeights | null;
}

export const MODES: ModeDefinition[] = [
  {
    id: 'lowest-risk',
    label: 'Lowest Risk',
    shortLabel: 'Lowest Risk',
    description: 'Minimise the chance and impact of quality failures, late deliveries and supplier problems.',
    emphasis: ['Quality', 'Low defect rates', 'Delivery reliability', 'Supplier stability', 'Contract protections', 'Low inspection requirements'],
    weights: {
      totalCost: 8,
      quality: 16,
      failureRisk: 18,
      deliveryReliability: 16,
      leadTime: 4,
      contractProtection: 14,
      paymentTerms: 2,
      supplierStrength: 10,
      flexibility: 4,
      supplyContinuity: 8,
    },
  },
  {
    id: 'lowest-cost',
    label: 'Lowest Total Cost',
    shortLabel: 'Lowest Cost',
    description: 'Minimise risk-adjusted total cost: price, logistics, fees, inspection, and expected failure and disruption costs.',
    emphasis: ['Purchase price', 'Shipping', 'Fees', 'Inspection', 'Expected defect costs', 'Expected disruption costs'],
    weights: {
      totalCost: 75,
      quality: 3,
      failureRisk: 4,
      deliveryReliability: 4,
      leadTime: 2,
      contractProtection: 3,
      paymentTerms: 4,
      supplierStrength: 2,
      flexibility: 1,
      supplyContinuity: 2,
    },
  },
  {
    id: 'quality-first',
    label: 'Quality First',
    shortLabel: 'Quality First',
    description: 'Strongly prioritise material quality, consistency and a clean inspection history.',
    emphasis: ['Quality rating', 'Defect rate', 'Certifications', 'Product consistency', 'Inspection history'],
    weights: {
      totalCost: 8,
      quality: 32,
      failureRisk: 28,
      deliveryReliability: 8,
      leadTime: 3,
      contractProtection: 9,
      paymentTerms: 2,
      supplierStrength: 5,
      flexibility: 2,
      supplyContinuity: 3,
    },
  },
  {
    id: 'fastest-supply',
    label: 'Fastest / Most Reliable Supply',
    shortLabel: 'Fastest Supply',
    description: 'Prioritise short lead times, on-time delivery, capacity and supply consistency.',
    emphasis: ['Lead time', 'On-time delivery', 'Capacity', 'Supply consistency'],
    weights: {
      totalCost: 8,
      quality: 6,
      failureRisk: 6,
      deliveryReliability: 24,
      leadTime: 26,
      contractProtection: 4,
      paymentTerms: 2,
      supplierStrength: 6,
      flexibility: 8,
      supplyContinuity: 10,
    },
  },
  {
    id: 'cash-preservation',
    label: 'Cash Preservation',
    shortLabel: 'Cash Preservation',
    description: 'Preserve working capital: longer payment terms, low deposits, low minimum orders and less cash tied up.',
    emphasis: ['Payment terms', 'Minimum order quantities', 'Inventory requirements', 'Lower upfront cash usage'],
    weights: {
      totalCost: 20,
      quality: 5,
      failureRisk: 6,
      deliveryReliability: 5,
      leadTime: 3,
      contractProtection: 5,
      paymentTerms: 42,
      supplierStrength: 3,
      flexibility: 8,
      supplyContinuity: 3,
    },
  },
  {
    id: 'balanced',
    label: 'Balanced',
    shortLabel: 'Balanced',
    description: 'Reasonable weights across cost, quality, delivery, protection and supplier strength.',
    emphasis: ['Total cost', 'Quality', 'Delivery', 'Protection', 'Supplier strength'],
    weights: {
      totalCost: 22,
      quality: 12,
      failureRisk: 12,
      deliveryReliability: 11,
      leadTime: 6,
      contractProtection: 9,
      paymentTerms: 7,
      supplierStrength: 8,
      flexibility: 5,
      supplyContinuity: 8,
    },
  },
  {
    id: 'custom',
    label: 'Custom (your priorities)',
    shortLabel: 'Custom',
    description: 'Weights derived from the priority ratings you set in Step 2, adjusted for the consequences of failure you described in Step 1.',
    emphasis: ['Your priority ratings'],
    weights: null,
  },
];

export const modeById = (id: DecisionMode): ModeDefinition => MODES.find((m) => m.id === id) ?? MODES[0];
