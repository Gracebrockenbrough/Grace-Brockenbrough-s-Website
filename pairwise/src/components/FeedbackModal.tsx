import { useState } from 'react';
import { ai } from '../lib/ai';
import type { FeedbackRating, FeedbackTag, PendingFeedback } from '../types';
import { Button, ConfirmationChips, Modal, Spinner } from './ui';
import { VoiceInput } from './VoiceConversation';

const RATINGS: { value: FeedbackRating; label: string }[] = [
  { value: 'see_again', label: 'Would see them again' },
  { value: 'good_unsure', label: 'Good, unsure' },
  { value: 'not_really', label: 'Not really' },
  { value: 'definitely_not', label: 'Definitely not' },
];

export const FEEDBACK_TAGS: FeedbackTag[] = ['chemistry', 'conversation', 'lifestyle', 'values', 'attraction', 'timing', 'personality', 'other'];

/** Lightweight post-date feedback: one tap, with optional detail. */
export const FeedbackModal = ({
  pending,
  onClose,
  onSubmit,
}: {
  pending: PendingFeedback;
  onClose: () => void;
  onSubmit: (rating: FeedbackRating, tags: FeedbackTag[], note: string, learned: string | null) => void;
}) => {
  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [tags, setTags] = useState<FeedbackTag[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const negative = rating === 'not_really' || rating === 'definitely_not' || rating === 'good_unsure';

  const submit = async () => {
    if (!rating) return;
    setBusy(true);
    const s = note.trim() ? await ai.summarizeFeedback(note) : { tags: [], learned: null };
    onSubmit(rating, [...new Set([...tags, ...s.tags])], note.trim(), s.learned);
  };

  return (
    <Modal
      title={`How did it feel with ${pending.personName}?`}
      onClose={onClose}
      footer={
        busy ? (
          <Spinner label="Updating what I’ve learned…" />
        ) : (
          <>
            <Button variant="quiet" onClick={onClose}>
              Later
            </Button>
            <Button variant="primary" disabled={!rating} onClick={submit}>
              Share feedback
            </Button>
          </>
        )
      }
    >
      <p className="mb-4 text-[15px] text-muted">{pending.context} Your answer stays private — {pending.personName} never sees it.</p>
      <ConfirmationChips label="How did that feel?" value={rating} onChange={setRating} options={RATINGS} />
      {rating && (
        <div className="rise mt-6 space-y-4">
          {negative && (
            <div>
              <p className="mb-2 text-[15px] font-semibold text-heading">What did I get wrong? <span className="font-normal text-muted">(optional)</span></p>
              <div className="flex flex-wrap gap-2">
                {FEEDBACK_TAGS.map((t) => {
                  const on = tags.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setTags((xs) => (on ? xs.filter((x) => x !== t) : [...xs, t]))}
                      className={on ? 'min-h-10 rounded-full bg-accent px-4 text-sm font-semibold text-on-accent capitalize' : 'min-h-10 rounded-full border border-line px-4 text-sm font-semibold text-heading capitalize hover:bg-soft'}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-[15px] font-semibold text-heading">Anything else? <span className="font-normal text-muted">(optional)</span></p>
            <VoiceInput label="Feedback notes" value={note} onChange={setNote} rows={3} placeholder="e.g. He was nice but honestly the conversation felt too serious." />
          </div>
        </div>
      )}
    </Modal>
  );
};
