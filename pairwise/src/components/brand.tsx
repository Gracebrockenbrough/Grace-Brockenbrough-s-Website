import { useId } from 'react';
import { cx } from './ui';

/** Two abstract figures coming together; their lower bodies overlap into a blended connection. */
export const PairwiseLogo = ({ size = 36, withWordmark = true, className }: { size?: number; withWordmark?: boolean; className?: string }) => {
  const clip = useId();
  const leftBody = 'M5 45 C5 31 10.5 22 18 22 C25.5 22 30 31 30 45 Z';
  const rightBody = 'M18 45 C18 31 22.5 22 30 22 C37.5 22 43 31 43 45 Z';
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Pairwise logo">
        <defs>
          <clipPath id={clip}>
            <path d={leftBody} />
          </clipPath>
        </defs>
        <circle cx="18" cy="12.5" r="6" fill="#1e3a6d" />
        <circle cx="30" cy="12.5" r="6" fill="#e5604b" />
        <path d={leftBody} fill="#1e3a6d" />
        <path d={rightBody} fill="#e5604b" />
        <path d={rightBody} fill="#8a3c5e" clipPath={`url(#${clip})`} />
      </svg>
      {withWordmark && <span className="text-[21px] font-bold tracking-[-0.02em] text-[#1d2227]">Pairwise</span>}
    </span>
  );
};

/**
 * Illustrated placeholder portrait. The demo uses these instead of real photos;
 * uploaded photos would render in the same frame.
 */
export const Portrait = ({ name, hue, scene, className, rounded = 'rounded-2xl' }: { name: string; hue: number; scene?: string; className?: string; rounded?: string }) => {
  const g = useId();
  const bg1 = `hsl(${hue} 45% 86%)`;
  const bg2 = `hsl(${(hue + 30) % 360} 40% 72%)`;
  const figure = `hsl(${hue} 28% 34%)`;
  return (
    <div className={cx('relative overflow-hidden', rounded, className)}>
      <svg viewBox="0 0 120 150" preserveAspectRatio="xMidYMid slice" className="h-full w-full" role="img" aria-label={`Illustrated placeholder photo of ${name}${scene ? `, ${scene.toLowerCase()}` : ''}`}>
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={bg1} />
            <stop offset="1" stopColor={bg2} />
          </linearGradient>
        </defs>
        <rect width="120" height="150" fill={`url(#${g})`} />
        {scene && <circle cx="96" cy="26" r="16" fill="white" opacity="0.35" />}
        <circle cx="60" cy="62" r="22" fill={figure} />
        <path d="M18 150 C18 112 36 96 60 96 C84 96 102 112 102 150 Z" fill={figure} />
      </svg>
      {scene && <span className="absolute bottom-2 left-2 rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-[#1d2227]">{scene}</span>}
    </div>
  );
};

export const CompanyLogo = ({ monogram, color, name, size = 48 }: { monogram: string; color: string; name: string; size?: number }) => (
  <span
    role="img"
    aria-label={`${name} logo`}
    className="inline-flex shrink-0 items-center justify-center rounded-xl font-bold text-white"
    style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
  >
    {monogram}
  </span>
);
