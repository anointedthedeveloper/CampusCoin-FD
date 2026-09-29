import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { PlayCircle, X } from 'lucide-react';
import { quickGuideVideo } from '@/assets';
import { cn } from '@/utils/cn';

const OPEN_EVENT = 'campus-coin:open-quick-guide';
// Remembered permanently: once the visitor has opened the guide or closed the
// pill, the floating prompt never comes back (the inline buttons still work).
const SEEN_KEY = 'campus-coin.quickGuideSeen';

/** Opens the quick-guide video modal from anywhere on the page. */
// eslint-disable-next-line react-refresh/only-export-components
export function openQuickGuide() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/** Inline "Watch the quick guide" button for hero sections. */
export function WatchGuideButton({ className, label = 'Watch the quick guide' }: { className?: string; label?: string }) {
  return (
    <button
      type="button"
      onClick={openQuickGuide}
      className={cn(
        'group inline-flex items-center gap-2 text-sm font-semibold text-[#1c8f53] transition-colors hover:text-[#177e48] dark:text-primary-accent',
        className,
      )}
    >
      <PlayCircle className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
      {label}
    </button>
  );
}

/**
 * A floating "Watch quick guide" pill that slides in once the visitor has
 * scrolled a little, plus the video modal it (and WatchGuideButton) opens.
 * The video is only mounted while the modal is open, so it never
 * loads — or keeps playing — in the background.
 */
export function QuickGuideVideo({ scrollThreshold = 320 }: { scrollThreshold?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [isPillDismissed, setIsPillDismissed] = useState(() => {
    try {
      return localStorage.getItem(SEEN_KEY) === '1';
    } catch {
      return false;
    }
  });
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setHasScrolled(window.scrollY > scrollThreshold);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [scrollThreshold]);

  useEffect(() => {
    const open = () => {
      setIsOpen(true);
      dismissPill();
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function dismissPill() {
    setIsPillDismissed(true);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      // ignore
    }
  }

  const showPill = hasScrolled && !isPillDismissed && !isOpen;

  return (
    <>
      <div
        className={cn(
          'fixed bottom-5 left-4 z-40 flex items-center gap-1 rounded-full py-1.5 pl-1.5 pr-2 transition-all duration-500 sm:left-6',
          'glass-panel',
          showPill ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0',
        )}
        aria-hidden={!showPill}
      >
        <button
          type="button"
          onClick={() => { setIsOpen(true); dismissPill(); }}
          tabIndex={showPill ? 0 : -1}
          className="group flex items-center gap-2.5 rounded-full py-1 pl-1 pr-2 text-sm font-semibold text-[#1d3d2d] dark:text-text-primary"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[#1c8f53] text-white dark:bg-primary">
            <span className="absolute inset-0 animate-ping rounded-full bg-[#1c8f53]/40 dark:bg-primary/40" aria-hidden="true" />
            <PlayCircle className="relative h-5 w-5" />
          </span>
          Watch quick guide
        </button>
        <button
          type="button"
          onClick={dismissPill}
          tabIndex={showPill ? 0 : -1}
          aria-label="Hide quick guide button"
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-500 hover:bg-black/5 hover:text-gray-800 dark:text-text-muted dark:hover:bg-white/10 dark:hover:text-text-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Campus Coin quick guide video"
            onClick={() => setIsOpen(false)}
          >
            <div className="glass-panel w-full max-w-4xl overflow-hidden rounded-2xl" onClick={(event) => event.stopPropagation()}>
              <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-text-primary">Campus Coin quick guide</p>
                  <p className="text-xs text-gray-600 dark:text-text-secondary">A short walkthrough of the app. Press play to start.</p>
                </div>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close video"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-gray-600 hover:bg-black/5 hover:text-gray-900 dark:text-text-secondary dark:hover:bg-white/10 dark:hover:text-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex w-full items-center justify-center overflow-hidden bg-black">
                <video
                  src={quickGuideVideo}
                  title="Campus Coin quick guide"
                  aria-label="Campus Coin quick guide"
                  controls
                  playsInline
                  preload="metadata"
                  className="block max-h-[calc(100dvh-9rem)] w-full object-contain"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
