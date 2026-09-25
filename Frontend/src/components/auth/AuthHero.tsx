import { Link } from 'react-router-dom';
import { ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { APP_TAGLINE } from '@/constants/config';
import { Logo } from '@/components/common';
import { useMediaQuery } from '@/hooks/useMinHeight';

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
    title: 'Easy Transactions',
    body: 'Send, receive and manage your money with ease.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure & Reliable',
    body: 'Your data and funds are protected with modern security.',
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
        src="/auth-hero.webp"
        alt=""
        className="absolute inset-0 h-full w-full animate-slow-zoom object-cover object-center"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-brand-950/90 via-brand-950/70 to-brand-950/95"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 hidden bg-gradient-to-r from-brand-950/40 via-transparent to-transparent lg:block"
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
        <Link to={PUBLIC_ROUTES.home} className="relative flex min-w-0 items-center gap-3 px-4">
          <Logo iconClassName="h-9 w-9" showWordmark={false} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">Campus Coin</p>
            <p className="truncate text-xs text-white/70">Smart Finance for a Brighter Campus Life</p>
          </div>
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <HeroBackground />

      <div className="relative flex h-full flex-col justify-between gap-3 p-6 sm:p-8 lg:gap-0 lg:p-10 xl:p-14">
        <Link to={PUBLIC_ROUTES.home} className="animate-fade-in-up">
          <Logo iconClassName="h-9 w-9 lg:h-11 lg:w-11" wordmarkClassName="text-base text-white lg:text-lg" showTagline={false} />
          <span className="-mt-1 ml-[2.75rem] block text-[11px] font-medium text-white/60 lg:ml-[3.25rem] lg:text-xs">
            {APP_TAGLINE}
          </span>
        </Link>

        <div className="animate-fade-in-up [animation-delay:100ms]">
          <h1 className="max-w-md text-2xl font-bold leading-[1.15] tracking-tight text-white sm:text-3xl lg:text-4xl lg:leading-[1.1] xl:text-5xl">
            Smart Finance
            <br />
            for a <span className="text-brand-400">Brighter</span>
            <br />
            Campus Life
          </h1>

          <p className="mt-3 max-w-sm text-xs leading-relaxed text-white/75 sm:text-sm lg:mt-5">
            Manage your money, track your spending, and build better financial habits — all in one place.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:mt-8 lg:grid-cols-1 lg:gap-4">
            {features.map(({ icon: Icon, title, body }, index) => (
              <div
                key={title}
                className="flex animate-float items-start gap-2.5 transition-transform duration-200 hover:translate-x-1 lg:gap-3"
                style={{ animationDelay: `${index * 0.3}s` }}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-brand-300 backdrop-blur-sm lg:h-10 lg:w-10 lg:rounded-xl">
                  <Icon className="h-3.5 w-3.5 lg:h-4.5 lg:w-4.5" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white lg:text-sm">{title}</p>
                  <p className="text-[10px] leading-snug text-white/65 lg:text-xs">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="animate-fade-in-up text-xs font-medium italic text-white/50 [animation-delay:200ms] lg:text-sm">
          Smarter Students. Better Tomorrow.
        </p>
      </div>
    </div>
  );
}
