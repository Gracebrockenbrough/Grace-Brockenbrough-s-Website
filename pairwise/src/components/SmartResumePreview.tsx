import { Check, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ai } from '../lib/ai';
import type { TailoredResume } from '../lib/resume';
import type { JobOpportunity, ResumeMaster } from '../types';
import { cx, Spinner } from './ui';

/** Shows the resume Pairwise would share for this role. Selection and order only — never new facts. */
export const SmartResumePreview = ({ master, job, name, compact = false }: { master: ResumeMaster; job: JobOpportunity; name: string; compact?: boolean }) => {
  const [view, setView] = useState<'tailored' | 'master'>('tailored');
  const [t, setT] = useState<TailoredResume | null>(null);
  useEffect(() => {
    let live = true;
    ai.tailorResume(master, job).then((r) => live && setT(r));
    return () => {
      live = false;
    };
  }, [master, job]);
  if (!t) return <Spinner label="Tailoring your resume for this role…" />;

  const roles =
    view === 'tailored'
      ? t.roles
      : master.roles.map((r) => ({ ...r, omitted: 0, bullets: r.bullets.map((b) => ({ ...b, relevance: 0, highlighted: false })) }));
  const skills = view === 'tailored' ? t.skills : master.skills.map((s) => ({ name: s, relevant: false }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Resume version" className="inline-flex rounded-full border border-line bg-surface p-1">
          {(['tailored', 'master'] as const).map((v) => (
            <button key={v} role="tab" type="button" aria-selected={view === v} onClick={() => setView(v)} className={cx('min-h-9 rounded-full px-4 text-sm font-semibold', view === v ? 'bg-accent text-on-accent' : 'text-muted hover:text-heading')}>
              {v === 'tailored' ? `Tailored for ${job.company.name}` : 'Master profile'}
            </button>
          ))}
        </div>
      </div>
      {view === 'tailored' && !compact && (
        <ul className="mb-5 grid gap-1.5 text-sm text-ink sm:grid-cols-2">
          {t.changes.map((c) => (
            <li key={c} className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
              {c}
            </li>
          ))}
          <li className="flex gap-2 font-semibold text-heading sm:col-span-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
            Nothing added or reworded. Every line comes from your master profile.
          </li>
        </ul>
      )}
      <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-muted">
          <FileText className="h-4 w-4" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider">Resume preview</span>
        </div>
        <h3 className="mt-2 text-xl font-bold text-heading">{name}</h3>
        <p className="text-sm text-muted">{master.headline}</p>
        {roles.map((r) => (
          <section key={r.id} className="mt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-semibold text-heading">
                {r.title} · <span className="font-normal">{r.company}</span>
              </h4>
              <span className="text-xs text-muted">
                {r.start}–{r.end}
              </span>
            </div>
            <ul className="mt-2 space-y-1.5">
              {r.bullets.map((b) => (
                <li key={b.id} className={cx('rounded-lg px-2 py-1 text-[14px] leading-snug', b.highlighted ? 'bg-soft text-ink' : 'text-ink')}>
                  {b.text}
                  {b.highlighted && <span className="sr-only"> (highlighted for this role)</span>}
                </li>
              ))}
            </ul>
            {r.omitted > 0 && <p className="mt-1 px-2 text-xs text-muted">{r.omitted} more in your master profile</p>}
          </section>
        ))}
        <section className="mt-5">
          <h4 className="font-semibold text-heading">Skills</h4>
          <p className="mt-1 text-[14px] text-ink">
            {skills.map((s, i) => (
              <span key={s.name} className={cx(s.relevant && 'font-semibold text-accent-strong')}>
                {s.name}
                {i < skills.length - 1 ? ' · ' : ''}
              </span>
            ))}
          </p>
        </section>
        <section className="mt-5 text-[14px] text-ink">
          <h4 className="font-semibold text-heading">Education</h4>
          {t.education.map((e) => (
            <p key={e.school}>
              {e.degree}, {e.school} ({e.year})
            </p>
          ))}
          {t.certifications.length > 0 && <p className="mt-1">{t.certifications.join(' · ')}</p>}
        </section>
      </div>
      <p className="mt-3 text-xs text-muted">Highlighted lines are most relevant to this role.</p>
    </div>
  );
};
