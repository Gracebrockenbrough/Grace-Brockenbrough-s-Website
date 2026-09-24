// Smart Resume: re-orders and selects from the master profile. It never adds, rewrites or invents facts.
import type { JobOpportunity, ResumeBullet, ResumeMaster, ResumeRole } from '../types';

export interface TailoredBullet extends ResumeBullet {
  relevance: number;
  highlighted: boolean;
}

export interface TailoredRole extends Omit<ResumeRole, 'bullets'> {
  bullets: TailoredBullet[];
  omitted: number;
}

export interface TailoredResume {
  jobId: string;
  focus: string[];
  roles: TailoredRole[];
  skills: { name: string; relevant: boolean }[];
  education: ResumeMaster['education'];
  certifications: ResumeMaster['certifications'];
  changes: string[];
}

const words = (s: string) => s.toLowerCase();

export const bulletRelevance = (b: ResumeBullet, job: JobOpportunity) => {
  const tagHits = b.tags.filter((t) => job.tags.includes(t)).length;
  const skillHits = [...job.requiredSkills, ...job.preferredSkills].filter((s) => words(b.text).includes(s.split(' ')[0])).length;
  return tagHits * 2 + skillHits;
};

const FOCUS_LABEL: Record<string, string> = {
  client: 'client-facing work',
  wealth: 'wealth advisory',
  planning: 'financial planning',
  modeling: 'financial modeling',
  forecasting: 'forecasting',
  'fp&a': 'FP&A',
  presentation: 'executive presentations',
  technical: 'technical/automation skills',
  research: 'research',
  valuation: 'valuation',
  growth: 'growth-stage work',
};

export const tailorResume = (master: ResumeMaster, job: JobOpportunity, perRole = 3): TailoredResume => {
  const roles: TailoredRole[] = master.roles.map((role) => {
    const scored = role.bullets.map((b, i) => ({ ...b, relevance: bulletRelevance(b, job), highlighted: false, i }));
    const ordered = [...scored].sort((a, b) => b.relevance - a.relevance || a.i - b.i);
    const kept = ordered.slice(0, perRole).map(({ i: _i, ...b }) => ({ ...b, highlighted: b.relevance >= 2 }));
    return { ...role, bullets: kept, omitted: role.bullets.length - kept.length };
  });
  const jobSkills = [...job.requiredSkills, ...job.preferredSkills].map(words);
  const skills = master.skills
    .map((name, i) => ({ name, relevant: jobSkills.some((s) => words(name).includes(s) || s.includes(words(name))), i }))
    .sort((a, b) => Number(b.relevant) - Number(a.relevant) || a.i - b.i)
    .map(({ name, relevant }) => ({ name, relevant }));
  const focus = job.tags.filter((t) => master.roles.some((r) => r.bullets.some((b) => b.tags.includes(t)))).map((t) => FOCUS_LABEL[t] ?? t).slice(0, 3);
  const moved = roles.reduce((n, r, ri) => n + r.bullets.filter((b, bi) => master.roles[ri].bullets[bi]?.id !== b.id).length, 0);
  const changes = [
    focus.length ? `Leads with ${focus.join(', ')}` : 'Keeps your original order',
    moved ? 'Reorders bullets so the most relevant come first' : 'Bullet order unchanged',
    roles.some((r) => r.omitted) ? `Leaves out ${roles.reduce((n, r) => n + r.omitted, 0)} less relevant bullets (still in your master profile)` : 'Includes every bullet',
    'Moves matching skills to the front',
  ];
  return { jobId: job.id, focus, roles, skills, education: master.education, certifications: master.certifications, changes };
};

/** Every bullet in a tailored resume must exist, word for word, in the master profile. */
export const isFaithful = (master: ResumeMaster, t: TailoredResume) => {
  const all = new Set(master.roles.flatMap((r) => r.bullets.map((b) => b.text)));
  return t.roles.every((r) => r.bullets.every((b) => all.has(b.text)));
};
