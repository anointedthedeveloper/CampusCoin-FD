// Route guard for pages that need a signed-in user.

import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { PageLoader } from '@/components/common';

/**
 * Shows a loader while the session is restored, sends signed-out visitors to
 * /login (remembering where they were going), and makes Google-only accounts
 * set a password first.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuth();
  // Pass a parent layout's context (e.g. AuthLayout's compact flag) through.
  const parentContext = useOutletContext();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to={PUBLIC_ROUTES.login} state={{ from: location }} replace />;
  }

  // Accounts created with Google choose a password before anything else.
  if (user?.hasPassword === false && location.pathname !== PUBLIC_ROUTES.setPassword) {
    return <Navigate to={PUBLIC_ROUTES.setPassword} replace />;
  }

  return <Outlet context={parentContext} />;
}
