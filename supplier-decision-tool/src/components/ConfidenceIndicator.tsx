import type { ConfidenceResult } from '../types';
import { Badge, cx, Icon, type Tone } from './ui/primitives';

const toneFor = (label: ConfidenceResult['label']): Tone => (label === 'High' ? 'good' : label === 'Medium' ? 'caution' : 'risk');

/** Three-segment meter + label. The label text always accompanies the color. */
export const ConfidenceIndicator = ({ confidence, compact = false }: { confidence: ConfidenceResult; compact?: boolean }) => {
  const segments = confidence.label === 'High' ? 3 : confidence.label === 'Medium' ? 2 : 1;
  const fill = confidence.label === 'High' ? 'bg-good' : confidence.label === 'Medium' ? 'bg-[#c98a00]' : 'bg-risk';
  return (
    <span className="inline-flex items-center gap-2" title={`Confidence ${confidence.score}/100`}>
      <span className="flex gap-0.5" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={cx('h-2.5 w-1.5 rounded-sm', i < segments ? fill : 'bg-line')} />
        ))}
      </span>
      <span className={cx('text-xs font-semibold', confidence.label === 'High' ? 'text-good' : confidence.label === 'Medium' ? 'text-caution' : 'text-risk')}>
        {confidence.label}
        {!compact && <span className="tabular ml-1 font-normal text-muted">({confidence.score})</span>}
      </span>
    </span>
  );
};

export const ConfidenceBadge = ({ confidence }: { confidence: ConfidenceResult }) => (
  <Badge tone={toneFor(confidence.label)}>{confidence.label} confidence</Badge>
);

export const ConfidenceReasons = ({ confidence, limit = 6 }: { confidence: ConfidenceResult; limit?: number }) =>
  confidence.items.length === 0 ? (
    <p className="flex items-center gap-1.5 text-sm text-good">{Icon.check()} Key inputs are complete, recent and verified.</p>
  ) : (
    <ul className="space-y-1.5">
      {confidence.items.slice(0, limit).map((i) => (
        <li key={i.reason} className="flex items-start gap-2 text-sm text-ink-2">
          <span className={cx('mt-0.5 shrink-0', i.importance === 'major' ? 'text-caution' : 'text-muted')}>{Icon.warn('h-3.5 w-3.5')}</span>
          <span>
            {i.reason} <span className="tabular text-xs text-muted">(−{i.penalty})</span>
          </span>
        </li>
      ))}
      {confidence.items.length > limit && <li className="text-xs text-muted">+{confidence.items.length - limit} smaller adjustments</li>}
    </ul>
  );
