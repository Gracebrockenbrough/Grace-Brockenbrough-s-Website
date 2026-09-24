// Vendor-neutral AI service interface. Swap the mock for a real provider without touching the UI.
import type { Domain, FeedbackTag, JobOpportunity, MemoryCategory, ResumeMaster } from '../../types';
import type { TailoredResume } from '../resume';

export type OnboardingMode = 'personal' | 'professional' | 'both';

export interface Turn {
  question: string;
  answer: string;
}

export interface ExtractedStatement {
  id: string;
  text: string;
  domain: Domain;
  category: MemoryCategory;
  key: string;
  value: unknown;
  confidence: number;
  /** Private statements (e.g. appearance) are never shown to anyone else. */
  sensitive?: boolean;
}

export interface ExtractionResult {
  statements: ExtractedStatement[];
  attributes: Record<string, unknown>;
}

export interface MatchExplanationInput {
  name: string;
  reasons: string[];
  concerns: string[];
  unknowns: string[];
}

export interface FeedbackSummary {
  tags: FeedbackTag[];
  summary: string;
  learned: string | null;
}

export interface AIProvider {
  readonly name: string;
  generateFollowUpQuestion(history: Turn[], mode: OnboardingMode): Promise<{ question: string; done: boolean }>;
  extractUserModel(history: Turn[], mode: OnboardingMode): Promise<ExtractionResult>;
  explainMatch(input: MatchExplanationInput): Promise<{ why: string[]; lessSure: string[]; cannotKnow: string[] }>;
  summarizeFeedback(text: string): Promise<FeedbackSummary>;
  tailorResume(master: ResumeMaster, job: JobOpportunity): Promise<TailoredResume>;
  ask(question: string, context: { kind: 'match' | 'role'; name: string; reasons: string[]; concerns: string[]; facts: string[] }): Promise<string>;
}
