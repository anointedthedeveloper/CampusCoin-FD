import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, GraduationCap, Mail, Receipt, Users } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState } from '@/components/common';
import { ADMIN_ROUTES } from '@/constants/routes';
import { adminUserService, categoryService } from '@/services';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [refreshToken, setRefreshToken] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const user = useMemo(() => (id ? adminUserService.getUserById(id) : undefined), [id, refreshToken]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recentTransactions = useMemo(() => (id ? adminUserService.getRecentTransactions(id, 5) : []), [id, refreshToken]);

  if (!user) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={Users}
          title="User not found"
          action={
            <Link to={ADMIN_ROUTES.users} className="text-sm font-semibold text-brand-600 hover:text-brand-700">
              Back to users
            </Link>
          }
        />
      </div>
    );
  }

  function toggleActive() {
    if (!user) return;
    adminUserService.setActive(user.id, !user.isActive);
    setRefreshToken((token) => token + 1);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to={ADMIN_ROUTES.users} className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar name={user.fullName} size="lg" />
            <div>
              <p className="text-lg font-bold text-gray-900">{user.fullName}</p>
              <Badge tone={user.isActive ? 'success' : 'neutral'} className="mt-1">
                {user.isActive ? 'Active' : 'Suspended'}
              </Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={toggleActive}
            className={cn(
              'rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-200',
              user.isActive ? 'border border-red-300 text-red-600 hover:bg-red-50' : 'bg-brand-600 text-white hover:bg-brand-700',
            )}
          >
            {user.isActive ? 'Suspend User' : 'Activate User'}
          </button>
        </div>

        <div className="mt-6 space-y-3 border-t border-gray-100 pt-5">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="text-gray-500">Email</span>
            <span className="ml-auto font-medium text-gray-900">{user.email}</span>
          </div>
          {user.school && (
            <div className="flex items-center gap-3 text-sm">
              <GraduationCap className="h-4 w-4 shrink-0 text-gray-400" />
              <span className="text-gray-500">School</span>
              <span className="ml-auto font-medium text-gray-900">{user.school}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <Calendar className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="text-gray-500">Joined</span>
            <span className="ml-auto font-medium text-gray-900">{formatDate(user.createdAt)}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Receipt className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="text-gray-500">Transactions</span>
            <span className="ml-auto font-medium text-gray-900">{user.transactionCount}</span>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900">Recent Transactions</h2>
        {recentTransactions.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No transactions on record for this user.</p>
        ) : (
          <div className="mt-3 divide-y divide-gray-100">
            {recentTransactions.map((txn) => {
              const categoryName = categoryService.getById(user.id, txn.categoryId)?.name ?? 'Other';
              return (
                <div key={txn.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{txn.description || categoryName}</p>
                    <p className="text-xs text-gray-500">{formatDate(txn.occurredAt)}</p>
                  </div>
                  <span className={cn('text-sm font-semibold', txn.type === 'income' ? 'text-brand-600' : 'text-gray-900')}>
                    {txn.type === 'income' ? '+' : '-'}
                    {formatCurrency(txn.amount, DEFAULT_CURRENCY)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
