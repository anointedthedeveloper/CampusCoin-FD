import { useState, type FormEvent } from 'react';
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

export function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { compact } = useOutletContext<AuthPageOutletContext>();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Where to land after login: wherever the user was headed before being
  // sent here (e.g. a protected link they followed while logged out), or
  // each role's own home otherwise. Admins never default into the student
  // dashboard — the admin console is a separate destination.
  const redirectFrom = (location.state as { from?: Location })?.from?.pathname;

  async function handleGoogleLogin() {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate(redirectFrom ?? STUDENT_ROUTES.dashboard, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  }

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
      const roleHome = loggedInUser.role === 'admin' ? ADMIN_ROUTES.dashboard : STUDENT_ROUTES.dashboard;
      navigate(redirectFrom ?? roleHome, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <AuthPageHeader icon={LogIn} title="Welcome Back" subtitle="Sign in to your Campus Coin account." compact={compact} />

      <form onSubmit={handleSubmit} className={cn(compact ? 'mt-3 space-y-2' : 'mt-6 space-y-4')}>
        <Input
          compact={compact}
          label="Email Address"
          type="email"
          name="email"
          placeholder="you@example.com"
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
              className="text-gray-400 hover:text-gray-600"
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

        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Remember me
          </label>
          <Link to={PUBLIC_ROUTES.forgotPassword} className="font-medium text-brand-600 hover:text-brand-700">
            Forgot password?
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting} loadingText="Signing in…">
          Sign In
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <div className={cn('flex items-center gap-3', compact ? 'my-2.5' : 'my-6')}>
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">OR</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <GoogleButton onClick={() => void handleGoogleLogin()} isLoading={isGoogleLoading} />

      <p className={cn('text-center text-sm text-gray-600', compact ? 'mt-2.5' : 'mt-6')}>
        Don&apos;t have an account?{' '}
        <Link to={PUBLIC_ROUTES.register} className="font-semibold text-brand-600 hover:text-brand-700">
          Create Account
        </Link>
      </p>
    </div>
  );
}
