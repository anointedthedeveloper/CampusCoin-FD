import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, GraduationCap, Mail, Receipt, Users } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState, Spinner } from '@/components/common';
import { ADMIN_ROUTES } from '@/constants/routes';
import { adminUserService } from '@/services';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { AdminUserSummary } from '@/types/admin';

export function AdminUserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<AdminUserSummary | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setIsLoading(true);
      const data = await adminUserService.getUserById(id!);
      setUser(data);
      setIsLoading(false);
    }
    void load();
  }, [id, refreshToken]);

  if (isLoading) return <div className="flex justify-center py-20"><Spinner /></div>;

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

  async function toggleActive() {
    if (!user) return;
    await adminUserService.setActive(user.id, !user.isActive);
    setRefreshToken((t) => t + 1);
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
        <div className="mt-3 divide-y divide-gray-100">
            <p className="py-3 text-sm text-gray-500">No transactions on record for this user.</p>
          </div>
      </Card>
    </div>
  );
}
