import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import { assets } from '@/assets/images';

interface Slide {
  src: string;
  alt: string;
  title: string;
  description: string;
}

const slides: Slide[] = [
  {
    src: assets.screenshots.dashboard,
    alt: 'Campus Coin dashboard with balance, spending breakdown, and recent transactions',
    title: 'One dashboard, the full picture',
    description: 'Balance, budgets, and spending breakdown at a glance the moment you log in.',
  },
  {
    src: assets.screenshots.budgets,
    alt: 'Campus Coin budgets page with category limits and progress bars',
    title: 'Budgets that track themselves',
    description: 'Set a limit per category and watch the progress bar update as you spend.',
  },
  {
    src: assets.screenshots.reports,
    alt: 'Campus Coin reports page with income vs expense trend chart',
    title: 'Reports that actually explain something',
    description: 'See the trend between what came in and what went out, month over month.',
  },
  {
    src: assets.screenshots.aiAssistant,
    alt: 'Campus Coin AI assistant page with saving tips and chat',
    title: 'Saving tips from your own habits',
    description: 'Plain-language suggestions generated from your transactions, not a generic template.',
  },
];

export function ScreenshotSlideshow() {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActive((current) => (current + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused]);

  function goTo(index: number) {
    setActive((index + slides.length) % slides.length);
  }

  return (
    <div
      className="relative overflow-hidden rounded-[28px] bg-[#f6f4ee] p-3 shadow-sm dark:bg-surface-elevated dark:shadow-black/20 sm:p-4"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-white sm:aspect-[16/9]">
        {slides.map((slide, index) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={slide.alt}
            className={cn(
              'absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ease-in-out',
              index === active ? 'opacity-100' : 'opacity-0',
            )}
          />
        ))}

        <button
          type="button"
          onClick={() => goTo(active - 1)}
          aria-label="Previous screenshot"
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#1d3d2d] shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:bg-surface/90 dark:text-text-primary dark:hover:bg-surface"
        >
          <ChevronLeft className="h-4.5 w-4.5" />
        </button>
        <button
          type="button"
          onClick={() => goTo(active + 1)}
          aria-label="Next screenshot"
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-[#1d3d2d] shadow-sm transition-all duration-200 hover:bg-white hover:shadow-md dark:bg-surface/90 dark:text-text-primary dark:hover:bg-surface"
        >
          <ChevronRight className="h-4.5 w-4.5" />
        </button>
      </div>

      <div className="flex flex-col gap-3 px-2 pb-1 pt-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-semibold text-[#1d3d2d] dark:text-text-primary">{slides[active].title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-text-secondary">{slides[active].description}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.src}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Show ${slide.title}`}
              aria-current={index === active}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                index === active
                  ? 'w-6 bg-[#1c8f53] dark:bg-[var(--primary-accent)]'
                  : 'w-2 bg-[#1c8f53]/25 hover:bg-[#1c8f53]/40 dark:bg-[var(--primary-accent)]/25 dark:hover:bg-[var(--primary-accent)]/45',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
