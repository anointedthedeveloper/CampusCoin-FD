import { Link } from 'react-router-dom';
import { PUBLIC_ROUTES } from '@/constants/routes';

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 bg-background text-center">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-text-primary">404</h1>
      <p className="text-gray-500 dark:text-text-secondary">The page you're looking for doesn't exist.</p>
      <Link to={PUBLIC_ROUTES.home} className="text-sm font-medium text-brand-600 hover:underline dark:text-[var(--primary-accent)]">
        Back to home
      </Link>
    </div>
  );
}
