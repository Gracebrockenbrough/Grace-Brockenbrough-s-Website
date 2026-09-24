import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { demoState, emptyState } from '../data/seed';
import type { ExtractedStatement, OnboardingMode } from '../lib/ai/types';
import { detectSocialPattern, learnedSocialEnergy } from '../lib/matching/personal';
import { AUTO_PAUSE_AFTER_MISSED } from '../lib/intents';
import type {
  AppState,
  FeedbackRating,
  FeedbackTag,
  Intent,
  IntentState,
  IntroductionStatus,
  Level,
  MemoryItem,
  OpportunityStatus,
  Settings,
  UserProfile,
} from '../types';

const KEY = 'pairwise:v1';

const withPatterns = (s: AppState): AppState => {
  const p = detectSocialPattern(s.personal, s.feedback, s.patterns);
  return p ? { ...s, patterns: [...s.patterns, p] } : s;
};

const load = (): AppState => {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    /* storage unavailable: fall through to demo */
  }
  return withPatterns(demoState());
};

const save = (s: AppState) => {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* private mode or quota — the app still works for this session */
  }
};

const now = () => new Date().toISOString();
let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

const setIntent = (s: AppState, domain: Intent['domain'], patch: Partial<Intent>): AppState => ({
  ...s,
  intents: s.intents.map((i) => (i.domain === domain ? { ...i, ...patch } : i)),
});

export interface Actions {
  setIntentState: (domain: Intent['domain'], state: IntentState) => void;
  setParticipation: (domain: Intent['domain'], on: boolean) => void;
  reconfirm: (domain: Intent['domain'], keepLooking: boolean) => void;
  skipReconfirm: (domain: Intent['domain']) => void;
  updateProfile: (patch: Partial<UserProfile>) => void;
  confirmMemory: (id: string) => void;
  editMemory: (id: string, summary: string) => void;
  deleteMemory: (id: string) => void;
  markIncorrect: (id: string) => void;
  setMemoryVisibility: (id: string, visibility: MemoryItem['visibility']) => void;
  clearMemory: (domain: MemoryItem['domain'] | 'all') => void;
  answerPattern: (id: string, answer: 'yes' | 'maybe' | 'no') => void;
  setIntroduction: (candidateId: string, status: IntroductionStatus) => void;
  undoPass: (candidateId: string) => void;
  block: (candidateId: string) => void;
  setOpportunity: (jobId: string, status: OpportunityStatus) => void;
  submitFeedback: (pendingId: string, rating: FeedbackRating, tags: FeedbackTag[], note: string, learned: string | null) => void;
  recordMissingSignal: (tags: FeedbackTag[], note: string) => void;
  setBroadened: (on: boolean) => void;
  updatePersonalBounds: (ageRange: [number, number], maxDistanceMiles: number) => void;
  updateProfessional: (patch: Partial<AppState['professional']>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  completeOnboarding: (mode: OnboardingMode, statements: (ExtractedStatement & { verdict: 'right' | 'mostly' | 'edited' })[], attributes: Record<string, unknown>, profile: Partial<UserProfile>) => void;
  restartOnboarding: () => void;
  resetDemo: () => void;
  deleteAccount: () => void;
}

const Ctx = createContext<{ state: AppState; actions: Actions } | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(load);
  useEffect(() => {
    const t = window.setTimeout(() => save(state), 200);
    return () => window.clearTimeout(t);
  }, [state]);

  const up = useCallback((fn: (s: AppState) => AppState) => setState(fn), []);

  const actions = useMemo<Actions>(
    () => ({
      setIntentState: (domain, st) => up((s) => setIntent(s, domain, { state: st, lastConfirmedAt: now(), missedReconfirmations: 0 })),
      setParticipation: (domain, on) =>
        up((s) => ({
          ...setIntent(s, domain, { state: on ? (domain === 'personal' ? 'active' : 'passive') : 'off', lastConfirmedAt: now(), missedReconfirmations: 0 }),
          participation: { ...s.participation, [domain]: on },
        })),
      reconfirm: (domain, keep) =>
        up((s) => setIntent(s, domain, keep ? { lastConfirmedAt: now(), missedReconfirmations: 0 } : { state: 'paused', lastConfirmedAt: now(), missedReconfirmations: 0 })),
      skipReconfirm: (domain) =>
        up((s) => {
          const i = s.intents.find((x) => x.domain === domain)!;
          const missed = i.missedReconfirmations + 1;
          return setIntent(s, domain, missed >= AUTO_PAUSE_AFTER_MISSED ? { missedReconfirmations: missed, state: 'paused' } : { missedReconfirmations: missed });
        }),
      updateProfile: (p) =>
        up((s) => ({
          ...s,
          profile: { ...s.profile, ...p },
          // The visible dating profile shares name and photo, but not the full bio unless edited there.
          visiblePersonal: { ...s.visiblePersonal, firstName: p.firstName ?? s.visiblePersonal.firstName, photoHue: p.photoHue ?? s.visiblePersonal.photoHue },
        })),
      confirmMemory: (id) => up((s) => ({ ...s, memory: s.memory.map((m) => (m.id === id ? { ...m, confirmed: true, source: 'user_confirmed', confidence: Math.max(m.confidence, 0.9), updatedAt: now() } : m)) })),
      editMemory: (id, summary) =>
        up((s) => ({ ...s, memory: s.memory.map((m) => (m.id === id ? { ...m, summary, source: 'user_stated', confirmed: true, confidence: 0.95, updatedAt: now() } : m)) })),
      deleteMemory: (id) => up((s) => ({ ...s, memory: s.memory.filter((m) => m.id !== id) })),
      markIncorrect: (id) => up((s) => ({ ...s, memory: s.memory.map((m) => (m.id === id ? { ...m, source: 'user_rejected', confirmed: false, confidence: 0, updatedAt: now() } : m)) })),
      setMemoryVisibility: (id, visibility) => up((s) => ({ ...s, memory: s.memory.map((m) => (m.id === id ? { ...m, visibility, updatedAt: now() } : m)) })),
      clearMemory: (domain) => up((s) => ({ ...s, memory: domain === 'all' ? [] : s.memory.filter((m) => m.domain !== domain) })),
      answerPattern: (id, answer) =>
        up((s) => {
          const pattern = s.patterns.find((p) => p.id === id);
          if (!pattern) return s;
          let next: AppState = { ...s, patterns: s.patterns.map((p) => (p.id === id ? { ...p, status: answer } : p)) };
          if (pattern.memoryKey === 'partner_social_energy') {
            const learned = learnedSocialEnergy(s.feedback) ?? 3;
            if (answer === 'yes') {
              next = {
                ...next,
                personal: { ...next.personal, preferredPartnerSocial: Math.round(learned) as Level },
                preferences: next.preferences.map((p) => (p.type === 'social_energy' ? { ...p, value: Math.round(learned), label: 'Socially balanced partner', source: 'user_confirmed', confirmed: true } : p)),
                memory: [
                  ...next.memory.map((m) => (m.key === 'partner_social_energy' ? { ...m, summary: 'Balanced social energy suits you better than very outgoing.', value: Math.round(learned), source: 'user_confirmed' as const, confirmed: true, confidence: 0.85, updatedAt: now() } : m)),
                ],
              };
            } else if (answer === 'maybe') {
              // Soften the stated preference a little without replacing it.
              next = {
                ...next,
                personal: { ...next.personal, preferredPartnerSocial: 4 },
                memory: [
                  ...next.memory,
                  { id: uid('m'), domain: 'personal', category: 'patterns', key: 'social_pattern_possible', summary: 'Possibly prefers socially balanced partners (not confirmed).', value: learned, source: 'ai_inferred', origin: 'Pattern in your feedback', confidence: 0.55, confirmed: false, visibility: 'private_ai', createdAt: now(), updatedAt: now() },
                ],
              };
            }
          }
          return next;
        }),
      setIntroduction: (candidateId, status) =>
        up((s) => {
          const exists = s.introductions.some((i) => i.candidateId === candidateId);
          const introductions = exists
            ? s.introductions.map((i) => (i.candidateId === candidateId ? { ...i, status, updatedAt: now() } : i))
            : [...s.introductions, { candidateId, status, updatedAt: now() }];
          const consecutivePasses = status === 'passed' ? s.consecutivePasses + 1 : status === 'interested' || status === 'mutual' ? 0 : s.consecutivePasses;
          return { ...s, introductions, consecutivePasses };
        }),
      undoPass: (candidateId) =>
        up((s) => ({ ...s, introductions: s.introductions.map((i) => (i.candidateId === candidateId ? { ...i, status: 'viewed' } : i)), consecutivePasses: Math.max(0, s.consecutivePasses - 1) })),
      block: (candidateId) => up((s) => ({ ...s, blockedIds: [...new Set([...s.blockedIds, candidateId])] })),
      setOpportunity: (jobId, status) => up((s) => ({ ...s, opportunities: { ...s.opportunities, [jobId]: status } })),
      submitFeedback: (pendingId, rating, tags, note, learned) =>
        up((s) => {
          const pending = s.pendingFeedback.find((p) => p.id === pendingId);
          if (!pending) return s;
          const fb = { id: uid('f'), personName: pending.personName, rating, tags, note, otherSocialEnergy: pending.otherSocialEnergy, createdAt: now() };
          const summary =
            rating === 'see_again'
              ? `Would see ${pending.personName} again.`
              : rating === 'good_unsure'
                ? `${pending.personName}: good, but unsure.`
                : `${pending.personName} wasn’t a fit${tags.length ? ` (${tags.join(', ')})` : ''}.`;
          const memory: MemoryItem[] = [
            ...s.memory,
            { id: uid('m'), domain: 'personal', category: 'past_feedback', key: `feedback_${pending.personName.toLowerCase()}`, summary: note ? `${summary} “${note}”` : summary, value: rating, source: 'user_stated', origin: `Feedback after meeting ${pending.personName}`, confidence: 0.9, confirmed: true, visibility: 'private_ai', createdAt: now(), updatedAt: now() },
          ];
          if (learned)
            memory.push({ id: uid('m'), domain: 'personal', category: 'patterns', key: 'feedback_insight', summary: learned, value: learned, source: 'ai_inferred', origin: 'Your feedback notes', confidence: 0.5, confirmed: false, visibility: 'private_ai', createdAt: now(), updatedAt: now() });
          return withPatterns({ ...s, feedback: [...s.feedback, fb], pendingFeedback: s.pendingFeedback.filter((p) => p.id !== pendingId), memory });
        }),
      recordMissingSignal: (tags, note) =>
        up((s) => ({
          ...s,
          consecutivePasses: 0,
          // Explore a little more after repeated passes — but never ignore boundaries.
          explorationRate: Math.min(0.25, s.explorationRate + 0.05),
          memory: [
            ...s.memory,
            { id: uid('m'), domain: 'personal', category: 'patterns', key: 'passes_signal', summary: `Recent introductions didn’t feel right${tags.length ? `: ${tags.join(', ')}` : ''}${note ? ` — “${note}”` : ''}.`, value: tags, source: 'user_stated', origin: 'After several passes', confidence: 0.8, confirmed: true, visibility: 'private_ai', createdAt: now(), updatedAt: now() },
          ],
        })),
      setBroadened: (on) => up((s) => ({ ...s, temporarilyBroadened: on })),
      updatePersonalBounds: (ageRange, maxDistanceMiles) => up((s) => ({ ...s, personal: { ...s.personal, ageRange, maxDistanceMiles } })),
      updateProfessional: (p) => up((s) => ({ ...s, professional: { ...s.professional, ...p } })),
      updateSettings: (p) => up((s) => ({ ...s, settings: { ...s.settings, ...p } })),
      completeOnboarding: (mode, statements, attributes, profile) =>
        up((s) => {
          const personalOn = mode !== 'professional';
          const professionalOn = mode !== 'personal';
          const memory: MemoryItem[] = statements.map((st) => ({
            id: uid('m'),
            domain: st.domain,
            category: st.category,
            key: st.key,
            summary: st.text,
            value: st.value,
            source: st.verdict === 'right' ? 'user_confirmed' : 'user_stated',
            origin: 'Onboarding conversation',
            confidence: st.verdict === 'mostly' ? Math.min(st.confidence, 0.7) : 0.95,
            confirmed: true,
            visibility: 'private_ai',
            createdAt: now(),
            updatedAt: now(),
          }));
          const personal = { ...s.personal };
          for (const [k, v] of Object.entries(attributes)) if (k in personal) (personal as Record<string, unknown>)[k] = v;
          let next: AppState = {
            ...s,
            onboarded: true,
            participation: { personal: personalOn, professional: professionalOn },
            profile: { ...s.profile, ...profile },
            visiblePersonal: { ...s.visiblePersonal, firstName: profile.firstName ?? s.visiblePersonal.firstName },
            personal,
            memory: [...memory, ...s.memory.filter((m) => !memory.some((n) => n.key === m.key))],
          };
          next = setIntent(next, 'personal', { state: personalOn ? 'active' : 'off', lastConfirmedAt: now(), missedReconfirmations: 0 });
          next = setIntent(next, 'professional', { state: professionalOn ? (s.intents.find((i) => i.domain === 'professional')?.state === 'active' ? 'active' : 'passive') : 'off', lastConfirmedAt: now(), missedReconfirmations: 0 });
          return next;
        }),
      restartOnboarding: () => up((s) => ({ ...s, onboarded: false })),
      resetDemo: () => up(() => withPatterns(demoState())),
      deleteAccount: () => up(() => emptyState()),
    }),
    [up],
  );

  return <Ctx.Provider value={{ state, actions }}>{children}</Ctx.Provider>;
};

export const useStore = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
};
