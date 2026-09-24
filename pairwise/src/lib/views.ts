// Namespaced read models. Each area of the app reads ONLY its own view, so dating data cannot
// leak into Professional and career data cannot leak into Personal.
import { CANDIDATES, JOBS } from '../data/seed';
import type { AppState, Intent, MemoryItem } from '../types';
import { runPersonalPipeline } from './matching/personal';
import { runProfessionalPipeline } from './matching/professional';

export const intentFor = (s: AppState, domain: Intent['domain']) => s.intents.find((i) => i.domain === domain)!;

/** Everything the Personal area may use. No resume, no employer data. */
export const personalView = (s: AppState) => ({
  profile: s.visiblePersonal,
  intent: intentFor(s, 'personal'),
  enabled: s.participation.personal,
  preferences: s.preferences.filter((p) => p.domain === 'personal'),
  introductions: s.introductions,
  pendingFeedback: s.pendingFeedback,
  patterns: s.patterns.filter((p) => p.domain === 'personal'),
  consecutivePasses: s.consecutivePasses,
  broadened: s.temporarilyBroadened,
});

/** Everything the Professional area may use. No dating model, feedback, preferences or matches. */
export const professionalView = (s: AppState) => ({
  profile: s.visibleProfessional,
  model: s.professional,
  intent: intentFor(s, 'professional'),
  enabled: s.participation.professional,
  preferences: s.preferences.filter((p) => p.domain === 'professional'),
  opportunities: s.opportunities,
  visibility: s.settings.professionalVisibility,
});

/** Memory the user can see and manage. Every item is private to Pairwise unless marked otherwise. */
export const memoryForDisplay = (s: AppState): MemoryItem[] =>
  s.memory.filter((m) => m.source !== 'user_rejected').sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const personalMatches = (s: AppState) => {
  const intent = intentFor(s, 'personal');
  const hidden = s.introductions.filter((i) => ['passed', 'hidden', 'blocked'].includes(i.status)).map((i) => i.candidateId);
  if (!s.participation.personal || intent.state === 'off' || intent.state === 'paused') return null;
  return runPersonalPipeline(
    {
      user: s.personal,
      shared: s.shared,
      crossDomain: s.settings.crossDomainLearning,
      feedback: s.feedback,
      broadened: s.temporarilyBroadened,
      smokerOk: !s.preferences.some((p) => p.domain === 'personal' && p.type === 'smoker' && p.strength === 'hard_requirement'),
    },
    CANDIDATES,
    { excludeIds: [...hidden, ...s.blockedIds], explorationRate: s.explorationRate },
  );
};

export const professionalMatches = (s: AppState) => {
  const v = professionalView(s);
  if (!v.enabled) return null;
  const dismissed = Object.entries(v.opportunities).filter(([, st]) => st === 'dismissed').map(([id]) => id);
  return runProfessionalPipeline(v.model, JOBS.filter((j) => !dismissed.includes(j.id)), v.intent.state);
};
