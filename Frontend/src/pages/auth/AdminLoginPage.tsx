import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { AuthPageHeader } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_ROUTES } from '@/constants/routes';
import { isValidEmail } from '@/utils/validation';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';
import type { AuthPageOutletContext } from './authOutletContext';

export function AdminLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { compact } = useOutletContext<AuthPageOutletContext>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 1) {
      setError('Enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login({ email, password });
      if (loggedInUser.role !== 'admin') {
        setError('Access denied. Admins only.');
        return;
      }
      navigate(ADMIN_ROUTES.dashboard, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <AuthPageHeader icon={LogIn} title="Admin Access" subtitle="Sign in to the CampusCoin admin console." compact={compact} />

      <form onSubmit={handleSubmit} className={cn(compact ? 'mt-3 space-y-2' : 'mt-6 space-y-4')}>
        <Input
          compact={compact}
          label="Email Address"
          type="email"
          name="email"
          placeholder="admin@example.com"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <Input
          compact={compact}
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          placeholder="Enter your password"
          icon={<Lock className="h-4 w-4" />}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-gray-400 hover:text-gray-600 dark:text-text-muted dark:hover:text-text-secondary"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting} loadingText="Signing in…">
          Sign In
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className={cn('text-center text-sm text-gray-500 dark:text-text-secondary', compact ? 'mt-2.5' : 'mt-6')}>
        Not an admin?{' '}
        <Link
          to="/login"
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-primary-accent dark:hover:text-primary"
        >
          Student Login
        </Link>
      </p>
    </div>
  );
}
