import { BriefcaseBusiness, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../components/AppShell';
import { OpportunityCard } from '../components/OpportunityCard';
import { SmartResumePreview } from '../components/SmartResumePreview';
import { Button, ConfirmationChips, cx, Drawer, EmptyState, Modal, useToast } from '../components/ui';
import { JOBS } from '../data/seed';
import { INTENT_LABEL } from '../lib/intents';
import { professionalMatches, professionalView } from '../lib/views';
import { useStore } from '../state/store';
import type { IntentState, JobOpportunity, WorkModel } from '../types';

type Filter = 'all' | WorkModel | 'saved';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
  { value: 'saved', label: 'Saved' },
];

export const SearchDrawer = ({ onClose }: { onClose: () => void }) => {
  const { state, actions } = useStore();
  const toast = useToast();
  const m = professionalView(state).model;
  const [models, setModels] = useState<WorkModel[]>(m.workModels);
  const [locations, setLocations] = useState(m.preferredLocations.join(', '));
  const [comp, setComp] = useState(String(m.minCompensation));
  return (
    <Drawer title="Adjust search" subtitle="Only job-relevant preferences are used for professional matching." onClose={onClose}>
      <div className="card space-y-5 p-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-heading">Work arrangement</p>
          <div className="flex flex-wrap gap-2">
            {(['remote', 'hybrid', 'onsite'] as WorkModel[]).map((w) => {
              const on = models.includes(w);
              return (
                <button key={w} type="button" aria-pressed={on} onClick={() => setModels((x) => (on ? x.filter((y) => y !== w) : [...x, w]))} className={cx('min-h-10 rounded-full px-4 text-sm font-semibold', on ? 'bg-accent text-on-accent' : 'border border-line hover:bg-soft')}>
                  {w === 'onsite' ? 'On-site' : w[0].toUpperCase() + w.slice(1)}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <label htmlFor="locs" className="mb-1 block text-sm font-semibold text-heading">Preferred locations</label>
          <input id="locs" className="input" value={locations} onChange={(e) => setLocations(e.target.value)} />
          <p className="mt-1 text-xs text-muted">Comma separated, e.g. New York, Remote</p>
        </div>
        <div>
          <label htmlFor="comp" className="mb-1 block text-sm font-semibold text-heading">Minimum base salary (USD)</label>
          <input id="comp" className="input" inputMode="numeric" value={comp} onChange={(e) => setComp(e.target.value.replace(/[^\d]/g, ''))} />
        </div>
        <Button
          variant="primary"
          onClick={() => {
            actions.updateProfessional({ workModels: models.length ? models : m.workModels, preferredLocations: locations.split(',').map((x) => x.trim()).filter(Boolean), minCompensation: Number(comp) || m.minCompensation });
            toast('Search updated.');
            onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Drawer>
  );
};

/** Share interest: always preview the tailored resume first. */
export const ShareInterestModal = ({ job, onClose, onConfirm, passive }: { job: JobOpportunity; onClose: () => void; onConfirm: () => void; passive: boolean }) => {
  const { state } = useStore();
  const v = professionalView(state);
  return (
    <Modal
      wide
      title={`Share interest with ${job.company.name}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onConfirm}>Share with {job.company.name}</Button>
        </>
      }
    >
      <p className="mb-5 text-[15px] text-muted">
        {passive
          ? 'Because you’re passively open, your name is only revealed if the company is also interested.'
          : 'This is what the company will see. Review it before sharing.'}{' '}
        Only professional information is shared — never anything from Personal.
      </p>
      <SmartResumePreview master={v.model.resume} job={job} name={v.profile.name} />
    </Modal>
  );
};

export const ProfessionalPage = () => {
  const { state, actions } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>('all');
  const [searchOpen, setSearchOpen] = useState(false);
  const [sharing, setSharing] = useState<JobOpportunity | null>(null);
  const view = professionalView(state);
  const result = useMemo(() => professionalMatches(state), [state]);
  const passive = view.intent.state === 'passive';

  const header = (
    <PageHeader
      eyebrow="Professional · Full-time roles"
      title="Find opportunities that fit you."
      subtitle="Discover roles that match your skills, experience, goals, and working style."
      action={
        <Button onClick={() => setSearchOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Adjust search
        </Button>
      }
    />
  );

  if (!view.enabled || view.intent.state === 'off' || view.intent.state === 'paused') {
    return (
      <>
        {header}
        <EmptyState
          icon={<BriefcaseBusiness className="h-6 w-6" />}
          title={view.enabled ? 'You’re not looking right now.' : 'Professional is turned off.'}
          body="You aren’t shown to employers, and Pairwise won’t surface roles until you turn this back on."
          actions={
            <Button variant="primary" onClick={() => (view.enabled ? actions.setIntentState('professional', 'passive') : actions.setParticipation('professional', true))}>
              Turn on Professional
            </Button>
          }
        />
        {searchOpen && <SearchDrawer onClose={() => setSearchOpen(false)} />}
      </>
    );
  }

  const fits = result?.shown ?? [];
  const savedIds = Object.entries(view.opportunities).filter(([, s]) => s === 'saved' || s === 'interested').map(([id]) => id);
  const list =
    filter === 'saved'
      ? savedIds.map((id) => result?.all.find((r) => r.jobId === id)).filter((r): r is NonNullable<typeof r> => !!r)
      : fits.filter((r) => filter === 'all' || JOBS.find((j) => j.id === r.jobId)?.workModel === filter);

  return (
    <>
      {header}

      <div className="card mb-8 flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-heading">Search status</p>
          <p className="text-sm text-muted">{passive ? 'Passive: you’ll only hear about exceptional fits, and employers see you only if it’s mutual.' : 'Active: Pairwise surfaces strong fits as they appear.'}</p>
        </div>
        <ConfirmationChips
          label="Search status"
          value={view.intent.state}
          onChange={(s: IntentState) => {
            actions.setIntentState('professional', s);
            toast(s === 'off' ? 'You won’t be surfaced to employers.' : `Status: ${INTENT_LABEL.professional[s]}.`);
          }}
          options={(['active', 'passive', 'off'] as IntentState[]).map((s) => ({ value: s, label: INTENT_LABEL.professional[s] }))}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-heading">Matching Opportunities</h2>
        <div role="tablist" aria-label="Filter opportunities" className="flex flex-wrap gap-1 rounded-full border border-line bg-surface p-1">
          {FILTERS.map((f) => (
            <button key={f.value} role="tab" type="button" aria-selected={filter === f.value} onClick={() => setFilter(f.value)} className={cx('min-h-9 rounded-full px-3.5 text-sm font-semibold', filter === f.value ? 'bg-accent text-on-accent' : 'text-muted hover:text-heading')}>
              {f.label}
              {f.value === 'saved' && savedIds.length ? ` (${savedIds.length})` : ''}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        filter === 'all' ? (
          <EmptyState
            icon={<BriefcaseBusiness className="h-6 w-6" />}
            title="No opportunities currently meet the things you’ve told me matter most."
            body={passive ? 'You’re passively open, so I only surface exceptional fits.' : undefined}
            actions={
              <>
                <Button onClick={() => setSearchOpen(true)}>Adjust Search</Button>
                <Button variant="primary" onClick={() => navigate('/welcome')}>Update Career Goals</Button>
              </>
            }
          />
        ) : (
          <EmptyState title={filter === 'saved' ? 'Nothing saved yet.' : 'No strong fits with this arrangement right now.'} actions={<Button onClick={() => setFilter('all')}>Show all</Button>} />
        )
      ) : (
        <div className="space-y-5">
          {list.map((r) => {
            const job = JOBS.find((j) => j.id === r.jobId)!;
            const status = view.opportunities[job.id] ?? 'new';
            return (
              <OpportunityCard
                key={job.id}
                job={job}
                fit={r}
                status={status}
                passive={passive}
                onInterested={() => setSharing(job)}
                onSave={() => {
                  actions.setOpportunity(job.id, status === 'saved' ? 'new' : 'saved');
                  toast(status === 'saved' ? 'Removed from saved.' : 'Saved for later.');
                }}
                onView={() => navigate(`/professional/opportunity/${job.id}`)}
              />
            );
          })}
        </div>
      )}

      {sharing && (
        <ShareInterestModal
          job={sharing}
          passive={passive}
          onClose={() => setSharing(null)}
          onConfirm={() => {
            actions.setOpportunity(sharing.id, 'interested');
            toast(passive ? `Interest noted. ${sharing.company.name} learns who you are only if they’re interested too.` : `Shared with ${sharing.company.name}.`);
            setSharing(null);
          }}
        />
      )}
      {searchOpen && <SearchDrawer onClose={() => setSearchOpen(false)} />}
    </>
  );
};
