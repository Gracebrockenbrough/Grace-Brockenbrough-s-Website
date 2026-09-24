import { Check } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { PageHeader } from '../components/AppShell';
import { Button, ConfirmationChips, Modal, Toggle, useToast } from '../components/ui';
import { intentFor } from '../lib/views';
import { ai } from '../lib/ai';
import { useStore } from '../state/store';

const Section = ({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) => (
  <section id={id} aria-labelledby={`${id}-h`} className="card p-6">
    <h2 id={`${id}-h`} className="text-lg font-bold text-heading">{title}</h2>
    {description && <p className="mt-1 text-[15px] text-muted">{description}</p>}
    <div className="mt-2 divide-y divide-line">{children}</div>
  </section>
);

/** In-page confirmation (no browser dialogs). */
const ConfirmRow = ({ label, description, confirmLabel, onConfirm, danger }: { label: string; description: string; confirmLabel: string; onConfirm: () => void; danger?: boolean }) => {
  const [asking, setAsking] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="max-w-md">
        <p className="text-[15px] font-semibold text-heading">{label}</p>
        <p className="mt-0.5 text-sm text-muted">{description}</p>
      </div>
      {asking ? (
        <div className="flex gap-2">
          <Button size="sm" variant="quiet" onClick={() => setAsking(false)}>Cancel</Button>
          <Button size="sm" variant="danger" onClick={() => { onConfirm(); setAsking(false); }}>{confirmLabel}</Button>
        </div>
      ) : (
        <Button size="sm" variant={danger ? 'danger' : 'secondary'} onClick={() => setAsking(true)}>{label}</Button>
      )}
    </div>
  );
};

const PREMIUM = ['More introductions when strong candidates exist', 'Deeper Pairwise explanations', 'More AI conversations', 'Advanced preference controls', 'Expanded locations', 'Revisit prior matches', 'Smart Resume versions and opportunity tracking'];

export const SettingsPage = () => {
  const { state, actions } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [dataOpen, setDataOpen] = useState(false);
  const s = state.settings;
  const personal = intentFor(state, 'personal');

  return (
    <div>
      <PageHeader eyebrow="Settings" title="You’re in control." subtitle="Decide what Pairwise uses, who can see you, and when it looks for you." />
      <div className="space-y-5">
        <Section id="account" title="Account">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-[15px] font-semibold text-heading">{state.profile.firstName || 'Your account'}</p>
              <p className="text-sm text-muted">{s.email}</p>
            </div>
            <Button size="sm" onClick={() => navigate('/welcome')}>Talk to Pairwise again</Button>
          </div>
        </Section>

        <Section id="participation" title="Participation" description="Turning a side off hides it completely. Nothing from it is shown to anyone.">
          <Toggle label="Personal (dating)" description="Receive introductions and be introduced to others." checked={state.participation.personal} onChange={(on) => { actions.setParticipation('personal', on); toast(on ? 'Personal is on.' : 'Personal is off.'); }} />
          {state.participation.personal && (
            <Toggle label="Pause dating" description="Keep your profile, but stop all new introductions." checked={personal.state === 'paused'} onChange={(on) => { actions.setIntentState('personal', on ? 'paused' : 'active'); toast(on ? 'Dating paused.' : 'Dating resumed.'); }} />
          )}
          <Toggle label="Professional" description="Receive matched opportunities." checked={state.participation.professional} onChange={(on) => { actions.setParticipation('professional', on); toast(on ? 'Professional is on.' : 'Professional is off.'); }} />
        </Section>

        <Section id="privacy" title="Privacy">
          <Toggle
            label="Allow Pairwise to use insights from both sides to understand me better"
            description="When on, high-level traits like ambition, schedule, social energy and location flexibility can inform both sides. What others see always stays separate."
            checked={s.crossDomainLearning}
            onChange={(v) => { actions.updateSettings({ crossDomainLearning: v }); toast(v ? 'Cross-domain learning on.' : 'Personal and Professional models are now fully separate.'); }}
          />
          <div className="py-4">
            <p className="mb-2 text-[15px] font-semibold text-heading">Personal profile visibility</p>
            <ConfirmationChips label="Personal profile visibility" value={s.personalVisibility} onChange={(v) => { actions.updateSettings({ personalVisibility: v }); toast('Saved.'); }} options={[{ value: 'visible', label: 'Visible to introductions' }, { value: 'hidden', label: 'Hidden' }]} />
          </div>
          <div className="py-4">
            <p className="mb-2 text-[15px] font-semibold text-heading">Professional profile visibility</p>
            <ConfirmationChips
              label="Professional profile visibility"
              value={s.professionalVisibility}
              onChange={(v) => { actions.updateSettings({ professionalVisibility: v }); toast('Saved.'); }}
              options={[
                { value: 'visible_to_employers', label: 'Searchable by employers' },
                { value: 'matched_only', label: 'Only mutual matches' },
                { value: 'hidden', label: 'Hidden' },
              ]}
            />
            <p className="mt-2 text-sm text-muted">Employers never see dating information, relationship preferences or protected personal data.</p>
          </div>
        </Section>

        <Section id="memory" title="AI memory" description="Private to Pairwise. Used only to improve your matching.">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="text-[15px] text-ink">{state.memory.length} things remembered</p>
            <Button size="sm" onClick={() => navigate('/profile')}>Review in Profile</Button>
          </div>
          <ConfirmRow label="Clear Personal memory" description="Removes what Pairwise learned about your dating preferences and feedback." confirmLabel="Clear" onConfirm={() => { actions.clearMemory('personal'); toast('Personal memory cleared.'); }} />
          <ConfirmRow label="Clear Professional memory" description="Removes what Pairwise learned about your career goals." confirmLabel="Clear" onConfirm={() => { actions.clearMemory('professional'); toast('Professional memory cleared.'); }} />
          <ConfirmRow label="Clear all memory" description="Pairwise starts learning from scratch." confirmLabel="Clear everything" onConfirm={() => { actions.clearMemory('all'); toast('All memory cleared.'); }} />
        </Section>

        <Section id="notifications" title="Notifications">
          <Toggle label="New introductions" checked={s.notifications.introductions} onChange={(v) => actions.updateSettings({ notifications: { ...s.notifications, introductions: v } })} />
          <Toggle label="New opportunities" checked={s.notifications.opportunities} onChange={(v) => actions.updateSettings({ notifications: { ...s.notifications, opportunities: v } })} />
          <Toggle label="Status check-ins" description="“Still looking?” reminders so you’re never introduced when you’re not available." checked={s.notifications.reminders} onChange={(v) => actions.updateSettings({ notifications: { ...s.notifications, reminders: v } })} />
        </Section>

        <Section id="subscription" title="Subscription" description="Match quality is the same on every plan. Premium adds reach and depth, never better people.">
          <div className="grid gap-3 py-4 sm:grid-cols-2">
            {(['free', 'premium'] as const).map((plan) => (
              <button
                key={plan}
                type="button"
                aria-pressed={s.plan === plan}
                onClick={() => { actions.updateSettings({ plan }); toast(plan === 'premium' ? 'Premium (demo) — no payment taken.' : 'Switched to Free.'); }}
                className={`rounded-2xl border p-5 text-left transition-colors ${s.plan === plan ? 'border-accent ring-2 ring-accent/15' : 'border-line hover:bg-soft'}`}
              >
                <p className="flex items-center justify-between font-bold text-heading">
                  {plan === 'free' ? 'Free' : 'Premium'}
                  {s.plan === plan && <Check className="h-5 w-5 text-accent" aria-label="Current plan" />}
                </p>
                <p className="mt-1 text-sm text-muted">{plan === 'free' ? 'Full-quality matching, a few introductions at a time.' : 'Everything in Free, plus:'}</p>
                {plan === 'premium' && (
                  <ul className="mt-2 space-y-1 text-sm text-ink">{PREMIUM.map((p) => <li key={p}>· {p}</li>)}</ul>
                )}
              </button>
            ))}
          </div>
        </Section>

        <Section id="data" title="Data controls">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-[15px] font-semibold text-heading">See my data</p>
              <p className="text-sm text-muted">Everything Pairwise stores about you, in one place.</p>
            </div>
            <Button size="sm" onClick={() => setDataOpen(true)}>View</Button>
          </div>
          <ConfirmRow label="Reset demo" description="Restores the demo profile, matches and memory." confirmLabel="Reset" onConfirm={() => { actions.resetDemo(); toast('Demo restored.'); navigate('/profile'); }} />
          <p className="py-4 text-sm text-muted">AI: {ai.name}</p>
        </Section>

        <Section id="delete" title="Delete account">
          <ConfirmRow danger label="Delete account" description="Permanently removes your profiles, memory and matches." confirmLabel="Delete permanently" onConfirm={() => { actions.deleteAccount(); navigate('/welcome'); }} />
        </Section>
      </div>

      {dataOpen && (
        <Modal wide title="Your data" onClose={() => setDataOpen(false)}>
          <p className="mb-3 text-sm text-muted">Stored in separate namespaces so Personal and Professional information are never combined in what others see.</p>
          <pre className="max-h-[60vh] overflow-auto rounded-xl bg-soft p-4 text-xs leading-relaxed text-ink">
            {JSON.stringify(
              {
                shared_user_model: state.shared,
                personal_model: state.personal,
                professional_model: { ...state.professional, resume: `${state.professional.resume.roles.length} roles` },
                private_ai_memory: state.memory.map((m) => ({ key: m.key, summary: m.summary, source: m.source, confidence: m.confidence, visibility: m.visibility })),
                visible_personal_profile: state.visiblePersonal,
                visible_professional_profile: state.visibleProfessional,
                intents: state.intents,
              },
              null,
              2,
            )}
          </pre>
        </Modal>
      )}
    </div>
  );
};
