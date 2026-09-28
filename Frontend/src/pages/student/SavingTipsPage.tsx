import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Lightbulb, PiggyBank, Sparkles, Utensils, X, type LucideIcon } from 'lucide-react';
import { Card, EmptyState, PageSpinner } from '@/components/common';
import { tipsService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import { STUDENT_ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';
import type { SavingTip } from '@/types/insight';

const categoryStyle: Record<string, { icon: LucideIcon; cls: string }> = {
  'Food & Drinks': { icon: Utensils,  cls: 'bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400' },
  Food:            { icon: Utensils,  cls: 'bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400' },
  Transport:       { icon: Sparkles,  cls: 'bg-blue-100   text-blue-600   dark:bg-blue-400/15   dark:text-blue-400' },
  Savings:         { icon: PiggyBank, cls: 'bg-teal-100   text-teal-600   dark:bg-teal-400/15   dark:text-teal-400' },
  Education:       { icon: Bookmark,  cls: 'bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400' },
  General:         { icon: Lightbulb, cls: 'bg-amber-100  text-amber-600  dark:bg-amber-400/15  dark:text-amber-400' },
};

const fallback = { icon: Lightbulb, cls: 'bg-gray-100 text-gray-500 dark:bg-white/[0.08] dark:text-text-secondary' };

export function SavingTipsPage() {
  const { user }                     = useAuth();
  const [tips, setTips]              = useState<SavingTip[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [dismissedCount, setDismissedCount] = useState(0);
  const currency = user?.settings?.currency ?? 'NGN';
  const [isLoading, setIsLoading]    = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      try {
        const result = await tipsService.listWithMeta();
        if (cancelled) return;
        setTips(result.tips);
        setDismissedCount(result.dismissedCount);
        setBookmarkedIds(new Set(result.tips.filter((t) => t.isPinned).map((t) => t.id)));
      } catch {
        if (!cancelled) setTips([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [user, refreshToken]);

  async function handleDismiss(id: string) {
    if (!user) return;
    setTips((prev) => prev.filter((t) => t.id !== id));
    setDismissedCount((n) => n + 1);
    await tipsService.dismiss(user.id, id).catch(() => undefined);
    setRefreshToken((t) => t + 1);
  }

  async function handleToggleBookmark(id: string) {
    if (!user) return;
    const wasPinned = bookmarkedIds.has(id);
    setBookmarkedIds((prev) => {
      const next = new Set(prev);
      if (wasPinned) next.delete(id); else next.add(id);
      return next;
    });
    await tipsService.toggleBookmark(user.id, id, wasPinned).catch(() => setRefreshToken((t) => t + 1));
  }

  async function handleRestore() {
    await tipsService.restoreDismissed().catch(() => undefined);
    setRefreshToken((t) => t + 1);
  }

  const showLoader = useMinLoadTime(isLoading);
  if (showLoader) return <PageSpinner label="Loading saving tips…" />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Saving Tips</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
            Personalised tips from your own spending, ranked by how much they could save — plus general advice.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        {dismissedCount > 0 && (
          <button
            type="button"
            onClick={() => void handleRestore()}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-text-secondary dark:hover:bg-white/5"
          >
            Restore {dismissedCount} dismissed
          </button>
        )}
        <Link
          to={STUDENT_ROUTES.bookmarks}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-btn transition-all hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-px dark:border-white/10 dark:bg-surface dark:text-text-primary dark:hover:bg-white/5"
        >
          <Bookmark className="h-4 w-4" /> Pinned tips
        </Link>
        </div>
      </div>

      {tips.length === 0 ? (
        <Card>
          <EmptyState
            icon={Sparkles}
            title="No tips right now"
            description="Nothing stands out in your spending this month — check back as you log more transactions, or you might just be doing great!"
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {tips.map((tip) => {
            const style       = (tip.category && categoryStyle[tip.category]) || fallback;
            const Icon        = style.icon;
            const isBookmarked = bookmarkedIds.has(tip.id);

            return (
              <Card
                key={tip.id}
                className="group flex flex-col gap-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
              >
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', style.cls)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-1.5">
                      {tip.kind === 'personal' ? (
                        <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700 dark:bg-primary/15 dark:text-primary-accent">For you</span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:bg-white/[0.08] dark:text-text-muted">General</span>
                      )}
                      {(tip.impact ?? 0) > 0 && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                          Could save ~{currency} {Math.round(tip.impact!).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-text-primary leading-snug">{tip.title}</p>
                    <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary leading-relaxed">{tip.body}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex shrink-0 flex-col gap-1 transition-opacity sm:opacity-60 sm:group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => void handleToggleBookmark(tip.id)}
                      className={cn(
                        'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                        isBookmarked
                          ? 'bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-text-muted dark:hover:bg-white/[0.08] dark:hover:text-text-secondary',
                      )}
                      aria-label={isBookmarked ? 'Unpin this tip' : 'Pin this tip'}
                      aria-pressed={isBookmarked}
                    >
                      <Bookmark className={cn('h-3.5 w-3.5', isBookmarked && 'fill-current')} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(tip.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 dark:text-text-muted hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      aria-label="Dismiss this tip"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Footer link */}
                {tip.category && tip.category !== 'General' && (
                  <Link
                    to={STUDENT_ROUTES.reports}
                    className="self-start rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:bg-white/[0.08] dark:text-text-secondary dark:hover:bg-primary/10 dark:hover:text-primary-accent"
                  >
                    View {tip.category} in Reports →
                  </Link>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
