import { ArrowLeft, Ban, BadgeCheck, EyeOff, Flag, Heart, Lock, MapPin, ShieldQuestion, Sparkles, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { AIExplanation, AskPairwise } from '../components/AIExplanation';
import { Portrait } from '../components/brand';
import { Button, ConfirmationChips, EmptyState, ExpandableSection, Modal, useToast } from '../components/ui';
import { scorePersonalMatch } from '../lib/matching/personal';
import { useStore } from '../state/store';
import { candidateById, MutualModal, useIntroductionActions } from './personalShared';

const KIDS = { yes: 'Wants children', no: 'Doesn’t want children', open: 'Open to children', unsure: 'Unsure about children' };
const COMMS = { texter: 'Likes to text through the day', caller: 'Prefers a phone call to texting', in_person: 'Would rather talk in person' };

export const MatchDetailPage = () => {
  const { id = '' } = useParams();
  const { state, actions } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const intro = useIntroductionActions();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [nextOpen, setNextOpen] = useState(false);
  const c = candidateById(id);
  const status = intro.statusOf(id);

  useEffect(() => {
    if (c && status === 'new') actions.setIntroduction(c.id, 'viewed');
  }, [c, status, actions]);

  const result = useMemo(
    () =>
      c
        ? scorePersonalMatch(
            {
              user: state.personal,
              shared: state.shared,
              crossDomain: state.settings.crossDomainLearning,
              feedback: state.feedback,
              broadened: state.temporarilyBroadened,
              smokerOk: !state.preferences.some((p) => p.type === 'smoker' && p.strength === 'hard_requirement'),
            },
            c,
          )
        : null,
    [c, state],
  );

  if (!c || !result || state.blockedIds.includes(c.id) || !state.participation.personal) {
    return <EmptyState title="This introduction isn’t available." actions={<Button onClick={() => navigate('/personal')}>Back to Personal</Button>} />;
  }

  const mutual = status === 'mutual';
  const decided = status === 'interested' || mutual;

  return (
    <div>
      <Link to="/personal" className="mb-6 inline-flex min-h-10 items-center gap-2 rounded-full pr-3 text-[15px] font-semibold text-muted hover:text-heading">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Your matches
      </Link>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Gallery: extra photos unlock only after mutual interest (Stage 3). */}
        <div>
          <Portrait name={c.firstName} hue={c.photoHue} scene={c.photoScenes[0]} className="aspect-[4/5] w-full shadow-sm" rounded="rounded-3xl" />
          <div className="mt-3 grid grid-cols-2 gap-3">
            {c.photoScenes.slice(1).map((s, i) =>
              mutual ? (
                <Portrait key={s} name={c.firstName} hue={(c.photoHue + 25 * (i + 1)) % 360} scene={s} className="aspect-square w-full" />
              ) : (
                <div key={s} className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface text-center text-sm text-muted">
                  <Lock className="h-5 w-5" aria-hidden />
                  More photos after
                  <br />
                  mutual interest
                </div>
              ),
            )}
          </div>
        </div>

        <div>
          {mutual && (
            <p className="pop mb-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-bold text-on-accent">
              <Heart className="h-4 w-4 fill-current" aria-hidden /> It’s mutual
            </p>
          )}
          <h1 className="text-[34px] font-bold tracking-[-0.01em] text-heading">
            {c.firstName}, <span className="font-semibold">{c.age}</span>
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-[15px] text-muted">
            <MapPin className="h-4 w-4" aria-hidden /> {c.area}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-heading ring-1 ring-line">
              {c.verified.photo ? <BadgeCheck className="h-3.5 w-3.5 text-accent" aria-hidden /> : <ShieldQuestion className="h-3.5 w-3.5" aria-hidden />}
              {c.verified.photo ? 'Photo verified' : 'Photo not yet verified'}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-heading ring-1 ring-line">
              {c.verified.identity ? <BadgeCheck className="h-3.5 w-3.5 text-accent" aria-hidden /> : <ShieldQuestion className="h-3.5 w-3.5" aria-hidden />}
              {c.verified.identity ? 'ID verified' : 'ID not yet verified'}
            </span>
          </div>

          <div className="card mt-6 p-5">
            <div className="eyebrow mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" aria-hidden /> Pairwise summary
            </div>
            <p className="text-[16px] leading-relaxed text-ink">{result.reasons[0] ?? 'I think this introduction is worth your attention.'}</p>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {!decided ? (
              <>
                <Button variant="primary" size="lg" onClick={() => intro.interested(c)}>
                  <Heart className="h-5 w-5" aria-hidden /> Interested
                </Button>
                <Button size="lg" onClick={() => { intro.pass(c); navigate('/personal'); }}>
                  <X className="h-5 w-5" aria-hidden /> Not for me
                </Button>
              </>
            ) : mutual ? (
              <Button variant="primary" size="lg" onClick={() => setNextOpen(true)}>
                Next steps
              </Button>
            ) : (
              <p className="rounded-xl bg-soft px-4 py-3 text-[15px] text-accent-strong">You’re interested. I’ll only tell {c.firstName} if the interest is mutual.</p>
            )}
          </div>

          <div className="card mt-8 px-5">
            <ExpandableSection title={`About ${c.firstName}`} defaultOpen>
              <p>{c.story}</p>
            </ExpandableSection>
            <ExpandableSection title="Interests" hint={c.model.interests.slice(0, 3).join(' · ')}>
              <ul className="flex flex-wrap gap-2">
                {c.model.interests.map((i) => (
                  <li key={i} className="rounded-full bg-soft px-3 py-1 text-sm font-medium capitalize text-accent-strong">
                    {i}
                  </li>
                ))}
              </ul>
            </ExpandableSection>
            <ExpandableSection title="Relationship intention" hint={c.intentionText}>
              <p>{c.intentionText}</p>
            </ExpandableSection>
            <ExpandableSection title="Lifestyle and values">
              <p>{c.lifestyle}</p>
              <p className="mt-2 text-muted">Values: <span className="capitalize text-ink">{c.model.values.join(', ')}</span></p>
            </ExpandableSection>
            <ExpandableSection title="Why Pairwise suggested this introduction" hint="Alignment, what I’m less sure about, and what I can’t know">
              <AIExplanation name={c.firstName} reasons={result.reasons} concerns={result.concerns} unknowns={result.unknowns} />
            </ExpandableSection>
            {mutual ? (
              <ExpandableSection title={`More about ${c.firstName}`} hint="Unlocked because the interest is mutual">
                <ul className="space-y-1.5">
                  <li>{KIDS[c.model.wantsKids]}</li>
                  <li>{COMMS[c.model.communication]}</li>
                  {c.mutualConnections > 0 && <li>You have {c.mutualConnections} mutual connections.</li>}
                </ul>
              </ExpandableSection>
            ) : (
              <div className="flex items-center gap-3 border-b border-line py-4 text-[15px] text-muted">
                <Lock className="h-4 w-4" aria-hidden /> A deeper profile unlocks if you’re both interested.
              </div>
            )}
            <ExpandableSection title="Conversation prompts">
              <ul className="space-y-2">
                {c.conversationPrompts.map((p) => (
                  <li key={p} className="rounded-xl bg-soft/60 px-4 py-2.5">
                    {p}
                  </li>
                ))}
              </ul>
            </ExpandableSection>
            <ExpandableSection title="Ask Pairwise">
              <AskPairwise
                context={{ kind: 'match', name: c.firstName, reasons: result.reasons, concerns: result.concerns, facts: c.facts }}
                suggestions={[`Why ${c.firstName}?`, 'Anything I should be aware of?', 'What could we talk about?']}
              />
            </ExpandableSection>
          </div>

          <div className="mt-6 flex flex-wrap gap-1 text-sm">
            <Button variant="quiet" size="sm" onClick={() => { actions.setIntroduction(c.id, 'hidden'); toast(`${c.firstName} is hidden.`); navigate('/personal'); }}>
              <EyeOff className="h-4 w-4" aria-hidden /> Hide
            </Button>
            <Button variant="quiet" size="sm" onClick={() => setReportOpen(true)}>
              <Flag className="h-4 w-4" aria-hidden /> Report
            </Button>
            <Button variant="quiet" size="sm" onClick={() => { actions.block(c.id); toast(`${c.firstName} is blocked and won’t see you.`); navigate('/personal'); }}>
              <Ban className="h-4 w-4" aria-hidden /> Block
            </Button>
          </div>
        </div>
      </div>

      {reportOpen && (
        <Modal
          title={`Report ${c.firstName}`}
          onClose={() => setReportOpen(false)}
          footer={
            <>
              <Button variant="quiet" onClick={() => setReportOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                disabled={!reportReason}
                onClick={() => {
                  actions.block(c.id);
                  setReportOpen(false);
                  toast('Thanks for telling us. We’ve blocked them for you while our safety team reviews it.');
                  navigate('/personal');
                }}
              >
                Send report
              </Button>
            </>
          }
        >
          <p className="mb-4 text-[15px] text-muted">Reports are confidential. {c.firstName} won’t know you reported them.</p>
          <ConfirmationChips
            label="Reason"
            value={reportReason}
            onChange={setReportReason}
            options={[
              { value: 'fake', label: 'Fake profile' },
              { value: 'inappropriate', label: 'Inappropriate' },
              { value: 'safety', label: 'Safety concern' },
              { value: 'other', label: 'Something else' },
            ]}
          />
        </Modal>
      )}
      {nextOpen && (
        <Modal title={`Next steps with ${c.firstName}`} onClose={() => setNextOpen(false)}>
          <p className="text-[15px] text-ink">A few easy ways to start:</p>
          <ul className="mt-3 space-y-2">
            {c.conversationPrompts.map((p) => (
              <li key={p} className="rounded-xl bg-soft/60 px-4 py-2.5 text-[15px]">
                {p}
              </li>
            ))}
          </ul>
          <p className="mt-5 rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
            In-app messaging and meeting suggestions are coming in a later version. For now, this demo stops at the mutual introduction.
          </p>
        </Modal>
      )}
      {intro.mutualWith && <MutualModal c={intro.mutualWith} onClose={intro.closeMutual} />}
    </div>
  );
};
