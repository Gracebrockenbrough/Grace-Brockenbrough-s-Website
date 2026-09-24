import { Eye, Heart, MapPin, X } from 'lucide-react';
import type { IntroductionStatus, PersonalCandidate } from '../types';
import { Portrait } from './brand';

/** Stage 1 of the progressive reveal: photo, first name, age, general area, three facts. */
export const MatchCard = ({
  c,
  status,
  exploratory,
  onPass,
  onInterested,
  onView,
}: {
  c: PersonalCandidate;
  status: IntroductionStatus;
  exploratory: boolean;
  onPass: () => void;
  onInterested: () => void;
  onView: () => void;
}) => {
  const waiting = status === 'interested';
  const mutual = status === 'mutual';
  return (
    <article className="card lift rise flex flex-col overflow-hidden" aria-label={`${c.firstName}, ${c.age}`}>
      <button type="button" onClick={onView} className="relative block text-left" aria-label={`View ${c.firstName}`}>
        <Portrait name={c.firstName} hue={c.photoHue} className="aspect-[4/3.5] w-full" rounded="rounded-none" />
        {mutual && (
          <span className="pop absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-bold text-accent-strong shadow">
            <Heart className="h-3.5 w-3.5 fill-current" aria-hidden /> It’s mutual
          </span>
        )}
        {exploratory && !mutual && (
          <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-heading shadow-sm">A different direction</span>
        )}
      </button>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-xl font-bold text-heading">
          {c.firstName}, <span className="font-semibold">{c.age}</span>
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> {c.area}
        </p>
        <ul className="mt-4 space-y-1.5 text-[15px] text-ink">
          {c.facts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <div className="mt-auto pt-5">
          {waiting ? (
            <p className="mb-3 rounded-xl bg-soft px-3 py-2.5 text-sm text-accent-strong">Introduced privately. You’ll hear from me only if it’s mutual.</p>
          ) : null}
          {!waiting && !mutual ? (
            <div className="space-y-2">
              <button type="button" onClick={onInterested} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[15px] font-semibold text-on-accent hover:bg-accent-strong">
                <Heart className="h-5 w-5" aria-hidden /> Interested
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={onPass} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-semibold text-muted hover:bg-soft hover:text-heading">
                  <X className="h-4 w-4" aria-hidden /> Pass
                </button>
                <button type="button" onClick={onView} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-semibold text-heading hover:bg-soft">
                  <Eye className="h-4 w-4" aria-hidden /> View
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={onView} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-line text-sm font-semibold text-heading hover:bg-soft">
              <Eye className="h-4 w-4" aria-hidden /> {mutual ? 'See full profile' : 'View'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
