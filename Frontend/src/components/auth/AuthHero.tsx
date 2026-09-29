import { Link } from 'react-router-dom';
import { ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { APP_TAGLINE } from '@/constants/config';
import { Logo } from '@/components/common';
import { useMediaQuery } from '@/hooks/useMinHeight';
import { assets } from '@/assets';

// Below the lg breakpoint (1024px wide), the full multi-line hero only has
// room to render without clipping once the viewport is tall enough; below
// that it collapses to a compact single-row banner (see the early return).
// At lg+ width the desktop column always gets the full hero regardless of
// height — its card scrolls independently, so there's no risk of the auth
// form being pushed off-screen there.
export const AUTH_HERO_DETAIL_QUERY = '(min-height: 920px), (min-width: 1024px)';

const features = [
  {
    icon: Wallet,
    title: 'Track Every Naira',
    body: 'Log income and expenses in seconds — no bank account needed.',
  },
  {
    icon: ShieldCheck,
    title: 'Private & Secure',
    body: 'Only you can see your financial records.',
  },
  {
    icon: TrendingUp,
    title: 'Built for Students',
    body: 'Financial tools designed around everyday campus life.',
  },
];

function HeroBackground() {
  return (
    <>
      <img
        src={assets.authHero}
        alt=""
        className="absolute inset-0 h-full w-full animate-slow-zoom object-cover object-center saturate-[1.15]"
        aria-hidden="true"
      />
      {/* A light tint only — text readability comes from the glass panels,
          not from washing the photo out. */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-brand-950/20 to-brand-950/35 dark:from-black/65 dark:to-brand-950/80"
        aria-hidden="true"
      />
    </>
  );
}

/**
 * The branding/hero panel shared by every auth page (login, register,
 * forgot/reset password). Same image and copy at every size — only the
 * surrounding container's height/width changes (a short banner on mobile,
 * the full-height left column on desktop; see AuthLayout). On a short
 * viewport this collapses to a single compact row (logo + one-line copy)
 * instead of squeezing the full multi-line layout into too little height.
 */
export function AuthHero() {
  const hasRoomForDetails = useMediaQuery(AUTH_HERO_DETAIL_QUERY);

  if (!hasRoomForDetails) {
    return (
      <div className="relative flex h-full w-full items-center overflow-hidden">
        <HeroBackground />
        <Link to={PUBLIC_ROUTES.home} className="glass-panel relative mx-3 flex min-w-0 items-center gap-3 rounded-2xl px-4 py-2">
          <Logo iconClassName="h-9 w-9 drop-shadow-md" showWordmark={false} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-[#1d3d2d] dark:text-white">Campus Coin</p>
            <p className="truncate text-xs text-gray-600 dark:text-white/70">Smart Finance for a Brighter Campus Life</p>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      {/* Below lg, this column owns its own background. At lg+, AuthLayout
          renders one continuous background across both columns instead
          (see AuthLayout.tsx) — this stays for legibility on narrower
          viewports without duplicating the photo/gradient at lg+. */}
      <div className="lg:hidden">
        <HeroBackground />
      </div>

      <div className="relative flex h-full flex-col justify-between gap-3 p-4 sm:p-6 lg:gap-6 lg:p-10 xl:p-14">
        <Link to={PUBLIC_ROUTES.home} className="glass-panel w-fit animate-fade-in-up rounded-2xl px-4 py-3">
          <Logo
            iconClassName="h-9 w-9 drop-shadow-md lg:h-11 lg:w-11"
            wordmarkClassName="text-base text-[#1d3d2d] dark:text-white lg:text-lg"
            showTagline={false}
          />
          <span className="-mt-1 ml-[2.75rem] block text-[11px] font-medium text-gray-600 dark:text-white/70 lg:ml-[3.25rem] lg:text-xs">
            {APP_TAGLINE}
          </span>
        </Link>

        <div className="glass-panel max-w-lg animate-fade-in-up rounded-3xl p-5 [animation-delay:100ms] sm:p-6 lg:p-8">
          <h1 className="max-w-md text-3xl font-bold leading-[1.1] tracking-tight text-gray-900 dark:text-white sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08] xl:text-5xl">
            Smart Finance
            <br />
            for a <span className="text-brand-700 dark:text-brand-400">Brighter</span>
            <br />
            Campus Life
          </h1>

          <p className="mt-3 max-w-sm text-xs leading-relaxed text-gray-800 dark:text-white/80 sm:text-sm lg:mt-5">
            Manage your money, track your spending, and build better financial habits — all in one place.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-8 lg:grid-cols-1 lg:gap-4 [@media(max-height:760px)]:hidden">
            {features.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className="flex animate-float items-start gap-2.5 transition-transform duration-200 hover:translate-x-1 lg:gap-3"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#d7f0d1] text-[#1c8f53] backdrop-blur-sm dark:border dark:border-white/10 dark:bg-black/20 dark:text-brand-300 lg:h-10 lg:w-10 lg:rounded-xl">
                  <Icon className="h-3.5 w-3.5 lg:h-4.5 lg:w-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 dark:text-white lg:text-sm">{title}</p>
                  <p className="text-[10px] leading-snug text-gray-700 dark:text-white/70 lg:text-xs">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="glass-chip w-fit animate-fade-in-up [@media(max-height:700px)]:hidden rounded-full px-4 py-1.5 text-xs font-medium italic text-gray-800 dark:text-white/80 [animation-delay:200ms] lg:text-sm">
          Smarter Students. Better Tomorrow.
        </p>
      </div>
    </div>
  );
}
