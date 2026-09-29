import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate, useOutletContext } from 'react-router-dom';
import { KeyRound, Lock } from 'lucide-react';
import { AuthPageHeader } from '@/components/auth';
import { Button, Input } from '@/components/common';
import { authService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { postLoginPath } from '@/hooks/useGoogleSignIn';
import { isStrongPassword } from '@/utils/validation';
import { ApiError } from '@/types/api';
import type { AuthPageOutletContext } from './authOutletContext';

/**
 * Shown once after signing up with Google: the account has no password yet,
 * so the student chooses one and can later sign in with email + password as
 * well as with Google.
 */
export function SetPasswordPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { compact } = useOutletContext<AuthPageOutletContext>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return <Navigate to="/login" replace />;
  if (user.hasPassword !== false) return <Navigate to={postLoginPath(user)} replace />;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!isStrongPassword(password)) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setIsSubmitting(true);
    try {
      await authService.changePassword(user!.id, '', password);
      await refreshUser();
      navigate(postLoginPath({ ...user!, hasPassword: true }), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save your password. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <AuthPageHeader
        icon={KeyRound}
        title="Choose a password"
        subtitle={`You signed in with Google as ${user.email}. Set a password so you can also sign in with your email.`}
        compact={compact}
      />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
          hint="At least 8 characters."
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          icon={<Lock className="h-4 w-4" />}
        />
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
        <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isSubmitting}>
          Save password and continue
        </Button>
      </form>
    </div>
  );
}
