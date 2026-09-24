// Professional matching. By construction this module only receives the ProfessionalModel —
// it has no access to personal/dating data or protected characteristics.
import type { IntentState, JobOpportunity, ProfessionalModel } from '../../types';

export interface ProfessionalMatchResult {
  jobId: string;
  internalScore: number;
  hardConstraintPass: boolean;
  candidateSide: number;
  employerSide: number;
  reasons: string[];
  concerns: string[];
  confidence: number;
  gateFailure?: string;
}

const norm = (s: string) => s.toLowerCase().trim();
const has = (list: string[], item: string) => list.map(norm).includes(norm(item));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const LEVELS: ProfessionalModel['level'][] = ['entry', 'mid', 'senior', 'lead'];

export const locationFit = (c: ProfessionalModel, job: JobOpportunity): { score: number; concern?: string } => {
  const cityMatch = c.preferredLocations.some((l) => norm(job.location).includes(norm(l)));
  if (job.workModel === 'remote') return c.workModels.includes('remote') ? { score: 1 } : { score: 0.6, concern: 'Fully remote, and you said you prefer some time in person.' };
  if (cityMatch) return c.workModels.includes(job.workModel) ? { score: 1 } : { score: 0.55, concern: 'Fully on-site, while you prefer hybrid or remote work.' };
  return { score: job.workModel === 'hybrid' ? 0.45 : 0.25, concern: `Based in ${job.location}, so it would likely mean relocating.` };
};

export const compFit = (c: ProfessionalModel, job: JobOpportunity) => {
  if (!job.salaryRange) return 0.7;
  return clamp01(job.salaryRange[1] / c.minCompensation);
};

/** Candidate interest fit: would this person plausibly want the role? */
export const candidateSideFit = (c: ProfessionalModel, job: JobOpportunity) => {
  const interestHits = c.interests.filter((i) => [job.industry, ...job.tags, ...job.functions, job.company.stage].some((t) => norm(t).includes(norm(i).split(' ')[0]))).length;
  const interest = clamp01(interestHits / 2);
  const style = ((job.teamStyle === c.teamStyle || job.teamStyle === 'mixed' ? 1 : 0.5) + (job.managerStyle === c.managerStyle ? 1 : 0.6)) / 2;
  const stage = c.companyStages.includes(job.company.stage) ? 1 : 0.6;
  const career = clamp01(job.functions.filter((f) => has(c.functions, f)).length / 1 + (interestHits > 0 ? 0.3 : 0));
  const loc = locationFit(c, job).score;
  return { score: 0.25 * interest + 0.25 * loc + 0.15 * compFit(c, job) + 0.15 * style + 0.1 * stage + 0.1 * clamp01(career), interest, style, loc, career: clamp01(career) };
};

/** Employer qualification fit: would the employer plausibly want this candidate? Job-relevant only. */
export const employerSideFit = (c: ProfessionalModel, job: JobOpportunity) => {
  const required = job.requiredSkills.filter((s) => has(c.skills, s)).length / Math.max(1, job.requiredSkills.length);
  const preferred = job.preferredSkills.length ? job.preferredSkills.filter((s) => has(c.skills, s) || (s === 'cfa' && c.resume.certifications.some((x) => /cfa/i.test(x)))).length / job.preferredSkills.length : 0.7;
  const levelGap = Math.abs(LEVELS.indexOf(c.level) - LEVELS.indexOf(job.level));
  const level = levelGap === 0 ? 1 : levelGap === 1 ? 0.7 : 0.3;
  const functionFit = job.functions.some((f) => has(c.functions, f)) ? 1 : 0.5;
  return { score: 0.25 * required + 0.35 * preferred + 0.25 * level + 0.15 * functionFit, required, preferred, level };
};

export const availabilityFactor = (state: IntentState) => (state === 'active' ? 1 : state === 'passive' ? 0.92 : 0);

const reasonsFor = (c: ProfessionalModel, job: JobOpportunity, cs: ReturnType<typeof candidateSideFit>, es: ReturnType<typeof employerSideFit>) => {
  const reasons: string[] = [];
  if (job.tags.includes('client') && has(c.skills, 'client relationships')) {
    reasons.push(has(c.industries, 'wealth management') || c.industries.some((i) => /bank|finance/.test(i))
      ? 'Your client-facing finance experience maps closely to the role.'
      : 'Your client-facing experience maps closely to the role.');
  }
  if (job.tags.includes('wealth') && c.interests.some((i) => /wealth/.test(i))) reasons.push('You’ve said you want relationship-driven financial work.');
  if (job.tags.includes('modeling') && has(c.skills, 'financial modeling')) reasons.push(job.tags.includes('fp&a') ? 'Financial planning and modeling experience' : 'Strong financial modeling background');
  if (job.company.stage === 'growth' && c.interests.some((i) => /growth|fintech/.test(i))) reasons.push('Interest in high-growth companies');
  if (job.teamStyle === 'collaborative' && c.teamStyle === 'collaborative')
    reasons.push(job.company.stage === 'boutique' ? 'The firm’s collaborative structure aligns with your preferred environment.' : 'Collaborative team, which fits how you like to work.');
  if (job.workModel === 'remote' && c.workModels.includes('remote')) reasons.push('Fully remote, which fits your preference.');
  if (job.tags.includes('technical') && has(c.skills, 'sql')) reasons.push('Your SQL and automation work is a plus here.');
  if (es.preferred >= 0.75 && reasons.length < 2) reasons.push('You bring most of the preferred skills.');
  void cs;
  return reasons.slice(0, 3);
};

const concernsFor = (c: ProfessionalModel, job: JobOpportunity, cs: ReturnType<typeof candidateSideFit>, es: ReturnType<typeof employerSideFit>) => {
  const concerns: string[] = [];
  const loc = locationFit(c, job);
  if (loc.concern) concerns.push(loc.concern);
  if (job.salaryRange && job.salaryRange[1] < c.minCompensation) concerns.push('The pay range sits below your target.');
  if (job.managerStyle !== c.managerStyle) concerns.push(job.managerStyle === 'hands_off' ? 'The manager is fairly hands-off; you said you like coaching.' : 'Management style differs from what you prefer.');
  if (es.level < 1) concerns.push(LEVELS.indexOf(job.level) < LEVELS.indexOf(c.level) ? 'Likely a step below your current level.' : 'A step above your current level.');
  void cs;
  return concerns.slice(0, 2);
};

/** Two-sided professional score. A role only ranks well if both sides plausibly want it. */
export const scoreProfessionalMatch = (candidate: ProfessionalModel, job: JobOpportunity, intent: IntentState = 'active'): ProfessionalMatchResult => {
  const missingRequired = job.requiredSkills.filter((s) => !has(candidate.skills, s));
  const gatePass = job.active && missingRequired.length === 0;
  const cs = candidateSideFit(candidate, job);
  const es = employerSideFit(candidate, job);
  const reciprocal = Math.sqrt(cs.score * es.score);
  return {
    jobId: job.id,
    internalScore: gatePass ? reciprocal * availabilityFactor(intent) : 0,
    hardConstraintPass: gatePass,
    candidateSide: cs.score,
    employerSide: es.score,
    reasons: reasonsFor(candidate, job, cs, es),
    concerns: concernsFor(candidate, job, cs, es),
    confidence: 0.7 + (candidate.resume.roles.length >= 2 ? 0.15 : 0) + (job.salaryRange ? 0.1 : 0),
    gateFailure: gatePass ? undefined : !job.active ? 'Role is closed' : `Requires ${missingRequired.join(', ')}`,
  };
};

export const PROFESSIONAL_THRESHOLD = { active: 0.6, passive: 0.68 };

/** Steps A–J of the professional pipeline. */
export const runProfessionalPipeline = (candidate: ProfessionalModel, jobs: JobOpportunity[], intent: IntentState, limit = 3) => {
  // A: eligibility — "off" means Pairwise does not look.
  if (intent === 'off' || intent === 'paused') return { shown: [] as ProfessionalMatchResult[], all: [] as ProfessionalMatchResult[], excluded: jobs.map((j) => ({ jobId: j.id, reason: 'Search is off' })) };
  const all = jobs.map((j) => scoreProfessionalMatch(candidate, j, intent));
  const excluded = all.filter((r) => !r.hardConstraintPass).map((r) => ({ jobId: r.jobId, reason: r.gateFailure! }));
  // Passive candidates only hear about exceptional fits.
  const threshold = intent === 'passive' ? PROFESSIONAL_THRESHOLD.passive : PROFESSIONAL_THRESHOLD.active;
  const ranked = all.filter((r) => r.hardConstraintPass).sort((a, b) => b.internalScore - a.internalScore);
  for (const r of ranked) if (r.internalScore < threshold) excluded.push({ jobId: r.jobId, reason: 'Not a strong enough two-way fit' });
  return { shown: ranked.filter((r) => r.internalScore >= threshold).slice(0, limit), all: ranked, excluded };
};
