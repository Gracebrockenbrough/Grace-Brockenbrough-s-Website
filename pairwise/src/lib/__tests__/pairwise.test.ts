import { describe, expect, it } from 'vitest';
import { CANDIDATES, JOBS, demoState } from '../../data/seed';
import { mockAI } from '../ai/mock';
import { needsReconfirmation, shouldAutoPause } from '../intents';
import { detectSocialPattern, runPersonalPipeline, scorePersonalMatch, type PersonalContext } from '../matching/personal';
import { runProfessionalPipeline, scoreProfessionalMatch } from '../matching/professional';
import { isFaithful, tailorResume } from '../resume';
import { personalMatches, professionalMatches, professionalView } from '../views';

const ctx = (over: Partial<PersonalContext> = {}): PersonalContext => {
  const s = demoState();
  return { user: s.personal, shared: s.shared, crossDomain: true, feedback: s.feedback, broadened: false, smokerOk: false, ...over };
};
const cand = (id: string) => CANDIDATES.find((c) => c.id === id)!;

describe('personal matching', () => {
  it('shows a small set of introductions, never everyone', () => {
    const r = runPersonalPipeline(ctx(), CANDIDATES);
    expect(r.shown.length).toBeGreaterThanOrEqual(1);
    expect(r.shown.length).toBeLessThanOrEqual(3);
    expect(r.shown[0].candidateId).toBe('daniel');
  });

  it('applies hard boundaries, intent and inactivity filters', () => {
    const r = runPersonalPipeline(ctx(), CANDIDATES);
    const step = (id: string) => r.excluded.find((e) => e.candidateId === id)?.step;
    expect(step('sam')).toBe('hard_boundary'); // smoker vs "no smokers"
    expect(step('luca')).toBe('intent'); // casual vs long-term
    expect(step('evan')).toBe('inactive'); // paused
  });

  it('uses a reciprocal (geometric mean) score that penalises one-sided fits', () => {
    const r = scorePersonalMatch(ctx(), cand('theo'));
    expect(r.internalScore).toBeLessThanOrEqual(Math.sqrt(r.aToB * r.bToA) + 1e-9);
    const oneSided = Math.sqrt(0.95 * 0.3);
    expect(oneSided).toBeLessThan((0.95 + 0.3) / 2);
  });

  it('explains matches with reasons, concerns and what it cannot know', () => {
    const r = scorePersonalMatch(ctx(), cand('daniel'));
    expect(r.reasons).toContain('You both want a serious relationship while keeping your independence.');
    expect(r.concerns).toContain('You appear more spontaneous than he is.');
    expect(r.unknowns[0]).toMatch(/Chemistry/);
  });

  it('labels at most one exploratory introduction', () => {
    const r = runPersonalPipeline(ctx(), CANDIDATES);
    expect(r.shown.filter((x) => x.exploratory).length).toBeLessThanOrEqual(1);
  });

  it('says when nothing is strong enough instead of padding the list', () => {
    const r = runPersonalPipeline(ctx({ user: { ...demoState().personal, maxDistanceMiles: 2 } }), CANDIDATES);
    expect(r.shown).toHaveLength(0);
    expect(r.limitingFactor).toMatch(/location and age/);
  });

  it('never relaxes dealbreakers when broadened', () => {
    const r = runPersonalPipeline(ctx({ broadened: true }), CANDIDATES);
    expect(r.shown.some((x) => x.candidateId === 'sam')).toBe(false);
  });

  it('suggests (but does not apply) a pattern when behaviour contradicts a stated preference', () => {
    const s = demoState();
    const p = detectSocialPattern(s.personal, s.feedback, []);
    expect(p?.status).toBe('pending');
    expect(s.personal.preferredPartnerSocial).toBe(5);
  });
});

describe('professional matching', () => {
  const s = demoState();
  it('gates on required skills and only surfaces strong two-way fits', () => {
    const r = runProfessionalPipeline(s.professional, JOBS, 'active');
    expect(r.shown.map((x) => x.jobId)).toContain('harbor-vale');
    expect(r.shown.some((x) => x.jobId === 'orbit')).toBe(false);
    expect(r.shown.length).toBeLessThanOrEqual(3);
  });

  it('produces job-relevant reasons', () => {
    const r = scoreProfessionalMatch(s.professional, JOBS.find((j) => j.id === 'harbor-vale')!);
    expect(r.reasons).toContain('Your client-facing finance experience maps closely to the role.');
    expect(r.reasons).toContain('You’ve said you want relationship-driven financial work.');
  });

  it('turning Professional off surfaces nothing', () => {
    expect(runProfessionalPipeline(s.professional, JOBS, 'off').shown).toHaveLength(0);
  });
});

describe('data separation', () => {
  it('the professional view contains no dating data', () => {
    const json = JSON.stringify(professionalView(demoState()));
    for (const leak of ['relationshipIntent', 'Tyler', 'Marco', 'taller', 'wantsKids', 'dating', 'smoker', 'preferredPartnerSocial'])
      expect(json).not.toContain(leak);
  });
  it('professional scoring is unaffected by personal data', () => {
    const a = demoState();
    const b = { ...demoState(), personal: { ...a.personal, relationshipIntent: 'casual' as const, values: [] } };
    expect(professionalMatches(a)?.shown).toEqual(professionalMatches(b)?.shown);
  });
  it('turning Personal off stops personal matching', () => {
    expect(personalMatches({ ...demoState(), participation: { personal: false, professional: true } })).toBeNull();
  });
});

describe('smart resume', () => {
  it('reorders and selects but never changes text', () => {
    const s = demoState();
    for (const job of JOBS) {
      const t = tailorResume(s.professional.resume, job);
      expect(isFaithful(s.professional.resume, t)).toBe(true);
    }
    const wealth = tailorResume(s.professional.resume, JOBS[0]);
    expect(wealth.roles[0].bullets[0].tags).toContain('client');
  });
});

describe('status reconfirmation', () => {
  it('asks after a long silence and pauses after repeated misses', () => {
    const career = demoState().intents.find((i) => i.domain === 'professional')!;
    expect(needsReconfirmation(career)).toBe(true);
    expect(shouldAutoPause({ ...career, missedReconfirmations: 2 })).toBe(true);
  });
});

describe('mock AI onboarding', () => {
  it('asks a follow-up based on what was said, then extracts confirmable statements', async () => {
    const first = { question: 'What does your ideal week look like?', answer: 'I like going out on weekends but during the week I actually really need downtime. I want someone social but I don’t want to have to be doing things every second.' };
    const next = await mockAI.generateFollowUpQuestion([first], 'personal');
    expect(next.question).toMatch(/downtime/);
    const res = await mockAI.extractUserModel([first], 'personal');
    const keys = res.statements.map((s) => s.key);
    expect(keys).toContain('social_rhythm');
    expect(keys).toContain('independence');
    expect(res.attributes).toMatchObject({ weekdaySocial: 2, weekendSocial: 4, independence: 5 });
  });
});
