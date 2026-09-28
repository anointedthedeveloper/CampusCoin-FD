import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Lock, Mail } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { authService } from '@/services';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { isValidEmail, isStrongPassword } from '@/utils/validation';
import { ApiError } from '@/types/api';

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  // The reset email links here with ?email=…&code=… so the student can
  // reset straight from the email without retyping the code.
  const [searchParams] = useSearchParams();
  const linkEmail = searchParams.get('email') ?? '';
  const linkCode = searchParams.get('code') ?? '';
  const [step, setStep] = useState<'request' | 'verify'>(linkEmail && /^\d{6}$/.test(linkCode) ? 'verify' : 'request');

  const [email, setEmail]                     = useState(linkEmail);
  const [code, setCode]                       = useState(/^\d{6}$/.test(linkCode) ? linkCode : '');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                     = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting]       = useState(false);

  async function handleRequestCode(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isValidEmail(email)) { setError('Enter a valid email address.'); return; }
    setIsSubmitting(true);
    try {
      await authService.forgotPassword({ email });
      setStep('verify');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the reset code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyAndReset(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code))       { setError('Enter the 6-digit code from your email.'); return; }
    if (!isStrongPassword(password))  { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.');                 return; }

    setIsSubmitting(true);
    try {
      await authService.resetPassword({ email, code, newPassword: password });
      navigate(PUBLIC_ROUTES.login, { replace: true, state: { notice: 'Password reset successful. Sign in with your new password.' } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === 'verify') {
    return (
      <div>
        {/* Success banner */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3.5 dark:border-primary/20 dark:bg-primary/10">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600 dark:text-primary-accent" />
          <div>
            <p className="text-sm font-semibold text-brand-800 dark:text-primary-accent">{linkCode ? 'Almost done!' : 'Code sent!'}</p>
            <p className="mt-0.5 text-xs text-brand-700/80 dark:text-primary-accent/80">
              {linkCode
                ? <>Choose a new password for <span className="font-medium">{email}</span>.</>
                : <>If an account exists for <span className="font-medium">{email}</span>, a 6-digit code is on its way (check spam too). It expires in 15 minutes.</>}
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-text-primary">
          Enter your code
        </h1>
        <p className="mt-1 mb-6 text-sm text-gray-500 dark:text-text-secondary">
          Enter the code and choose a new password.
        </p>

        <form onSubmit={handleVerifyAndReset} className="flex flex-col gap-4">
          <Input
            label="6-digit code"
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
            label="New password"
            type="password"
            name="password"
            placeholder="At least 8 characters"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <Input
            label="Confirm new password"
            type="password"
            name="confirmPassword"
            placeholder="Re-enter your new password"
            icon={<Lock className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </div>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isSubmitting}>
            Reset Password
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500 dark:text-text-secondary">
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={() => { setStep('request'); setError(null); }}
            className="font-bold text-brand-600 hover:text-brand-700 dark:text-primary-accent"
          >
            Try again
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-text-primary">
        Reset your password
      </h1>
      <p className="mt-1 mb-6 text-sm text-gray-500 dark:text-text-secondary">
        We&apos;ll email you a 6-digit code to reset your password.
      </p>

      <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
        <Input
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

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isSubmitting}>
          Send Reset Code
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-gray-500 dark:text-text-secondary">
        <Link
          to={PUBLIC_ROUTES.login}
          className="inline-flex items-center gap-1.5 font-bold text-brand-600 hover:text-brand-700 dark:text-primary-accent"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Sign In
        </Link>
      </p>
    </div>
  );
}
