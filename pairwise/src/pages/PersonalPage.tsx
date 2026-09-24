import { HeartHandshake, Lock, MessageCircle, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../components/AppShell';
import { FEEDBACK_TAGS, FeedbackModal } from '../components/FeedbackModal';
import { MatchCard } from '../components/MatchCard';
import { PatternPrompt } from '../components/PrivateMemoryPanel';
import { Button, cx, Drawer, EmptyState, Toggle, useToast } from '../components/ui';
import { VoiceInput } from '../components/VoiceConversation';
import { useStore } from '../state/store';
import type { FeedbackTag, Preference } from '../types';
import { personalMatches, personalView } from '../lib/views';
import { candidateById, MutualModal, useIntroductionActions } from './personalShared';

const STRENGTH_LABEL: Record<Preference['strength'], string> = {
  hard_requirement: 'Dealbreaker',
  very_important: 'Very important',
  preference: 'Preference',
  nice_to_have: 'Nice to have',
  exploratory: 'Open to exploring',
  unknown: 'Not sure',
};

export const PreferencesDrawer = ({ onClose }: { onClose: () => void }) => {
  const { state, actions } = useStore();
  const toast = useToast();
  const [min, setMin] = useState(state.personal.ageRange[0]);
  const [max, setMax] = useState(state.personal.ageRange[1]);
  const [dist, setDist] = useState(state.personal.maxDistanceMiles);
  const prefs = personalView(state).preferences;
  return (
    <Drawer title="Your preferences" subtitle="Private to Pairwise. Nobody is ever told why they were or weren’t introduced." onClose={onClose}>
      <div className="space-y-8">
        <section className="card p-5">
          <h3 className="mb-4 font-bold text-heading">Who you’d like to meet</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="age-min" className="mb-1 block text-sm font-semibold text-heading">Age from</label>
              <input id="age-min" className="input" type="number" min={18} max={max} value={min} onChange={(e) => setMin(Number(e.target.value))} />
            </div>
            <div>
              <label htmlFor="age-max" className="mb-1 block text-sm font-semibold text-heading">to</label>
              <input id="age-max" className="input" type="number" min={min} max={99} value={max} onChange={(e) => setMax(Number(e.target.value))} />
            </div>
          </div>
          <label htmlFor="dist" className="mt-5 mb-1 block text-sm font-semibold text-heading">
            Within {dist} miles
          </label>
          <input id="dist" type="range" min={2} max={50} value={dist} onChange={(e) => setDist(Number(e.target.value))} className="w-full accent-[var(--a-accent)]" />
          <div className="mt-4">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const lo = Math.max(18, Math.min(min, max));
                const hi = Math.max(lo, max);
                actions.updatePersonalBounds([lo, hi], dist);
                toast('Preferences saved. Looking again…');
              }}
            >
              Save
            </Button>
          </div>
          <div className="mt-2 border-t border-line">
            <Toggle
              label="Temporarily broaden"
              description="Loosens age and distance a little while it’s on. Dealbreakers are never relaxed."
              checked={state.temporarilyBroadened}
              onChange={actions.setBroadened}
            />
          </div>
        </section>
        <section>
          <h3 className="mb-3 font-bold text-heading">What Pairwise is weighing</h3>
          <ul className="space-y-2">
            {prefs.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3">
                <span className="text-[15px] text-ink">
                  {p.label}
                  {p.type === 'appearance' && <Lock className="ml-1.5 inline h-3.5 w-3.5 text-muted" aria-label="Private" />}
                </span>
                <span className={cx('shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold', p.strength === 'hard_requirement' ? 'bg-accent text-on-accent' : 'bg-soft text-accent-strong')}>
                  {STRENGTH_LABEL[p.strength]}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted">Dealbreakers remove someone entirely. Everything else only moves people up or down.</p>
        </section>
      </div>
    </Drawer>
  );
};

/** Shown after several passes: ask what's missing instead of showing more people. */
const MissingSignal = ({ onDone }: { onDone: (tags: FeedbackTag[], note: string) => void }) => {
  const [tags, setTags] = useState<FeedbackTag[]>([]);
  const [note, setNote] = useState('');
  return (
    <div className="card rise p-6 sm:p-8">
      <h2 className="max-w-xl text-xl font-bold text-heading">
        I’m finding people who fit what you’ve told me, but they aren’t feeling right to you. Want to help me understand what I’m missing?
      </h2>
      <div className="mt-5 flex flex-wrap gap-2">
        {FEEDBACK_TAGS.map((t) => {
          const on = tags.includes(t);
          return (
            <button key={t} type="button" aria-pressed={on} onClick={() => setTags((x) => (on ? x.filter((y) => y !== t) : [...x, t]))} className={cx('min-h-10 rounded-full px-4 text-sm font-semibold capitalize', on ? 'bg-accent text-on-accent' : 'border border-line hover:bg-soft')}>
              {t}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        <VoiceInput label="What’s missing" value={note} onChange={setNote} rows={2} placeholder="In your own words, what felt off?" />
      </div>
      <div className="mt-5">
        <Button variant="primary" onClick={() => onDone(tags, note)}>
          Tell Pairwise
        </Button>
      </div>
    </div>
  );
};

export const PersonalPage = () => {
  const { state, actions } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const intro = useIntroductionActions();
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [tab, setTab] = useState<'intros' | 'mutual'>('intros');
  const view = personalView(state);
  const result = useMemo(() => personalMatches(state), [state]);

  const header = (
    <PageHeader
      eyebrow="Personal · Dating"
      title="Meaningful connections start here."
      subtitle="Thoughtfully matched people who share your values and are looking for something real."
      action={
        <Button onClick={() => setPrefsOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" aria-hidden /> Preferences
        </Button>
      }
    />
  );

  if (!view.enabled || view.intent.state === 'off') {
    return (
      <>
        {header}
        <EmptyState icon={<HeartHandshake className="h-6 w-6" />} title="Personal is turned off." body="Nothing from your Personal side is visible to anyone. You can turn it on whenever you’re ready." actions={<Button variant="primary" onClick={() => actions.setParticipation('personal', true)}>Turn on Personal</Button>} />
        {prefsOpen && <PreferencesDrawer onClose={() => setPrefsOpen(false)} />}
      </>
    );
  }
  if (view.intent.state === 'paused') {
    return (
      <>
        {header}
        <EmptyState icon={<HeartHandshake className="h-6 w-6" />} title="Matching is paused." body="Nobody new will be introduced, and you won’t be shown to anyone." actions={<Button variant="primary" onClick={() => actions.setIntentState('personal', 'active')}>Resume matching</Button>} />
        {prefsOpen && <PreferencesDrawer onClose={() => setPrefsOpen(false)} />}
      </>
    );
  }

  const mutual = state.introductions.filter((i) => i.status === 'mutual').map((i) => candidateById(i.candidateId)!).filter(Boolean);
  const shown = result?.shown ?? [];
  const pendingFeedback = view.pendingFeedback[0];
  const pendingPattern = view.patterns.find((p) => p.status === 'pending');
  const askingWhy = state.consecutivePasses >= 3;

  return (
    <>
      {header}

      {pendingFeedback ? (
        <div className="card mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-accent sm:flex">
            <MessageCircle className="h-5 w-5" aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-[15px] text-ink">
            {pendingFeedback.context} <span className="text-muted">How did that feel?</span>
          </p>
          <Button variant="primary" size="sm" onClick={() => setFeedbackOpen(true)}>
            Share how it went
          </Button>
        </div>
      ) : pendingPattern ? (
        <div className="mb-8">
          <PatternPrompt
            p={pendingPattern}
            onAnswer={(a) => {
              actions.answerPattern(pendingPattern.id, a);
              toast(a === 'yes' ? 'Got it — I’ll take that into account.' : a === 'maybe' ? 'I’ll weigh it lightly for now.' : 'Okay, I’ll keep your stated preference.');
            }}
          />
        </div>
      ) : null}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-heading">Your Matches</h2>
        <div role="tablist" aria-label="Filter matches" className="inline-flex rounded-full border border-line bg-surface p-1">
          {(['intros', 'mutual'] as const).map((t) => (
            <button key={t} role="tab" type="button" aria-selected={tab === t} onClick={() => setTab(t)} className={cx('min-h-9 rounded-full px-4 text-sm font-semibold', tab === t ? 'bg-accent text-on-accent' : 'text-muted hover:text-heading')}>
              {t === 'intros' ? 'Introductions' : `Mutual${mutual.length ? ` (${mutual.length})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {tab === 'mutual' ? (
        mutual.length ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mutual.map((c) => (
              <MatchCard key={c.id} c={c} status="mutual" exploratory={false} onPass={() => {}} onInterested={() => {}} onView={() => navigate(`/personal/match/${c.id}`)} />
            ))}
          </div>
        ) : (
          <EmptyState title="No mutual matches yet." body="When you and someone both say you’re interested, they’ll appear here." />
        )
      ) : askingWhy ? (
        <MissingSignal
          onDone={(tags, note) => {
            actions.recordMissingSignal(tags, note);
            toast('Thank you. I’ll use that to look differently.');
          }}
        />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<HeartHandshake className="h-6 w-6" />}
          title="I don’t currently have anyone I feel strongly enough about to recommend."
          body={result?.limitingFactor ?? undefined}
          actions={
            <>
              <Button onClick={() => toast('Keeping your preferences. I’ll let you know when someone strong comes along.')}>Keep my preferences</Button>
              <Button onClick={() => navigate('/welcome')}>Talk them through</Button>
              {!state.temporarilyBroadened && (
                <Button variant="primary" onClick={() => { actions.setBroadened(true); toast('Broadened a little. Dealbreakers are unchanged.'); }}>
                  Temporarily broaden
                </Button>
              )}
              <Button variant="quiet" onClick={() => setPrefsOpen(true)}>Review Preferences</Button>
            </>
          }
        />
      ) : (
        <>
          <p className="mb-5 text-[15px] text-muted">
            {shown.length === 1 ? 'I found someone I think you should consider.' : `I found ${shown.length === 2 ? 'two people' : 'a few people'} I think are worth considering.`}
          </p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((r) => {
              const c = candidateById(r.candidateId)!;
              return (
                <MatchCard
                  key={c.id}
                  c={c}
                  status={intro.statusOf(c.id)}
                  exploratory={r.exploratory}
                  onPass={() => intro.pass(c)}
                  onInterested={() => intro.interested(c)}
                  onView={() => navigate(`/personal/match/${c.id}`)}
                />
              );
            })}
          </div>
          <p className="mt-6 text-sm text-muted">Pairwise introduces a few people at a time, on purpose. New introductions arrive as strong fits become available.</p>
        </>
      )}

      {feedbackOpen && pendingFeedback && (
        <FeedbackModal
          pending={pendingFeedback}
          onClose={() => setFeedbackOpen(false)}
          onSubmit={(rating, tags, note, learned) => {
            actions.submitFeedback(pendingFeedback.id, rating, tags, note, learned);
            setFeedbackOpen(false);
            toast(learned ? `Thanks. I noted: “${learned}” — you can confirm it in Private App Memory.` : 'Thanks. That helps me learn.');
          }}
        />
      )}
      {prefsOpen && <PreferencesDrawer onClose={() => setPrefsOpen(false)} />}
      {intro.mutualWith && <MutualModal c={intro.mutualWith} onClose={intro.closeMutual} />}
    </>
  );
};
