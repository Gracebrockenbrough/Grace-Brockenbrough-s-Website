import { Briefcase, Heart, Settings, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router';
import { PairwiseLogo } from './brand';
import { cx } from './ui';

export type Area = 'profile' | 'personal' | 'professional' | 'settings' | 'onboarding';

export const NAV = [
  { to: '/profile', label: 'Profile', icon: UserRound, area: 'profile', dot: '#2c7350' },
  { to: '/personal', label: 'Personal', icon: Heart, area: 'personal', dot: '#c4412f' },
  { to: '/professional', label: 'Professional', icon: Briefcase, area: 'professional', dot: '#2455cc' },
  { to: '/settings', label: 'Settings', icon: Settings, area: 'settings', dot: '#2f3339' },
] as const;

export const areaForPath = (path: string): Area => {
  if (path.startsWith('/personal')) return 'personal';
  if (path.startsWith('/professional')) return 'professional';
  if (path.startsWith('/settings')) return 'settings';
  if (path.startsWith('/welcome')) return 'onboarding';
  return 'profile';
};

/** Desktop sidebar + mobile bottom navigation. Only four destinations, by design. */
export const AppShell = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const area = areaForPath(pathname);
  return (
    <div data-area={area} className="area-transition min-h-screen bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface/80 px-5 py-6 backdrop-blur md:flex">
        <NavLink to="/profile" className="mb-10 px-2" aria-label="Pairwise home">
          <PairwiseLogo />
        </NavLink>
        <nav aria-label="Primary" className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, area: a, dot }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cx(
                  'flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors',
                  isActive || area === a ? 'bg-soft text-heading' : 'text-[#5c636b] hover:bg-black/[0.03] hover:text-[#1d2227]',
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden style={{ color: area === a ? dot : undefined }} />
              <span className="flex-1">{label}</span>
              {area === a && <span className="h-2 w-2 rounded-full" style={{ background: dot }} aria-hidden />}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-2 text-xs leading-relaxed text-[#6b7178]">Demo data only. People and companies shown are fictional.</p>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur md:hidden">
        <NavLink to="/profile" className="py-3" aria-label="Pairwise home">
          <PairwiseLogo size={30} />
        </NavLink>
      </header>

      <main className="px-4 pt-6 pb-28 sm:px-6 md:ml-64 md:px-10 md:pt-10 md:pb-16">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>

      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon, area: a, dot }) => (
          <NavLink key={to} to={to} className={cx('flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-semibold', area === a ? 'text-[#1d2227]' : 'text-[#6b7178]')}>
            <Icon className="h-5 w-5" aria-hidden style={{ color: area === a ? dot : undefined }} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export const PageHeader = ({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) => (
  <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
    <div className="max-w-2xl">
      {eyebrow && <div className="eyebrow mb-2">{eyebrow}</div>}
      <h1 className="text-[28px] leading-tight font-bold tracking-[-0.01em] text-heading sm:text-[34px]">{title}</h1>
      {subtitle && <p className="mt-2 text-[16px] leading-relaxed text-muted">{subtitle}</p>}
    </div>
    {action}
  </div>
);
