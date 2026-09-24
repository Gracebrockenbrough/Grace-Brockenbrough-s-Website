import { Briefcase, Heart, Lock, Sparkles, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { PairwiseLogo } from '../components/brand';
import { Button, ConfirmationChips, cx, Spinner, useToast } from '../components/ui';
import { VoiceInput } from '../components/VoiceConversation';
import { ai } from '../lib/ai';
import { OPENING, sampleAnswerFor } from '../lib/ai/mock';
import type { ExtractedStatement, OnboardingMode, Turn } from '../lib/ai/types';
import { useStore } from '../state/store';

type Verdict = 'right' | 'mostly' | 'edited';
type Reviewed = ExtractedStatement & { verdict?: Verdict; editing?: boolean };

const MODES: { value: OnboardingMode; label: string; body: string; icon: typeof Heart; color: string }[] = [
  { value: 'personal', label: 'Personal', body: 'Dating and meaningful connections.', icon: Heart, color: '#c4412f' },
  { value: 'professional', label: 'Professional', body: 'Full-time roles that fit you.', icon: Briefcase, color: '#2455cc' },
  { value: 'both', label: 'Both', body: 'Two separate experiences. One private understanding of you.', icon: Users, color: '#2c7350' },
];

export const OnboardingPage = () => {
  const { state, actions } = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState<'choose' | 'talk' | 'review'>('choose');
  const [mode, setMode] = useState<OnboardingMode>(state.participation.personal && state.participation.professional ? 'both' : state.participation.professional ? 'professional' : 'both');
  const [name, setName] = useState(state.profile.firstName);
  const [age, setAge] = useState(state.profile.age ? String(state.profile.age) : '');
  const [location, setLocation] = useState(state.profile.location);
  const [history, setHistory] = useState<Turn[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [thinking, setThinking] = useState(false);
  const [statements, setStatements] = useState<Reviewed[] | null>(null);
  const [attributes, setAttributes] = useState<Record<string, unknown>>({});
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [history, thinking]);

  const start = () => {
    if (!name.trim()) {
      toast('Tell me what to call you first.');
      return;
    }
    if (age && (Number(age) < 18 || Number(age) > 99)) {
      toast('Pairwise is for adults 18 and over.');
      return;
    }
    setQuestion(OPENING[mode]);
    setStep('talk');
  };

  const finish = async (h: Turn[]) => {
    setThinking(true);
    const res = await ai.extractUserModel(h, mode);
    setStatements(res.statements);
    setAttributes(res.attributes);
    setThinking(false);
    setStep('review');
  };

  const submit = async (text: string) => {
    if (!text.trim()) return;
    const h = [...history, { question, answer: text.trim() }];
    setHistory(h);
    setAnswer('');
    setThinking(true);
    const next = await ai.generateFollowUpQuestion(h, mode);
    setThinking(false);
    if (next.done) finish(h);
    else setQuestion(next.question);
  };

  const allReviewed = statements?.every((s) => s.verdict && !s.editing) ?? false;
  const turnCount = history.length;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 flex items-center justify-between">
        <PairwiseLogo />
        {state.onboarded && (
          <Button variant="quiet" size="sm" onClick={() => navigate('/profile')}>
            Back to profile
          </Button>
        )}
      </div>

      {step === 'choose' && (
        <div className="rise">
          <h1 className="text-[32px] leading-tight font-bold text-heading">Let’s get to know you.</h1>
          <p className="mt-3 text-[17px] leading-relaxed text-muted">
            A short conversation — about five minutes. Speak or type naturally. I’ll show you what I learned before using any of it.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_6rem_1fr]">
            <div>
              <label htmlFor="ob-name" className="mb-1 block text-sm font-semibold text-heading">What should I call you?</label>
              <input id="ob-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" />
            </div>
            <div>
              <label htmlFor="ob-age" className="mb-1 block text-sm font-semibold text-heading">Age</label>
              <input id="ob-age" className="input" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, '').slice(0, 2))} />
            </div>
            <div>
              <label htmlFor="ob-loc" className="mb-1 block text-sm font-semibold text-heading">Neighborhood or city</label>
              <input id="ob-loc" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Brooklyn, NY" />
            </div>
          </div>
          <p className="mt-8 mb-3 text-sm font-semibold text-heading">What would you like Pairwise to help with?</p>
          <div role="radiogroup" aria-label="What Pairwise should help with" className="grid gap-3 sm:grid-cols-3">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                onClick={() => setMode(m.value)}
                className={cx('card p-5 text-left transition', mode === m.value ? 'ring-2 ring-[#1d2227]' : 'hover:-translate-y-0.5')}
              >
                <m.icon className="h-6 w-6" style={{ color: m.color }} aria-hidden />
                <p className="mt-3 font-bold text-heading">{m.label}</p>
                <p className="mt-1 text-sm text-muted">{m.body}</p>
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            {mode === 'both'
              ? 'Your dating profile never shows your resume, and employers never see anything from Personal.'
              : `The ${mode === 'personal' ? 'Professional' : 'Personal'} side stays off. You can turn it on later.`}
          </p>
          <Button variant="primary" size="lg" className="mt-8" onClick={start}>
            Start the conversation
          </Button>
        </div>
      )}

      {step === 'talk' && (
        <div>
          <div className="mb-4 flex items-center justify-between text-sm text-muted">
            <span>Conversation</span>
            <span>{Math.min(turnCount + 1, 7)} of about 6</span>
          </div>
          <div className="space-y-5">
            {history.map((t, i) => (
              <div key={i} className="space-y-3">
                <p className="flex gap-2 text-[16px] text-heading">
                  <Sparkles className="mt-1 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  {t.question}
                </p>
                <p className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-md bg-surface px-4 py-3 text-[15px] leading-relaxed text-ink shadow-sm ring-1 ring-line">{t.answer}</p>
              </div>
            ))}
            {thinking ? (
              <Spinner label={turnCount >= 5 ? 'Understanding your preferences…' : 'Listening…'} />
            ) : (
              <div className="rise space-y-4">
                <p className="flex gap-2 text-[20px] leading-snug font-semibold text-heading">
                  <Sparkles className="mt-1.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
                  {question}
                </p>
                <VoiceInput label="Your answer" value={answer} onChange={setAnswer} onSubmit={() => submit(answer)} placeholder="Tap Speak, or type here…" />
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" disabled={!answer.trim()} onClick={() => submit(answer)}>
                    Continue
                  </Button>
                  {sampleAnswerFor(question) && (
                    <Button variant="quiet" onClick={() => setAnswer(sampleAnswerFor(question))}>
                      Use a sample answer
                    </Button>
                  )}
                  <Button variant="quiet" onClick={() => submit('(skipped)')}>
                    Skip
                  </Button>
                  {turnCount >= 3 && (
                    <Button variant="quiet" onClick={() => finish(history)}>
                      That’s enough for now
                    </Button>
                  )}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
      )}

      {step === 'review' && statements && (
        <div className="rise">
          <h1 className="text-[30px] font-bold text-heading">Here’s what I think I learned.</h1>
          <p className="mt-2 text-[16px] text-muted">Correct anything that’s off. Nothing is saved until you confirm, and all of it is private to Pairwise.</p>
          <ul className="mt-6 space-y-3">
            {statements.map((s, i) => (
              <li key={s.id} className="card p-5">
                {s.editing ? (
                  <div className="space-y-3">
                    <label htmlFor={`st-${s.id}`} className="sr-only">Edit statement</label>
                    <textarea id={`st-${s.id}`} className="input" rows={2} value={s.text} onChange={(e) => setStatements((xs) => xs!.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                    <Button size="sm" variant="primary" onClick={() => setStatements((xs) => xs!.map((x, j) => (j === i ? { ...x, editing: false, verdict: 'edited' } : x)))}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="text-[16px] leading-relaxed text-ink">
                      {s.text}
                      {s.sensitive && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-soft px-2 py-0.5 align-middle text-xs font-semibold text-muted">
                          <Lock className="h-3 w-3" aria-hidden /> Private
                        </span>
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <ConfirmationChips
                        label="Is this right?"
                        value={s.verdict === 'edited' ? null : s.verdict}
                        onChange={(v) => {
                          if (v === 'edit') setStatements((xs) => xs!.map((x, j) => (j === i ? { ...x, editing: true } : x)));
                          else setStatements((xs) => xs!.map((x, j) => (j === i ? { ...x, verdict: v } : x)));
                        }}
                        options={[
                          { value: 'right', label: 'That’s right' },
                          { value: 'mostly', label: 'Mostly right' },
                          { value: 'edit', label: 'Edit' },
                        ] as { value: Verdict | 'edit'; label: string }[]}
                      />
                      {s.verdict === 'edited' && <span className="text-sm font-semibold text-accent">Edited</span>}
                      <button type="button" className="ml-auto text-sm text-muted underline-offset-2 hover:underline" onClick={() => setStatements((xs) => xs!.filter((_, j) => j !== i))}>
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              disabled={!allReviewed}
              onClick={() => {
                actions.completeOnboarding(
                  mode,
                  statements.map((s) => ({ ...s, verdict: s.verdict! })),
                  attributes,
                  { firstName: name.trim(), ...(Number(age) ? { age: Number(age) } : {}), ...(location.trim() ? { location: location.trim() } : {}) },
                );
                toast('Saved. I’ll use this to find people and opportunities that fit.');
                navigate(mode === 'professional' ? '/professional' : '/profile');
              }}
            >
              Looks good — save
            </Button>
            {!allReviewed && <span className="text-sm text-muted">Review each statement to continue.</span>}
          </div>
        </div>
      )}
    </div>
  );
};
