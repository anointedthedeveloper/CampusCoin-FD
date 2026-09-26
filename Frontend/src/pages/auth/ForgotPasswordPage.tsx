import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { authService } from '@/services';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { isValidEmail } from '@/utils/validation';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.forgotPassword({ email });
      setIsSent(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Check your inbox</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-text-secondary">
          If an account exists for <span className="font-medium text-gray-700 dark:text-text-primary">{email}</span>, a reset link is
          on its way.
        </p>
        <Link
          to={PUBLIC_ROUTES.login}
          className="mt-6 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-[var(--primary-accent)] dark:hover:text-[var(--primary)]"
        >
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Forgot Password</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">
        Enter your email and we&apos;ll send you a link to reset your password.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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
          Send Reset Link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600 dark:text-text-secondary">
        Remembered your password?{' '}
        <Link
          to={PUBLIC_ROUTES.login}
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-[var(--primary-accent)] dark:hover:text-[var(--primary)]"
        >
          Log In
        </Link>
      </p>
    </div>
  );
}
