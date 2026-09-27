import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Lock, Mail } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { authService } from '@/services';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { isValidEmail, isStrongPassword } from '@/utils/validation';
import { ApiError } from '@/types/api';

// A single page carries the whole flow — request a code, then enter it plus
// a new password — rather than a separate emailed link. A code the user
// types in themselves has no URL to get wrong (stale CLIENT_URL, broken deep
// link, an email client mangling the link) and no click-through step at all.
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'verify'>('request');

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequestCode(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.forgotPassword({ email });
      setStep('verify');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyAndReset(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (!isStrongPassword(password)) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.resetPassword({ email, code, newPassword: password });
      navigate(PUBLIC_ROUTES.login, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === 'verify') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Enter your code</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">
          We sent a 6-digit code to <span className="font-medium text-gray-700 dark:text-text-primary">{email}</span>. It expires in 15 minutes.
        </p>

        <form onSubmit={handleVerifyAndReset} className="mt-6 space-y-4">
          <Input
            label="Verification Code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            name="code"
            placeholder="123456"
            icon={<KeyRound className="h-4 w-4" />}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            required
          />

          <Input
            label="New Password"
            type="password"
            name="password"
            placeholder="Enter a new password"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <Input
            label="Confirm Password"
            type="password"
            name="confirmPassword"
            placeholder="Confirm your new password"
            icon={<Lock className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
            Reset Password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 dark:text-text-secondary">
          Didn&apos;t get a code?{' '}
          <button
            type="button"
            onClick={() => setStep('request')}
            className="font-semibold text-brand-600 hover:text-brand-700 dark:text-primary-accent dark:hover:text-primary"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Forgot Password</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">
        Enter your email and we&apos;ll send you a verification code to reset your password.
      </p>

      <form onSubmit={handleRequestCode} className="mt-6 space-y-4">
        <Input
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

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
          Send Code
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-text-secondary">
        Remembered your password?{' '}
        <Link
          to={PUBLIC_ROUTES.login}
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-primary-accent dark:hover:text-primary"
        >
          Log In
        </Link>
      </p>
    </div>
  );
}
