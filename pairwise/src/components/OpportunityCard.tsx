import { Bookmark, BookmarkCheck, Building2, Check, ChevronDown, MapPin } from 'lucide-react';
import { useState } from 'react';
import type { ProfessionalMatchResult } from '../lib/matching/professional';
import type { JobOpportunity, OpportunityStatus } from '../types';
import { CompanyLogo } from './brand';
import { Button, cx } from './ui';

export const WORK_MODEL_LABEL = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' } as const;

export const OpportunityCard = ({
  job,
  fit,
  status,
  passive,
  onInterested,
  onSave,
  onView,
}: {
  job: JobOpportunity;
  fit: ProfessionalMatchResult;
  status: OpportunityStatus;
  passive: boolean;
  onInterested: () => void;
  onSave: () => void;
  onView: () => void;
}) => {
  const [roleFit, setRoleFit] = useState(false);
  const saved = status === 'saved';
  const interested = status === 'interested';
  return (
    <article className="card lift rise p-6" aria-label={`${job.title} at ${job.company.name}`}>
      <div className="flex items-start gap-4">
        <CompanyLogo monogram={job.company.monogram} color={job.company.color} name={job.company.name} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-muted">
            {job.company.name}
            {passive && <span className="ml-2 rounded-full bg-soft px-2 py-0.5 text-xs text-accent-strong">May be worth considering</span>}
          </p>
          <h3 className="text-lg leading-snug font-bold text-heading">{job.title}</h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden /> {job.location}
            </span>
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" aria-hidden /> {WORK_MODEL_LABEL[job.workModel]}
            </span>
            <span className="rounded-md bg-soft px-2 py-0.5 text-xs font-semibold text-accent-strong">{job.industry}</span>
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold text-heading">Why you might be a good fit:</p>
        <ul className="mt-2 space-y-1.5">
          {fit.reasons.map((r) => (
            <li key={r} className="flex gap-2 text-[15px] text-ink">
              <Check className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {roleFit && (
        <div className="rise mt-4 rounded-xl bg-soft/60 p-4 text-[15px]">
          <p className="font-semibold text-heading">Role fit</p>
          <p className="mt-1 text-ink">
            You have {job.requiredSkills.length} of {job.requiredSkills.length} required skills
            {job.preferredSkills.length ? ` and bring several preferred ones` : ''}. {job.careerPath}
          </p>
          {fit.concerns.length > 0 && (
            <p className="mt-2 text-muted">
              <span className="font-semibold text-heading">Worth weighing: </span>
              {fit.concerns.join(' ')}
            </p>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {interested ? (
          <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-soft px-5 text-[15px] font-semibold text-accent-strong">
            <Check className="h-4 w-4" aria-hidden /> Interest shared
          </span>
        ) : (
          <Button variant="primary" onClick={onInterested}>
            Interested
          </Button>
        )}
        {!interested && (
          <Button onClick={onSave} aria-pressed={saved}>
            {saved ? <BookmarkCheck className="pop h-4 w-4" aria-hidden /> : <Bookmark className="h-4 w-4" aria-hidden />}
            {saved ? 'Saved' : 'Save for Later'}
          </Button>
        )}
        <Button variant="ghost" onClick={onView}>
          View Opportunity
        </Button>
        <Button variant="quiet" aria-expanded={roleFit} onClick={() => setRoleFit((v) => !v)}>
          See Role Fit <ChevronDown className={cx('h-4 w-4 transition-transform', roleFit && 'rotate-180')} aria-hidden />
        </Button>
      </div>
    </article>
  );
};
