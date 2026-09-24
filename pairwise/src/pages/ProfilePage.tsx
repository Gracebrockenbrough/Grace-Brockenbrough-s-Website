import { MapPin, MessageCircle, Pencil } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Portrait } from '../components/brand';
import { IntentStatusCard } from '../components/IntentStatus';
import { PrivateMemoryPanel } from '../components/PrivateMemoryPanel';
import { Button, Modal, useToast } from '../components/ui';
import { intentFor, memoryForDisplay } from '../lib/views';
import { useStore } from '../state/store';
import type { Intent, IntentState, UserProfile } from '../types';

const ProfileHeader = ({ profile, onEdit, onTalk }: { profile: UserProfile; onEdit: () => void; onTalk: () => void }) => (
  <section className="card overflow-hidden">
    <div className="h-24 bg-soft sm:h-28" aria-hidden />
    <div className="px-6 pb-7 sm:px-8">
      <div className="-mt-14 flex flex-wrap items-end justify-between gap-4">
        <Portrait name={profile.firstName} hue={profile.photoHue} className="h-28 w-28 border-4 border-white shadow-md" rounded="rounded-full" />
        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" onClick={onTalk}>
            <MessageCircle className="h-4 w-4" aria-hidden /> Talk to Pairwise
          </Button>
          <Button onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden /> Edit Profile
          </Button>
        </div>
      </div>
      <h1 className="mt-4 text-[30px] font-bold tracking-[-0.01em] text-heading">
        {profile.firstName}
        {profile.age ? <span className="font-medium text-muted">, {profile.age}</span> : null}
      </h1>
      <p className="mt-1 flex items-center gap-1.5 text-[15px] text-muted">
        <MapPin className="h-4 w-4" aria-hidden /> {profile.location}
      </p>
      <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink">{profile.bio}</p>
      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Interests and traits">
        {profile.tags.map((t) => (
          <li key={t} className="rounded-full border border-line bg-soft/60 px-3.5 py-1.5 text-sm font-medium text-accent-strong">
            {t}
          </li>
        ))}
      </ul>
    </div>
  </section>
);

const EditProfile = ({ profile, onSave, onClose }: { profile: UserProfile; onSave: (p: Partial<UserProfile>) => void; onClose: () => void }) => {
  const [draft, setDraft] = useState({ ...profile, tagText: profile.tags.join(', ') });
  const tags = draft.tagText.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5);
  return (
    <Modal
      title="Edit profile"
      onClose={onClose}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave({ firstName: draft.firstName.trim() || profile.firstName, age: Number(draft.age) || profile.age, location: draft.location, bio: draft.bio, tags });
              onClose();
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_6rem] gap-3">
          <div>
            <label htmlFor="pf-name" className="mb-1 block text-sm font-semibold text-heading">First name</label>
            <input id="pf-name" className="input" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
          </div>
          <div>
            <label htmlFor="pf-age" className="mb-1 block text-sm font-semibold text-heading">Age</label>
            <input id="pf-age" className="input" inputMode="numeric" value={draft.age || ''} onChange={(e) => setDraft({ ...draft, age: Number(e.target.value.replace(/\D/g, '')) })} />
          </div>
        </div>
        <div>
          <label htmlFor="pf-loc" className="mb-1 block text-sm font-semibold text-heading">Location</label>
          <input id="pf-loc" className="input" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
          <p className="mt-1 text-xs text-muted">Use a neighborhood or city. Pairwise never shows an exact address.</p>
        </div>
        <div>
          <label htmlFor="pf-bio" className="mb-1 block text-sm font-semibold text-heading">Short bio</label>
          <textarea id="pf-bio" className="input" rows={3} value={draft.bio} onChange={(e) => setDraft({ ...draft, bio: e.target.value })} />
        </div>
        <div>
          <label htmlFor="pf-tags" className="mb-1 block text-sm font-semibold text-heading">Interests and traits</label>
          <input id="pf-tags" className="input" value={draft.tagText} onChange={(e) => setDraft({ ...draft, tagText: e.target.value })} />
          <p className="mt-1 text-xs text-muted">Up to 5, separated by commas.</p>
        </div>
      </div>
    </Modal>
  );
};

export const ProfilePage = () => {
  const { state, actions } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  const change = (domain: Intent['domain'], s: IntentState) => {
    if (s === 'off') {
      actions.setParticipation(domain, false);
      toast(`${domain === 'personal' ? 'Personal' : 'Professional'} is off. Nothing from it will be shown to anyone.`);
    } else if (!state.participation[domain]) {
      actions.setParticipation(domain, true);
      actions.setIntentState(domain, s);
      toast(`${domain === 'personal' ? 'Personal' : 'Professional'} is on.`);
    } else {
      actions.setIntentState(domain, s);
      toast('Status updated.');
    }
  };

  return (
    <div className="space-y-6">
      <ProfileHeader profile={state.profile} onEdit={() => setEditing(true)} onTalk={() => navigate('/welcome')} />
      <div className="grid gap-5 md:grid-cols-2">
        {(['personal', 'professional'] as const).map((d) => (
          <IntentStatusCard
            key={d}
            intent={intentFor(state, d)}
            enabled={state.participation[d]}
            onOpen={() => navigate(`/${d}`)}
            onChange={(s) => change(d, s)}
            onReconfirm={(keep) => {
              actions.reconfirm(d, keep);
              toast(keep ? 'Thanks — confirmed.' : 'Paused. You can resume any time.');
            }}
            onSkip={() => {
              actions.skipReconfirm(d);
              toast('I’ll ask again later.');
            }}
          />
        ))}
      </div>
      <PrivateMemoryPanel
        memory={memoryForDisplay(state)}
        patterns={state.patterns}
        actions={{
          confirm: actions.confirmMemory,
          edit: actions.editMemory,
          remove: actions.deleteMemory,
          incorrect: actions.markIncorrect,
          makePrivate: (id) => actions.setMemoryVisibility(id, 'private_ai'),
          answerPattern: (id, a) => {
            actions.answerPattern(id, a);
            toast(a === 'yes' ? 'Got it — I’ll take that into account.' : a === 'maybe' ? 'I’ll weigh it lightly for now.' : 'Okay, I’ll keep your stated preference.');
          },
        }}
      />
      {editing && <EditProfile profile={state.profile} onSave={actions.updateProfile} onClose={() => setEditing(false)} />}
    </div>
  );
};
