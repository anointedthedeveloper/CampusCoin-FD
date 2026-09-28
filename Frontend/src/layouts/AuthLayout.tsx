import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { AUTH_HERO_DETAIL_QUERY, AuthHero } from '@/components/auth';
import { useMediaQuery } from '@/hooks/useMinHeight';
import { assets } from '@/assets/images';
import { cn } from '@/utils/cn';
import type { AuthPageOutletContext } from '@/pages/auth/authOutletContext';

// At lg+ (where the hero and form sit side by side) the hero photo extends
// the full width of the layout instead of stopping at a hard seam into a
// flat-colored form panel — the photo fades into a solid, theme-appropriate
// backdrop by the time it reaches the form column. Written as plain CSS
// gradients (not Tailwind's from-/via-/to- utilities) so the exact stop
// positions are unambiguous and don't depend on Tailwind's opacity-scale
// lookup for those utilities, which silently no-ops for values outside its
// preset scale.
// Light mode keeps the photo's own bright daylight look through the hero
// side (just a whisper of white wash) and fades to solid white by the form
// column. Dark mode keeps its original deep brand-green wash throughout.
const AUTH_BACKDROP_LIGHT =
  'linear-gradient(to right, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.5) 32%, rgba(255,255,255,0.6) 50%, rgba(248,250,248,0.8) 64%, #f8faf8 78%, #f8faf8 100%)';
const AUTH_BACKDROP_DARK =
  'linear-gradient(to right, rgba(5,46,22,0.88) 0%, rgba(5,46,22,0.84) 32%, rgba(5,46,22,0.9) 50%, rgba(9,18,13,0.85) 62%, #09120d 76%, #09120d 100%)';

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
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-brand-50/60 dark:bg-background lg:flex-row">
      {/* Full-bleed background, lg+ only — see AUTH_BACKDROP_* above. Below
          lg the two columns stack and each keeps its own background
          (AuthHero's own photo up top, this container's flat color below). */}
      <div className="absolute inset-0 z-0 hidden lg:block" aria-hidden="true">
        <img
          src={assets.authHero}
          alt=""
          className="absolute inset-0 h-full w-full animate-slow-zoom object-cover object-center saturate-[1.15]"
        />
        <div className="absolute inset-0 dark:hidden" style={{ backgroundImage: AUTH_BACKDROP_LIGHT }} />
        <div className="absolute inset-0 hidden dark:block" style={{ backgroundImage: AUTH_BACKDROP_DARK }} />
        {/* Warm golden-hour glow — dark mode only; light mode is bright daylight, not a dusk tint. */}
        <div
          className="absolute inset-0 hidden dark:block"
          style={{ backgroundImage: 'radial-gradient(ellipse 60% 65% at 12% 100%, rgba(217,167,45,0.18), transparent 60%)' }}
        />
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
                'hidden items-center justify-center gap-1.5 text-sm font-medium text-gray-500 transition-colors duration-200 hover:text-brand-700 dark:text-text-muted dark:hover:text-primary-accent lg:flex',
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
