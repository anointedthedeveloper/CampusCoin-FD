import { useEffect, useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowRight, Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import { Button, GoogleButton, Input } from '@/components/common';
import { AuthPageHeader } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';
import { ADMIN_ROUTES, PUBLIC_ROUTES, STUDENT_ROUTES } from '@/constants/routes';
import { isValidEmail } from '@/utils/validation';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';
import type { AuthPageOutletContext } from './authOutletContext';
import { LOGOUT_REASON_STORAGE_KEY } from '@/api/httpClient';

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { compact } = useOutletContext<AuthPageOutletContext>();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const redirectFrom = (location.state as { from?: Location })?.from?.pathname;
  // Why the previous session ended (e.g. the account was suspended). Read
  // once, then cleared in an effect so it isn't shown again next time.
  const [logoutReason] = useState(() => {
    try {
      return sessionStorage.getItem(LOGOUT_REASON_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.removeItem(LOGOUT_REASON_STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);
  const notice = (location.state as { notice?: string } | null)?.notice;

  async function handleGoogleLogin(idToken: string) {
    setError(null);
    setIsGoogleLoading(true);
    try {
      const loggedInUser = await loginWithGoogle(idToken);
      if (loggedInUser.role === 'admin') {
        navigate(redirectFrom ?? ADMIN_ROUTES.dashboard, { replace: true });
        return;
      }
      const onboardingStatus = loggedInUser.onboarding?.status ?? 'not_started';
      const needsOnboarding = onboardingStatus === 'not_started' || onboardingStatus === 'in_progress';
      navigate(redirectFrom ?? (needsOnboarding ? STUDENT_ROUTES.onboarding : STUDENT_ROUTES.dashboard), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return; }
    if (!password.length)     { setError('Enter your password.');        return; }

    setIsSubmitting(true);
    try {
      const loggedInUser = await login({ email, password });
      if (loggedInUser.role === 'admin') {
        navigate(redirectFrom ?? ADMIN_ROUTES.dashboard, { replace: true });
        return;
      }
      const onboardingStatus = loggedInUser.onboarding?.status ?? 'not_started';
      const needsOnboarding = onboardingStatus === 'not_started' || onboardingStatus === 'in_progress';
      navigate(redirectFrom ?? (needsOnboarding ? STUDENT_ROUTES.onboarding : STUDENT_ROUTES.dashboard), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <AuthPageHeader
        icon={LogIn}
        title="Welcome back"
        subtitle="Sign in to continue to Campus Coin."
        compact={compact}
      />

      {/* Google first — research shows social login gets more clicks at the top */}
      <GoogleButton
        onCredential={(idToken) => void handleGoogleLogin(idToken)}
        isLoading={isGoogleLoading}
        label="Continue with Google"
      />

      <div className={cn('flex items-center gap-3', compact ? 'my-3' : 'my-5')}>
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-text-muted">
          or sign in with email
        </span>
        <div className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
      </div>

      <form onSubmit={handleSubmit} className={cn('flex flex-col', compact ? 'gap-3' : 'gap-4')}>
        <Input
          compact={compact}
          label="Email address"
          type="email"
          name="email"
          placeholder="you@example.com"
          icon={<Mail className="h-4 w-4" />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <div>
          <Input
            compact={compact}
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="••••••••"
            icon={<Lock className="h-4 w-4" />}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:text-text-muted dark:hover:text-text-secondary"
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
          <div className="mt-1.5 flex justify-end">
            <Link
              to={PUBLIC_ROUTES.forgotPassword}
              className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-primary-accent dark:hover:text-primary"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        {logoutReason && !error && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300" role="alert">
            {logoutReason}
          </div>
        )}

        {notice && !error && (
          <div className="rounded-lg border border-brand-200 bg-brand-50 px-3.5 py-3 text-sm text-brand-800 dark:border-primary/30 dark:bg-primary/10 dark:text-primary-accent" role="status">
            {notice}
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 dark:border-red-500/30 dark:bg-red-950/30">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 11.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size={compact ? 'md' : 'lg'}
          className="w-full"
          isLoading={isSubmitting}
          loadingText="Signing in…"
        >
          Sign In
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className={cn('text-center text-sm text-gray-500 dark:text-text-secondary', compact ? 'mt-4' : 'mt-6')}>
        Don&apos;t have an account?{' '}
        <Link
          to={PUBLIC_ROUTES.register}
          className="font-bold text-brand-600 hover:text-brand-700 dark:text-primary-accent dark:hover:text-primary"
        >
          Create one free →
        </Link>
      </p>
    </div>
  );
}
