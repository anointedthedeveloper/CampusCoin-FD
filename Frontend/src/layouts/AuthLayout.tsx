import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { AUTH_HERO_DETAIL_QUERY, AuthHero } from '@/components/auth';
import { useMediaQuery } from '@/hooks/useMinHeight';
import { cn } from '@/utils/cn';
import type { AuthPageOutletContext } from '@/pages/auth/authOutletContext';

export function AuthLayout() {
  const hasRoomForDetails = useMediaQuery(AUTH_HERO_DETAIL_QUERY);
  // Height-only signal: even on wide desktop windows, a short browser viewport
  // (e.g. a maximized window with a lot of chrome) can leave too little room
  // for a full-length form — so the card and its contents shrink independent
  // of whether the hero itself is showing its full detail.
  const isShort = !useMediaQuery('(min-height: 900px)');
  const compact = !hasRoomForDetails || isShort;

  // The card's animated border "current" flows clockwise on the sign-up page
  // and counter-clockwise everywhere else (login, forgot/reset password).
  const { pathname } = useLocation();
  const glowDirection = pathname === PUBLIC_ROUTES.register ? 'auth-glow-cw' : 'auth-glow-ccw';

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-brand-50/60 dark:bg-background lg:flex-row">
      <div
        className={cn(
          'relative w-full shrink-0 lg:h-full lg:max-h-none lg:w-[55%] xl:w-[58%]',
          hasRoomForDetails ? 'h-[460px] sm:h-[500px]' : 'h-[110px] max-h-[110px] min-h-[110px]',
        )}
      >
        <AuthHero />
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <div
          className={cn(
            'flex min-h-full flex-1 items-center justify-center px-4 sm:px-6',
            isShort ? 'py-2' : hasRoomForDetails ? 'py-6 lg:p-10 xl:p-14' : 'py-3',
          )}
        >
          <div className="w-full max-w-md animate-fade-in-up lg:max-w-lg">
            <div
              className={cn(
                'auth-glow-border rounded-2xl border border-gray-100 bg-white shadow-lg shadow-gray-200/50 transition-shadow duration-300 hover:shadow-xl dark:border-white/10 dark:bg-surface-elevated dark:shadow-black/40',
                glowDirection,
                compact ? 'p-4' : 'p-6 sm:p-8',
              )}
            >
              <Outlet context={{ compact } satisfies AuthPageOutletContext} />
            </div>
            <Link
              to={PUBLIC_ROUTES.home}
              className={cn(
                'hidden items-center justify-center gap-1.5 text-sm font-medium text-gray-500 transition-colors duration-200 hover:text-brand-700 dark:text-text-muted dark:hover:text-[var(--primary-accent)] lg:flex',
                isShort ? 'mt-2' : 'mt-6',
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Campus Coin
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
