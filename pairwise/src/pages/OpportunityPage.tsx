import { ArrowLeft, Bookmark, BookmarkCheck, Building2, Check, Flag, MapPin } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AIExplanation, AskPairwise } from '../components/AIExplanation';
import { CompanyLogo } from '../components/brand';
import { WORK_MODEL_LABEL } from '../components/OpportunityCard';
import { SmartResumePreview } from '../components/SmartResumePreview';
import { Button, EmptyState, ExpandableSection, useToast } from '../components/ui';
import { JOBS } from '../data/seed';
import { scoreProfessionalMatch } from '../lib/matching/professional';
import { professionalView } from '../lib/views';
import { useStore } from '../state/store';
import { ShareInterestModal } from './ProfessionalPage';

const money = (n: number) => `$${Math.round(n / 1000)}K`;

export const OpportunityPage = () => {
  const { id = '' } = useParams();
  const { state, actions } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [sharing, setSharing] = useState(false);
  const view = professionalView(state);
  const job = JOBS.find((j) => j.id === id);
  const fit = useMemo(() => (job ? scoreProfessionalMatch(view.model, job, view.intent.state) : null), [job, view.model, view.intent.state]);

  if (!job || !fit || !view.enabled) return <EmptyState title="This opportunity isn’t available." actions={<Button onClick={() => navigate('/professional')}>Back to Professional</Button>} />;

  const status = view.opportunities[job.id] ?? 'new';
  const passive = view.intent.state === 'passive';
  const salary = job.salaryRange ? `${money(job.salaryRange[0])}–${money(job.salaryRange[1])} base` : 'Not shared yet';

  return (
    <div>
      <Link to="/professional" className="mb-6 inline-flex min-h-10 items-center gap-2 pr-3 text-[15px] font-semibold text-muted hover:text-heading">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Matching opportunities
      </Link>

      <section className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-start gap-5">
          <CompanyLogo monogram={job.company.monogram} color={job.company.color} name={job.company.name} size={64} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-muted">{job.company.name}</p>
            <h1 className="text-[28px] leading-tight font-bold text-heading sm:text-[32px]">{job.title}</h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[15px] text-muted">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden /> {job.location}</span>
              <span className="inline-flex items-center gap-1.5"><Building2 className="h-4 w-4" aria-hidden /> {WORK_MODEL_LABEL[job.workModel]}</span>
              <span>{salary}</span>
              <span className="rounded-md bg-soft px-2 py-0.5 text-sm font-semibold text-accent-strong">{job.industry}</span>
            </p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-[16px] leading-relaxed text-ink">{job.overview}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          {status === 'interested' ? (
            <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-soft px-5 font-semibold text-accent-strong"><Check className="h-4 w-4" aria-hidden /> Interest shared</span>
          ) : (
            <Button variant="primary" size="lg" onClick={() => setSharing(true)}>Interested</Button>
          )}
          {status !== 'interested' && (
            <Button size="lg" onClick={() => { actions.setOpportunity(job.id, status === 'saved' ? 'new' : 'saved'); toast(status === 'saved' ? 'Removed from saved.' : 'Saved for later.'); }}>
              {status === 'saved' ? <BookmarkCheck className="h-5 w-5" aria-hidden /> : <Bookmark className="h-5 w-5" aria-hidden />} {status === 'saved' ? 'Saved' : 'Save for Later'}
            </Button>
          )}
        </div>
      </section>

      <div className="card mt-6 px-6">
        <ExpandableSection title="Why Pairwise thinks this role fits" defaultOpen>
          <AIExplanation
            heading="This role aligns with several things you’ve told me matter"
            name={job.company.name}
            reasons={fit.reasons}
            concerns={fit.concerns}
            unknowns={['How you’d work with this specific manager day to day.']}
          />
        </ExpandableSection>
        <ExpandableSection title="Responsibilities" hint={`${job.responsibilities.length} core responsibilities`}>
          <ul className="list-disc space-y-1.5 pl-5">{job.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
        </ExpandableSection>
        <ExpandableSection title="Requirements">
          <ul className="list-disc space-y-1.5 pl-5">{job.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
          <p className="mt-3 text-muted">What the hiring team said matters beyond the description: {job.employerPriorities.join('; ')}.</p>
        </ExpandableSection>
        <ExpandableSection title={`About ${job.company.name}`} hint="Mission and team">
          <p>{job.company.mission}</p>
          <p className="mt-3"><span className="font-semibold text-heading">Team: </span>{job.company.team}</p>
        </ExpandableSection>
        <ExpandableSection title="Career-path relevance">
          <p>{job.careerPath}</p>
          <p className="mt-2 text-muted">You told Pairwise: {view.model.careerGoal}</p>
        </ExpandableSection>
        <ExpandableSection title="Smart Resume preview" hint="See exactly what would be shared">
          <SmartResumePreview master={view.model.resume} job={job} name={view.profile.name} />
        </ExpandableSection>
        <ExpandableSection title="Ask Pairwise">
          <AskPairwise
            context={{ kind: 'role', name: job.company.name, reasons: fit.reasons, concerns: fit.concerns, facts: [salary, job.location, job.careerPath] }}
            suggestions={['Why this role?', 'Any concerns?', 'How should I prepare for the interview?']}
          />
        </ExpandableSection>
      </div>

      <div className="mt-4">
        <Button variant="quiet" size="sm" onClick={() => { actions.setOpportunity(job.id, 'dismissed'); toast(`Reported. ${job.company.name} won’t be shown to you again.`); navigate('/professional'); }}>
          <Flag className="h-4 w-4" aria-hidden /> Report or block this employer
        </Button>
      </div>

      {sharing && (
        <ShareInterestModal
          job={job}
          passive={passive}
          onClose={() => setSharing(false)}
          onConfirm={() => {
            actions.setOpportunity(job.id, 'interested');
            setSharing(false);
            toast(passive ? `Interest noted. ${job.company.name} learns who you are only if they’re interested too.` : `Shared with ${job.company.name}.`);
          }}
        />
      )}
    </div>
  );
};
