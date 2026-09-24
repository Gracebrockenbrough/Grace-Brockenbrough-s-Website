import { Check, EyeOff, Lock, Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { MemoryCategory, MemoryItem, PatternSuggestion } from '../types';
import { Button, ConfirmationChips, cx, Drawer, useToast } from './ui';

export const MEMORY_CATEGORIES: { id: MemoryCategory; label: string }[] = [
  { id: 'about_me', label: 'About Me' },
  { id: 'what_i_want', label: 'What I Want' },
  { id: 'relationship_goals', label: 'Relationship Goals' },
  { id: 'career_goals', label: 'Career Goals' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'patterns', label: 'Patterns Pairwise Has Noticed' },
  { id: 'past_feedback', label: 'Past Feedback' },
];

const SOURCE_LABEL: Record<MemoryItem['source'], string> = {
  user_stated: 'You told Pairwise',
  user_confirmed: 'You confirmed',
  ai_inferred: 'Pairwise’s guess — not confirmed',
  user_rejected: 'Marked incorrect',
};

const VISIBILITY_LABEL: Record<MemoryItem['visibility'], string> = {
  private_ai: 'Private to Pairwise',
  shared_internal: 'Private · used for both sides',
  personal_profile: 'Shown on your Personal profile',
  professional_profile: 'Shown on your Professional profile',
  mutual_match_only: 'Shown only after a mutual match',
  public: 'Public',
};

export interface MemoryActions {
  confirm: (id: string) => void;
  edit: (id: string, summary: string) => void;
  remove: (id: string) => void;
  incorrect: (id: string) => void;
  makePrivate: (id: string) => void;
  answerPattern: (id: string, a: 'yes' | 'maybe' | 'no') => void;
}

const MemoryRow = ({ m, actions }: { m: MemoryItem; actions: MemoryActions }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(m.summary);
  const toast = useToast();
  const uncertain = !m.confirmed;
  return (
    <li className="rounded-xl border border-line bg-surface p-4">
      {editing ? (
        <div className="space-y-3">
          <label className="sr-only" htmlFor={`mem-${m.id}`}>
            Edit memory
          </label>
          <textarea id={`mem-${m.id}`} className="input" rows={2} value={text} onChange={(e) => setText(e.target.value)} />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => { actions.edit(m.id, text.trim() || m.summary); setEditing(false); toast('Updated. Pairwise will use your wording.'); }}>
              Save
            </Button>
            <Button size="sm" variant="quiet" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[15px] leading-snug text-ink">{m.summary}</p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <span className={cx(uncertain && 'font-semibold text-amber-800')}>{SOURCE_LABEL[m.source]}</span>
            <span aria-hidden>·</span>
            <span>{m.origin}</span>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3 w-3" aria-hidden /> {VISIBILITY_LABEL[m.visibility]}
            </span>
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {uncertain && (
              <Button size="sm" variant="ghost" onClick={() => { actions.confirm(m.id); toast('Confirmed.'); }}>
                <Check className="h-4 w-4" aria-hidden /> Confirm
              </Button>
            )}
            <Button size="sm" variant="quiet" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" aria-hidden /> Edit
            </Button>
            <Button size="sm" variant="quiet" onClick={() => { actions.incorrect(m.id); toast('Marked incorrect. Pairwise won’t use it.'); }}>
              <X className="h-4 w-4" aria-hidden /> Mark incorrect
            </Button>
            {m.visibility !== 'private_ai' && (
              <Button size="sm" variant="quiet" onClick={() => { actions.makePrivate(m.id); toast('Now private to Pairwise.'); }}>
                <EyeOff className="h-4 w-4" aria-hidden /> Keep private
              </Button>
            )}
            <Button size="sm" variant="quiet" onClick={() => { actions.remove(m.id); toast('Deleted.'); }}>
              <Trash2 className="h-4 w-4" aria-hidden /> Delete
            </Button>
          </div>
        </>
      )}
    </li>
  );
};

export const PatternPrompt = ({ p, onAnswer }: { p: PatternSuggestion; onAnswer: (a: 'yes' | 'maybe' | 'no') => void }) => (
  <div className="rounded-2xl border border-line bg-surface p-5">
    <div className="eyebrow mb-2">Something I noticed</div>
    <p className="text-[15px] leading-relaxed text-ink">{p.prompt}</p>
    <div className="mt-4">
      <ConfirmationChips
        label="Should Pairwise take this into account?"
        onChange={onAnswer}
        options={[
          { value: 'yes', label: 'Yes' },
          { value: 'maybe', label: 'Not sure' },
          { value: 'no', label: 'No' },
        ]}
      />
    </div>
    <p className="mt-3 text-xs text-muted">Nothing changes until you answer.</p>
  </div>
);

/** Collapsed "Private App Memory" row, opening a categorised drawer. */
export const PrivateMemoryPanel = ({ memory, patterns, actions }: { memory: MemoryItem[]; patterns: PatternSuggestion[]; actions: MemoryActions }) => {
  const [open, setOpen] = useState(false);
  const pending = patterns.filter((p) => p.status === 'pending');
  return (
    <>
      <div className="card flex flex-wrap items-center gap-4 p-5 sm:p-6">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-soft text-accent">
          <Lock className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-heading">Private App Memory</h2>
          <p className="mt-0.5 text-[15px] text-muted">Pairwise remembers your preferences, conversations, and feedback to improve future matches.</p>
        </div>
        <Button onClick={() => setOpen(true)} aria-haspopup="dialog">
          See More{pending.length > 0 && <span className="rounded-full bg-accent px-1.5 text-xs text-on-accent">{pending.length}</span>}
        </Button>
      </div>
      {open && (
        <Drawer title="Private App Memory" subtitle="Private to Pairwise. Used only to improve your matching. You can change or remove anything." onClose={() => setOpen(false)}>
          <div className="space-y-8">
            {pending.map((p) => (
              <PatternPrompt key={p.id} p={p} onAnswer={(a) => actions.answerPattern(p.id, a)} />
            ))}
            {MEMORY_CATEGORIES.map((cat) => {
              const items = memory.filter((m) => m.category === cat.id);
              if (!items.length) return null;
              return (
                <section key={cat.id}>
                  <h3 className="mb-3 text-sm font-bold text-heading">{cat.label}</h3>
                  <ul className="space-y-2">
                    {items.map((m) => (
                      <MemoryRow key={m.id} m={m} actions={actions} />
                    ))}
                  </ul>
                </section>
              );
            })}
            {memory.length === 0 && <p className="text-[15px] text-muted">Pairwise hasn’t stored anything yet. It learns from your conversations and feedback.</p>}
          </div>
        </Drawer>
      )}
    </>
  );
};
