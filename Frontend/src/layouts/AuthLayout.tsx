import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { AUTH_HERO_DETAIL_QUERY, AuthHero } from '@/components/auth';
import { useMediaQuery } from '@/hooks/useMinHeight';
import { assets } from '@/assets/images';
import { cn } from '@/utils/cn';
import type { AuthPageOutletContext } from '@/pages/auth/authOutletContext';

// At lg+ the photo runs full-bleed behind both columns. Instead of washing
// it out with a white gradient (which left the hero copy low-contrast in
// light mode), the photo keeps its colour under a light tint and every piece
// of text sits on a frosted-glass panel with its own solid-enough backdrop.
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
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-white dark:bg-background lg:flex-row">
      {/* Full-bleed background, lg+ only. Below
          lg the two columns stack and each keeps its own background
          (AuthHero's own photo up top, this container's flat color below). */}
      <div className="absolute inset-0 z-0 hidden lg:block" aria-hidden="true">
        <img
          src={assets.authHero}
          alt=""
          className="absolute inset-0 h-full w-full animate-slow-zoom object-cover object-center saturate-[1.15]"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-950/25 via-transparent to-brand-950/30 dark:from-black/70 dark:via-brand-950/60 dark:to-black/75" />
      </div>

      <div
        className={cn(
          'relative z-10 w-full shrink-0 lg:h-full lg:max-h-none lg:w-[55%] xl:w-[58%]',
          hasRoomForDetails ? 'h-[460px] sm:h-[500px]' : 'h-[110px] max-h-[110px] min-h-[110px]',
        )}
      >
        <AuthHero />
      </div>

      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto">
        <div
          className={cn(
            // Auto margins (not items-center) so a form taller than the
            // viewport scrolls from its top instead of being cut off above.
            'flex min-h-full flex-1 flex-col px-4 sm:px-6',
            isShort ? 'py-4 lg:px-8' : hasRoomForDetails ? 'py-6 lg:p-10 xl:p-14' : 'py-3',
          )}
        >
          <div className="m-auto w-full max-w-md animate-fade-in-up lg:max-w-lg">
            <div
              className={cn(
                'auth-glow-border glass-panel rounded-2xl transition-shadow duration-300',
                glowDirection,
                compact ? 'p-4' : 'p-6 sm:p-8',
              )}
            >
              <Outlet context={{ compact } satisfies AuthPageOutletContext} />
            </div>
            <Link
              to={PUBLIC_ROUTES.home}
              className={cn(
                'glass-chip mx-auto hidden w-fit items-center justify-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-gray-800 transition-colors duration-200 hover:text-brand-700 dark:text-white/85 dark:hover:text-primary-accent lg:flex',
                isShort ? 'mt-2' : 'mt-6',
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Campus Coin
            </Link>
            <p className="mt-3 text-center text-[11px] text-gray-600 dark:text-white/50">Made by <span className="font-semibold">Team Flandek</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
