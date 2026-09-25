import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { authService } from '@/services';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { isStrongPassword } from '@/utils/validation';

export function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

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
      await authService.resetPassword({ token: token ?? '', newPassword: password });
      navigate(PUBLIC_ROUTES.login, { replace: true });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
      <p className="mt-1 text-sm text-gray-500">Choose a new password for your account.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
          Reset Password
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-600">
        <Link to={PUBLIC_ROUTES.login} className="font-semibold text-brand-600 hover:text-brand-700">
          Back to Login
        </Link>
      </p>
    </div>
  );
}
