// Personal (dating) matching: a transparent, deterministic weighted model.
// Scores are internal only — the UI shows reasons, never a percentage.
import type { Level, MatchFeedback, PatternSuggestion, PersonalCandidate, PersonalModel, SharedUserModel } from '../../types';

/** One side of a match, as seen by the scoring function. */
export interface Seeker {
  ageRange: [number, number];
  seeking: string[];
  maxDistanceMiles: number;
  acceptableIntents: PersonalModel['relationshipIntent'][];
  valuedTraits: string[];
  interests: string[];
  preferredPartnerSocial: Level;
  smokerOk: boolean;
  weekdaySocial: Level;
  weekendSocial: Level;
  independence: Level;
  spontaneity: Level;
  conflictStyle: PersonalModel['conflictStyle'];
  communication: PersonalModel['communication'];
  wantsKids: PersonalModel['wantsKids'];
  workSchedule?: SharedUserModel['workSchedule'];
}

export interface Person {
  age: number;
  gender: string;
  intent: PersonalModel['relationshipIntent'];
  values: string[];
  interests: string[];
  weekdaySocial: Level;
  weekendSocial: Level;
  independence: Level;
  spontaneity: Level;
  conflictStyle: PersonalModel['conflictStyle'];
  communication: PersonalModel['communication'];
  wantsKids: PersonalModel['wantsKids'];
  smoker: boolean;
  workSchedule?: SharedUserModel['workSchedule'];
}

/** Internal weights (sum to 1). Hard requirements gate first; the 20% rewards passing them. */
export const PERSONAL_WEIGHTS = {
  hardRequirements: 0.2,
  intentTiming: 0.15,
  values: 0.15,
  lifestyle: 0.1,
  communication: 0.1,
  mutualPreference: 0.1,
  interests: 0.05,
  socialRhythm: 0.05,
  attraction: 0.05,
  feedbackHistory: 0.05,
} as const;

export type PersonalComponent = keyof typeof PERSONAL_WEIGHTS;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const overlap = (a: string[], b: string[]) => a.filter((x) => b.includes(x));
const avgSocial = (p: { weekdaySocial: Level; weekendSocial: Level }) => (p.weekdaySocial * 5 + p.weekendSocial * 2) / 7;

const INTENT_FIT: Record<PersonalModel['relationshipIntent'], Record<PersonalModel['relationshipIntent'], number>> = {
  long_term: { long_term: 1, open_to_long_term: 0.8, unsure: 0.4, casual: 0.1 },
  open_to_long_term: { long_term: 0.85, open_to_long_term: 1, unsure: 0.6, casual: 0.35 },
  unsure: { long_term: 0.5, open_to_long_term: 0.7, unsure: 1, casual: 0.6 },
  casual: { long_term: 0.1, open_to_long_term: 0.4, unsure: 0.7, casual: 1 },
};

const kidsFit = (a: PersonalModel['wantsKids'], b: PersonalModel['wantsKids']) => {
  if (a === b) return 1;
  if ((a === 'yes' && b === 'no') || (a === 'no' && b === 'yes')) return 0;
  if (a === 'open' || b === 'open') return 0.75;
  return 0.5;
};

const conflictFit = (a: PersonalModel['conflictStyle'], b: PersonalModel['conflictStyle']) => {
  if (a === b) return 1;
  if (a === 'avoidant' || b === 'avoidant') return 0.35;
  return 0.65; // direct ↔ reflective
};

export interface HardCheck {
  pass: boolean;
  failures: ('age' | 'gender' | 'distance' | 'smoking')[];
}

export const hardChecks = (seeker: Seeker, other: Person, distanceMiles: number): HardCheck => {
  const failures: HardCheck['failures'] = [];
  if (other.age < seeker.ageRange[0] || other.age > seeker.ageRange[1]) failures.push('age');
  if (!seeker.seeking.includes(other.gender)) failures.push('gender');
  if (distanceMiles > seeker.maxDistanceMiles) failures.push('distance');
  if (!seeker.smokerOk && other.smoker) failures.push('smoking');
  return { pass: failures.length === 0, failures };
};

export interface DirectionalFit {
  score: number;
  hard: HardCheck;
  components: Record<PersonalComponent, number>;
}

/**
 * How well `other` fits what `seeker` wants (one direction).
 * `learnedSocial` is the social energy of people this seeker actually liked, if known.
 */
export const directionalFit = (seeker: Seeker, other: Person, distanceMiles: number, learnedSocial?: number): DirectionalFit => {
  const hard = hardChecks(seeker, other, distanceMiles);
  const intent = Math.max(...seeker.acceptableIntents.map((i) => INTENT_FIT[i][other.intent]));
  const valuesShared = overlap(seeker.valuedTraits, other.values).length;
  const values = seeker.valuedTraits.length ? clamp01(valuesShared / Math.min(3, seeker.valuedTraits.length)) : 0.5;
  const independence = 1 - Math.abs(seeker.independence - other.independence) / 4;
  const schedule =
    seeker.workSchedule === 'long_hours' ? (other.independence >= 4 ? 1 : 0.6) : seeker.workSchedule && other.workSchedule ? 0.85 : 0.8;
  const lifestyle = (kidsFit(seeker.wantsKids, other.wantsKids) + independence + schedule) / 3;
  const communication = 0.75 * conflictFit(seeker.conflictStyle, other.conflictStyle) + 0.25 * (seeker.communication === other.communication ? 1 : 0.6);
  const socialRhythm = 1 - (Math.abs(seeker.weekdaySocial - other.weekdaySocial) + Math.abs(seeker.weekendSocial - other.weekendSocial)) / 8;
  const interests = clamp01(overlap(seeker.interests, other.interests).length / 3);
  // Stated partner preferences (soft): social energy and spontaneity closeness.
  const socialPrefFit = 1 - Math.abs(seeker.preferredPartnerSocial - avgSocial(other)) / 4;
  const mutualPreference = clamp01(0.6 * socialPrefFit + 0.4 * (1 - Math.abs(seeker.spontaneity - other.spontaneity) / 4));
  // Physical attraction cannot be judged from data: kept neutral rather than guessed.
  const attraction = 0.7;
  const feedbackHistory = learnedSocial == null ? 0.7 : 1 - Math.abs(learnedSocial - avgSocial(other)) / 4;

  const components: Record<PersonalComponent, number> = {
    hardRequirements: hard.pass ? 1 : 0,
    intentTiming: intent,
    values,
    lifestyle,
    communication,
    mutualPreference,
    interests,
    socialRhythm,
    attraction,
    feedbackHistory,
  };
  const score = (Object.keys(PERSONAL_WEIGHTS) as PersonalComponent[]).reduce((s, k) => s + PERSONAL_WEIGHTS[k] * components[k], 0);
  return { score: hard.pass ? score : 0, hard, components };
};

// ---------- adapters ----------

export const seekerFromUser = (m: PersonalModel, shared: SharedUserModel | null, broadened = false, smokerOk = true): Seeker => ({
  ageRange: broadened ? [m.ageRange[0] - 2, m.ageRange[1] + 3] : m.ageRange,
  seeking: m.seeking,
  maxDistanceMiles: broadened ? Math.round(m.maxDistanceMiles * 1.5) : m.maxDistanceMiles,
  acceptableIntents: [m.relationshipIntent],
  valuedTraits: m.values,
  interests: m.interests,
  preferredPartnerSocial: m.preferredPartnerSocial,
  smokerOk,
  weekdaySocial: m.weekdaySocial,
  weekendSocial: m.weekendSocial,
  independence: m.independence,
  spontaneity: m.spontaneity,
  conflictStyle: m.conflictStyle,
  communication: m.communication,
  wantsKids: m.wantsKids,
  // Cross-domain: the work schedule only informs matching when the user allows it.
  workSchedule: shared?.workSchedule,
});

export const personFromUser = (m: PersonalModel, shared: SharedUserModel | null): Person => ({
  age: m.age,
  gender: m.gender,
  intent: m.relationshipIntent,
  values: m.values,
  interests: m.interests,
  weekdaySocial: m.weekdaySocial,
  weekendSocial: m.weekendSocial,
  independence: m.independence,
  spontaneity: m.spontaneity,
  conflictStyle: m.conflictStyle,
  communication: m.communication,
  wantsKids: m.wantsKids,
  smoker: m.smoker,
  workSchedule: shared?.workSchedule,
});

export const personFromCandidate = (c: PersonalCandidate): Person => ({
  age: c.age,
  gender: c.gender,
  intent: c.model.relationshipIntent,
  values: c.model.values,
  interests: c.model.interests,
  weekdaySocial: c.model.weekdaySocial,
  weekendSocial: c.model.weekendSocial,
  independence: c.model.independence,
  spontaneity: c.model.spontaneity,
  conflictStyle: c.model.conflictStyle,
  communication: c.model.communication,
  wantsKids: c.model.wantsKids,
  smoker: c.model.smoker,
  workSchedule: c.model.workSchedule,
});

export const seekerFromCandidate = (c: PersonalCandidate): Seeker => ({
  ageRange: c.preferences.ageRange,
  seeking: c.preferences.seeking,
  maxDistanceMiles: 25,
  acceptableIntents: c.preferences.wantsIntent,
  valuedTraits: c.preferences.valuedTraits,
  interests: c.model.interests,
  preferredPartnerSocial: c.preferences.preferredPartnerSocial,
  smokerOk: c.preferences.smokerOk,
  weekdaySocial: c.model.weekdaySocial,
  weekendSocial: c.model.weekendSocial,
  independence: c.model.independence,
  spontaneity: c.model.spontaneity,
  conflictStyle: c.model.conflictStyle,
  communication: c.model.communication,
  wantsKids: c.model.wantsKids,
  workSchedule: c.model.workSchedule,
});

// ---------- learning from feedback ----------

/**
 * Social energy of people the user actually liked. Returns undefined when there is too little,
 * or too inconsistent, feedback to trust.
 */
export const learnedSocialEnergy = (feedback: MatchFeedback[]): number | undefined => {
  const liked = feedback.filter((f) => f.rating === 'see_again' || f.rating === 'good_unsure');
  if (liked.length < 2) return undefined;
  const negative = feedback.filter((f) => f.rating === 'definitely_not' || f.rating === 'not_really').length;
  // Chronic negativity makes feedback a weaker signal.
  if (negative / feedback.length > 0.8) return undefined;
  return liked.reduce((s, f) => s + f.otherSocialEnergy, 0) / liked.length;
};

/**
 * If behaviour contradicts a stated preference, propose a pattern for the user to confirm.
 * Never changes the profile by itself.
 */
export const detectSocialPattern = (m: PersonalModel, feedback: MatchFeedback[], existing: PatternSuggestion[]): PatternSuggestion | null => {
  if (existing.some((p) => p.memoryKey === 'partner_social_energy')) return null;
  const learned = learnedSocialEnergy(feedback);
  if (learned == null) return null;
  const likedCount = feedback.filter((f) => f.rating === 'see_again').length;
  if (m.preferredPartnerSocial - learned >= 1.2 && likedCount >= 2) {
    return {
      id: 'pattern-social',
      domain: 'personal',
      memoryKey: 'partner_social_energy',
      prompt:
        'I noticed something. You say highly outgoing people are important, but several of the people you’ve liked most have been more balanced socially. Should I take that into account?',
      status: 'pending',
    };
  }
  return null;
};

// ---------- reciprocal score and pipeline ----------

export interface PersonalMatchResult {
  candidateId: string;
  internalScore: number;
  hardConstraintPass: boolean;
  aToB: number;
  bToA: number;
  reasons: string[];
  concerns: string[];
  unknowns: string[];
  confidence: number;
  exploratory: boolean;
}

export const timingFit = (lastActiveDays: number) => (lastActiveDays <= 7 ? 1 : lastActiveDays <= 30 ? 0.85 : 0.6);
export const availabilityFit = (state: PersonalCandidate['intentState']) => (state === 'active' ? 1 : state === 'passive' ? 0.8 : 0);

export const candidateConfidence = (c: PersonalCandidate, feedbackCount: number) =>
  Math.min(1, 0.55 + (c.verified.identity ? 0.2 : 0) + (c.verified.photo ? 0.1 : 0) + (feedbackCount >= 3 ? 0.15 : feedbackCount * 0.04));

export const VALUE_LABEL: Record<string, string> = { family: 'family', kindness: 'kindness', ambition: 'ambition', honesty: 'honesty', growth: 'growth', curiosity: 'curiosity' };

const explain = (user: PersonalModel, c: PersonalCandidate, fit: DirectionalFit, crossDomain: boolean, shared: SharedUserModel) => {
  const reasons: string[] = [];
  const concerns: string[] = [];
  const he = c.gender === 'woman' ? 'she' : c.gender === 'man' ? 'he' : 'they';
  const him = c.gender === 'woman' ? 'her' : c.gender === 'man' ? 'him' : 'them';
  const sharedValues = overlap(user.values, c.model.values);
  if (user.relationshipIntent === 'long_term' && c.model.relationshipIntent === 'long_term') {
    reasons.push(user.independence >= 4 && c.model.independence >= 4
      ? 'You both want a serious relationship while keeping your independence.'
      : 'You both want a serious, long-term relationship.');
  } else if (fit.components.intentTiming >= 0.8) {
    reasons.push(`${c.firstName} is open to something long-term, which fits what you want.`);
  }
  if (fit.components.socialRhythm >= 0.75) reasons.push('Your social rhythms are similar: quieter weeks, more active weekends.');
  if (sharedValues.length >= 2) reasons.push(`You both prioritize ${sharedValues.slice(0, 3).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`);
  const sharedInterests = overlap(user.interests, c.model.interests);
  if (sharedInterests.length >= 2) reasons.push(`Your lifestyles overlap around ${sharedInterests.slice(0, 2).join(' and ')}.`);
  if (crossDomain && shared.workSchedule === 'long_hours' && c.model.independence >= 4)
    reasons.push(`${c.firstName} has a full life of ${him === 'them' ? 'their' : him === 'her' ? 'her' : 'his'} own, which suits a demanding schedule.`);

  if (user.spontaneity - c.model.spontaneity >= 2) concerns.push(`You appear more spontaneous than ${he} is.`);
  if (user.conflictStyle === 'direct' && c.model.conflictStyle !== 'direct')
    concerns.push(`You tend to address conflict directly, while ${he} appears more reserved.`);
  if (c.model.weekendSocial - user.weekendSocial >= 1 && c.model.weekdaySocial > user.weekdaySocial)
    concerns.push(`${c.firstName} is more social during the week than you usually are.`);
  if (c.model.workSchedule === 'long_hours' && crossDomain && shared.workSchedule === 'long_hours')
    concerns.push('You both keep long hours, so finding time together may take effort.');
  if (sharedInterests.length < 2) concerns.push('Your day-to-day interests overlap less than usual.');

  const unknowns = ['Chemistry — that only shows up in person.'];
  if (!c.verified.identity) unknowns.push(`${c.firstName} hasn’t completed identity verification yet.`);
  return { reasons: reasons.slice(0, 4), concerns: concerns.slice(0, 2), unknowns };
};

export interface PersonalContext {
  user: PersonalModel;
  shared: SharedUserModel;
  crossDomain: boolean;
  feedback: MatchFeedback[];
  /** User chose "Temporarily broaden" — age and distance loosen slightly. */
  broadened: boolean;
  /** False when the user has a hard "no smokers" boundary. */
  smokerOk: boolean;
}

export const scorePersonalMatch = (ctx: PersonalContext, c: PersonalCandidate): PersonalMatchResult => {
  const sharedForMatching = ctx.crossDomain ? ctx.shared : null;
  const learned = learnedSocialEnergy(ctx.feedback);
  const aToBFit = directionalFit(seekerFromUser(ctx.user, sharedForMatching, ctx.broadened, ctx.smokerOk), personFromCandidate(c), c.distanceMiles, learned);
  const bToAFit = directionalFit(seekerFromCandidate(c), personFromUser(ctx.user, sharedForMatching), c.distanceMiles);
  const hardPass = aToBFit.hard.pass && bToAFit.hard.pass;
  const confidence = candidateConfidence(c, ctx.feedback.length);
  const reciprocal = Math.sqrt(aToBFit.score * bToAFit.score);
  const internal =
    reciprocal * timingFit(c.lastActiveDays) * availabilityFit(c.intentState) * (hardPass ? 1 : 0) * (0.85 + 0.15 * confidence);
  const text = explain(ctx.user, c, aToBFit, ctx.crossDomain, ctx.shared);
  return {
    candidateId: c.id,
    internalScore: internal,
    hardConstraintPass: hardPass,
    aToB: aToBFit.score,
    bToA: bToAFit.score,
    ...text,
    confidence,
    exploratory: false,
  };
};

export interface PipelineResult {
  shown: PersonalMatchResult[];
  all: PersonalMatchResult[];
  excluded: { candidateId: string; step: 'inactive' | 'hard_boundary' | 'intent' | 'geography' | 'low_fit'; detail: string }[];
  /** Plain-English explanation when nothing strong enough is available. */
  limitingFactor: string | null;
}

export const STRONG_THRESHOLD = 0.62;
export const EXPLORE_THRESHOLD = 0.55;

/** Steps A–K of the personal pipeline. */
export const runPersonalPipeline = (
  ctx: PersonalContext,
  candidates: PersonalCandidate[],
  opts: { excludeIds?: string[]; limit?: number; explorationRate?: number } = {},
): PipelineResult => {
  const excluded: PipelineResult['excluded'] = [];
  const limit = opts.limit ?? 3;
  const pool: PersonalMatchResult[] = [];
  const seeker = seekerFromUser(ctx.user, ctx.crossDomain ? ctx.shared : null, ctx.broadened, ctx.smokerOk);

  for (const c of candidates) {
    if (opts.excludeIds?.includes(c.id)) continue;
    // A: inactive or paused people are never introduced.
    if (c.intentState === 'paused' || c.intentState === 'off' || c.lastActiveDays > 30) {
      excluded.push({ candidateId: c.id, step: 'inactive', detail: 'Not currently active' });
      continue;
    }
    const hard = hardChecks(seeker, personFromCandidate(c), c.distanceMiles);
    // B: hard boundaries (both directions).
    if (hard.failures.includes('smoking') || hard.failures.includes('gender') || hard.failures.includes('age')) {
      excluded.push({ candidateId: c.id, step: 'hard_boundary', detail: hard.failures.join(', ') });
      continue;
    }
    // D: geography.
    if (hard.failures.includes('distance')) {
      excluded.push({ candidateId: c.id, step: 'geography', detail: `${c.distanceMiles} mi away` });
      continue;
    }
    const r = scorePersonalMatch(ctx, c);
    if (!r.hardConstraintPass) {
      excluded.push({ candidateId: c.id, step: 'hard_boundary', detail: 'Their boundaries' });
      continue;
    }
    // C: intent/timing — a strong intent mismatch is not worth an introduction.
    if (INTENT_FIT[ctx.user.relationshipIntent][c.model.relationshipIntent] < 0.3) {
      excluded.push({ candidateId: c.id, step: 'intent', detail: `Wants ${c.model.relationshipIntent.replace(/_/g, ' ')}` });
      continue;
    }
    pool.push(r);
  }

  // J: rank.
  pool.sort((a, b) => b.internalScore - a.internalScore);
  const strong = pool.filter((r) => r.internalScore >= STRONG_THRESHOLD);
  const shown = strong.slice(0, limit);

  // I: exploration — when there is room, one slot can go to a thoughtful "different direction".
  const rate = opts.explorationRate ?? 0.15;
  const novelty = (r: PersonalMatchResult) => {
    const c = candidates.find((x) => x.id === r.candidateId)!;
    return 1 - c.model.interests.filter((i) => ctx.user.interests.includes(i)).length / 3;
  };
  if (rate >= 0.1 && shown.length >= 2) {
    const explore = pool
      .filter((r) => r !== shown[0] && r.internalScore >= EXPLORE_THRESHOLD && novelty(r) >= 0.5)
      .sort((x, y) => novelty(y) - novelty(x) || y.internalScore - x.internalScore)[0];
    if (explore) {
      const rest = shown.filter((r) => r !== explore).slice(0, Math.min(limit, shown.length + (shown.includes(explore) ? 0 : 1)) - 1);
      shown.splice(0, shown.length, ...rest, { ...explore, exploratory: true });
    }
  }

  for (const r of pool) if (!shown.some((s) => s.candidateId === r.candidateId)) excluded.push({ candidateId: r.candidateId, step: 'low_fit', detail: 'Not a strong enough mutual fit' });

  let limitingFactor: string | null = null;
  if (shown.length === 0) {
    const boundaryCount = excluded.filter((e) => e.step === 'geography' || (e.step === 'hard_boundary' && /age/.test(e.detail))).length;
    limitingFactor =
      boundaryCount > 0
        ? 'Your current preferences around location and age are limiting the available pool.'
        : 'The people currently available don’t fit what you’ve told me matters most.';
  }
  return { shown, all: pool, excluded, limitingFactor };
};
