import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Lightbulb, PiggyBank, Sparkles, Utensils, type LucideIcon } from 'lucide-react';
import { Card, EmptyState, Spinner } from '@/components/common';
import { tipsService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { STUDENT_ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';
import type { SavingTip } from '@/types/insight';

const categoryStyle: Record<string, { icon: LucideIcon; badgeClassName: string }> = {
  Food: { icon: Utensils, badgeClassName: 'bg-red-100 text-red-600' },
  Transport: { icon: Sparkles, badgeClassName: 'bg-blue-100 text-blue-600' },
  Savings: { icon: PiggyBank, badgeClassName: 'bg-brand-100 text-brand-700' },
  Subscriptions: { icon: Bookmark, badgeClassName: 'bg-teal-100 text-teal-600' },
};

const fallbackStyle = { icon: Lightbulb, badgeClassName: 'bg-gray-100 text-gray-600' };

export function BookmarksPage() {
  const { user } = useAuth();
  const [bookmarkedTips, setBookmarkedTips] = useState<SavingTip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!user) return;
    void tipsService.listBookmarked(user.id).then((tips) => { setBookmarkedTips(tips); setIsLoading(false); });
  }, [user, refreshToken]);

  async function handleRemove(ruleId: string) {
    if (!user) return;
    await tipsService.toggleBookmark(user.id, ruleId);
    setRefreshToken((t) => t + 1);
  }

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bookmarks</h1>
        <p className="mt-1 text-sm text-gray-500">Saving tips you&apos;ve starred for later.</p>
      </div>

      {bookmarkedTips.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Tap the bookmark icon on any saving tip to save it here."
          action={
            <Link to={STUDENT_ROUTES.savingTips} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Browse saving tips
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {bookmarkedTips.map((tip) => {
            const style = (tip.category && categoryStyle[tip.category]) || fallbackStyle;
            const Icon = style.icon;
            return (
              <Card
                key={tip.id}
                className="flex items-start gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', style.badgeClassName)}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900">{tip.title}</p>
                  <p className="mt-1 text-sm text-gray-600">{tip.body}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(tip.id)}
                  className="shrink-0 rounded-lg p-1.5 text-brand-600 transition-colors duration-200 hover:bg-brand-50"
                  aria-label="Remove bookmark"
                >
                  <Bookmark className="h-4 w-4 fill-current" />
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
