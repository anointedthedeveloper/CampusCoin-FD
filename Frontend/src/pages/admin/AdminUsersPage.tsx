import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Users } from 'lucide-react';
import { Avatar, Badge, Card, EmptyState } from '@/components/common';
import { ADMIN_ROUTES, buildPath } from '@/constants/routes';
import { adminUserService } from '@/services';
import { formatDate } from '@/utils/format';

export function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const users = useMemo(() => adminUserService.listUsers(), [refreshToken]);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const query = search.trim().toLowerCase();
    return users.filter(
      (user) => user.fullName.toLowerCase().includes(query) || user.email.toLowerCase().includes(query),
    );
  }, [users, search]);

  function toggleActive(id: string, isActive: boolean) {
    adminUserService.setActive(id, !isActive);
    setRefreshToken((token) => token + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">{users.length} registered students.</p>
      </div>

      <Card className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </Card>

      <Card className="p-0">
        {filtered.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={Users}
              title={users.length === 0 ? 'No students registered yet' : 'No users found'}
              description={users.length === 0 ? 'Registered students will appear here.' : 'Try a different search.'}
            />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Link to={buildPath(ADMIN_ROUTES.userDetail, { id: user.id })} className="flex flex-1 items-center gap-3 min-w-0">
                  <Avatar name={user.fullName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{user.fullName}</p>
                    <p className="truncate text-xs text-gray-500">{user.email}</p>
                  </div>
                </Link>
                <span className="hidden text-xs text-gray-500 sm:block">{user.transactionCount} transactions</span>
                <span className="hidden text-xs text-gray-400 sm:block">Joined {formatDate(user.createdAt)}</span>
                <Badge tone={user.isActive ? 'success' : 'neutral'}>{user.isActive ? 'Active' : 'Suspended'}</Badge>
                <button
                  type="button"
                  onClick={() => toggleActive(user.id, user.isActive)}
                  className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors duration-200 hover:bg-gray-50"
                >
                  {user.isActive ? 'Suspend' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
