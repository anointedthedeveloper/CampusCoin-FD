import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface BrowserFrameProps {
  src: string;
  /** Dark-mode counterpart of `src` — when given, the frame swaps to it automatically with the site theme. */
  darkSrc?: string;
  alt: string;
  label?: string;
  className?: string;
  imgClassName?: string;
  loading?: 'lazy' | 'eager';
  footer?: ReactNode;
}

/**
 * Presents an app screenshot inside a soft, rounded browser-chrome card —
 * the shared "product mockup" treatment used across the marketing pages
 * (Home's slideshow, Features' section figures, hero showcases).
 */
export function BrowserFrame({ src, darkSrc, alt, label, className, imgClassName, loading = 'lazy', footer }: BrowserFrameProps) {
  return (
    <div className={cn('rounded-[28px] bg-[#f6f4ee] p-3 shadow-card dark:bg-surface-elevated dark:shadow-dark-card', className)}>
      <div className="flex items-center gap-1.5 px-2 pb-2.5 pt-1">
        <span className="h-2.5 w-2.5 rounded-full bg-[#1d3d2d]/15 dark:bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#1d3d2d]/15 dark:bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#1d3d2d]/15 dark:bg-white/15" />
        {label && (
          <span className="ml-2 truncate rounded-full bg-white/70 px-3 py-0.5 text-[11px] font-medium text-[#1d3d2d]/60 dark:bg-white/5 dark:text-text-muted">
            {label}
          </span>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl bg-white">
        {darkSrc ? (
          <>
            <img src={src} alt={alt} loading={loading} className={cn('block w-full object-cover object-top dark:hidden', imgClassName)} />
            <img src={darkSrc} alt={alt} loading={loading} className={cn('hidden w-full object-cover object-top dark:block', imgClassName)} />
          </>
        ) : (
          <img src={src} alt={alt} loading={loading} className={cn('block w-full object-cover object-top', imgClassName)} />
        )}
      </div>
      {footer}
    </div>
  );
}
