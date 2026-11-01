// Route guard that limits a section to certain roles (e.g. the admin console).

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_ROUTES, PUBLIC_ROUTES, STUDENT_ROUTES } from '@/constants/routes';
import { PageLoader } from '@/components/common';
import type { UserRole } from '@/types/user';

/**
 * Gates a route subtree to specific roles. Must be nested under
 * ProtectedRoute so `user` is guaranteed once loading finishes.
 */
export function RoleRoute({ allow }: { allow: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user || !allow.includes(user.role)) {
    // Admins hitting a student route go to the admin dashboard.
    // Students hitting an admin route go to the student dashboard.
    // Unauthenticated users go to the appropriate login page.
    if (!user) return <Navigate to={PUBLIC_ROUTES.adminLogin} replace />;
    if (user.role === 'admin') return <Navigate to={ADMIN_ROUTES.dashboard} replace />;
    return <Navigate to={STUDENT_ROUTES.dashboard} replace />;
  }

  return <Outlet />;
}
