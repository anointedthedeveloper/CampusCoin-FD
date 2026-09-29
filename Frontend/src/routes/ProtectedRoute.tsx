import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { PageLoader } from '@/components/common';

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
