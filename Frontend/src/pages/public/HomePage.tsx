import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Users } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { ScreenshotSlideshow } from '@/components/common';
import { HeroVisual } from '@/components/home/HeroVisual';
import { FeatureGrid } from '@/components/home/FeatureGrid';

export function HomePage() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 pb-10 pt-6 sm:px-6 lg:pt-10">
      <section className="grid items-center gap-8 md:grid-cols-[1.05fr_1fr] md:gap-10">
        <div className="pt-4 md:pt-8">
          <span className="inline-flex animate-fade-in-up items-center gap-1.5 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#1d3d2d] shadow-sm">
            <span className="text-[#1f7a43]">Smart money,</span>
            <span className="text-[#1d3d2d]">Brighter Future</span>
          </span>

          <h1 className="mt-5 max-w-[560px] animate-fade-in-up text-[3.1rem] font-bold leading-[0.95] tracking-[-0.06em] text-[#1d3d2d] [animation-delay:100ms] sm:text-[4.2rem] lg:text-[5.2rem]">
            Take control of <br />
            your money on <br />
            <span className="text-[#1a8f57]">campus</span>
          </h1>

          <p className="mt-5 max-w-[440px] animate-fade-in-up text-base leading-relaxed text-gray-600 [animation-delay:150ms] sm:text-lg">
            Campus Coin makes it easy to track spending, stick to a budget, and understand where
            your money goes — all in one place built for students.
          </p>

          <div className="mt-8 flex animate-fade-in-up flex-wrap gap-4 [animation-delay:200ms]">
            <Link
              to={PUBLIC_ROUTES.register}
              className="group inline-flex items-center gap-2 rounded-xl bg-[#1c8f53] px-7 py-4 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#177e48] hover:shadow-lg hover:shadow-[#1c8f53]/20 active:translate-y-0"
            >
              Get Started Free
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link
              to={PUBLIC_ROUTES.features}
              className="rounded-xl bg-[#f6f4ee] px-7 py-4 text-base font-semibold text-[#1d3d2d] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:translate-y-0"
            >
              See How It Works
            </Link>
          </div>

          <div className="mt-8 flex animate-fade-in-up items-center gap-3 [animation-delay:250ms]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d7f0d1] text-[#1c8f53]">
              <Users className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#1d3d2d]">Built for students</p>
              <p className="text-xs text-gray-500">Simple tools for everyday campus finances</p>
            </div>
          </div>
        </div>

        <HeroVisual />
      </section>

      <section className="mx-auto mt-4 max-w-[1280px] sm:mt-8">
        <FeatureGrid />
      </section>

      <section className="mx-auto mt-14 max-w-[1280px]">
        <div className="text-center">
          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-[#1a8f57]">
            <Sparkles className="h-3.5 w-3.5" />
            See it in action
          </p>
          <h2 className="mt-2 text-2xl font-bold text-[#1d3d2d] sm:text-3xl">A real look at the app</h2>
        </div>
        <div className="mt-6">
          <ScreenshotSlideshow />
        </div>
      </section>
    </div>
  );
}
