import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Lightbulb, PiggyBank, Sparkles, Utensils, X, type LucideIcon } from 'lucide-react';
import { Card, EmptyState } from '@/components/common';
import { tipsService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { STUDENT_ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

const categoryStyle: Record<string, { icon: LucideIcon; badgeClassName: string }> = {
  Food: { icon: Utensils, badgeClassName: 'bg-red-100 text-red-600' },
  Transport: { icon: Sparkles, badgeClassName: 'bg-blue-100 text-blue-600' },
  Savings: { icon: PiggyBank, badgeClassName: 'bg-brand-100 text-brand-700' },
  Subscriptions: { icon: Bookmark, badgeClassName: 'bg-teal-100 text-teal-600' },
};

const fallbackStyle = { icon: Lightbulb, badgeClassName: 'bg-gray-100 text-gray-600' };

export function SavingTipsPage() {
  const { user } = useAuth();
  const [refreshToken, setRefreshToken] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tips = useMemo(() => (user ? tipsService.list(user.id) : []), [user, refreshToken]);

  function handleDismiss(ruleId: string) {
    if (!user) return;
    tipsService.dismiss(user.id, ruleId);
    setRefreshToken((token) => token + 1);
  }

  function handleToggleBookmark(ruleId: string) {
    if (!user) return;
    tipsService.toggleBookmark(user.id, ruleId);
    setRefreshToken((token) => token + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saving Tips</h1>
          <p className="mt-1 text-sm text-gray-500">Personalized tips based on your actual spending this month.</p>
        </div>
        <Link
          to={STUDENT_ROUTES.bookmarks}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          <Bookmark className="h-4 w-4" />
          View Bookmarks
        </Link>
      </div>

      {tips.length === 0 ? (
        <Card className="p-10">
          <EmptyState
            icon={Sparkles}
            title="No tips right now"
            description="Nothing stands out in your spending this month — check back as you log more transactions, or you might just be doing great."
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tips.map((tip) => {
            const style = (tip.category && categoryStyle[tip.category]) || fallbackStyle;
            const Icon = style.icon;
            const bookmarked = user ? tipsService.isBookmarked(user.id, tip.id) : false;
            return (
              <Card
                key={tip.id}
                className="flex flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', style.badgeClassName)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900">{tip.title}</p>
                    <p className="mt-1 text-sm text-gray-600">{tip.body}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleBookmark(tip.id)}
                      className={cn(
                        'rounded-lg p-1.5 transition-colors duration-200',
                        bookmarked ? 'text-brand-600 hover:bg-brand-50' : 'text-gray-300 hover:bg-gray-100 hover:text-gray-500',
                      )}
                      aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this tip'}
                      aria-pressed={bookmarked}
                    >
                      <Bookmark className={cn('h-4 w-4', bookmarked && 'fill-current')} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(tip.id)}
                      className="rounded-lg p-1.5 text-gray-300 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                      aria-label="Dismiss this tip"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {tip.category && (
                  <Link
                    to={STUDENT_ROUTES.reports}
                    className="self-start rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-brand-700"
                  >
                    View {tip.category} in Reports
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
