import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  GraduationCap,
  Lock,
  Mail,
  PiggyBank,
  School,
  User,
  Wallet,
} from 'lucide-react';
import { Button, GoogleButton, Input } from '@/components/common';
import { AuthPageHeader } from '@/components/auth';
import { useAuth } from '@/hooks/useAuth';
import { PUBLIC_ROUTES, STUDENT_ROUTES } from '@/constants/routes';
import { isStrongPassword, isValidEmail } from '@/utils/validation';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';
import type { AuthPageOutletContext } from './authOutletContext';

export function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const { compact } = useOutletContext<AuthPageOutletContext>();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [school, setSchool] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [monthlyAllowanceBaseline, setMonthlyAllowanceBaseline] = useState('');
  const [savingsGoalAmount, setSavingsGoalAmount] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  async function handleGoogleSignup() {
    setError(null);
    setIsGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate(STUDENT_ROUTES.dashboard, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed. Please try again.');
    } finally {
      setIsGoogleLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
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
      await register({
        fullName,
        email,
        password,
        school: school.trim() || undefined,
        academicYear: academicYear.trim() || undefined,
        monthlyAllowanceBaseline: monthlyAllowanceBaseline ? Number(monthlyAllowanceBaseline) : undefined,
        savingsGoalAmount: savingsGoalAmount ? Number(savingsGoalAmount) : undefined,
      });
      navigate(STUDENT_ROUTES.dashboard, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const gap = compact ? 'gap-2' : 'gap-3.5';
  const gridGap = compact ? 'gap-2' : 'gap-3';

  return (
    <div>
      <AuthPageHeader
        icon={User}
        title="Create Your Account"
        subtitle="Join Campus Coin and start managing your finances today."
        compact={compact}
      />

      <form onSubmit={handleSubmit} className={cn('flex flex-col', compact ? 'mt-3' : 'mt-6', gap)}>

        {/* ── Personal info ───────────────────────── */}
        <div className={cn('flex flex-col', gap)}>
          <Input
            compact={compact}
            label="Full Name"
            name="fullName"
            placeholder="Enter your full name"
            icon={<User className="h-4 w-4" />}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />

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
        </div>

        {/* ── Academic info ───────────────────────── */}
        <div className={cn('grid grid-cols-1 sm:grid-cols-2', gridGap)}>
          <Input
            compact={compact}
            label="School"
            name="school"
            placeholder="e.g. University of Lagos"
            icon={<School className="h-4 w-4" />}
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            autoComplete="organization"
          />
          <Input
            compact={compact}
            label="Academic Year"
            name="academicYear"
            placeholder="e.g. 300 Level"
            icon={<GraduationCap className="h-4 w-4" />}
            value={academicYear}
            onChange={(e) => setAcademicYear(e.target.value)}
          />
        </div>

        {/* ── Financial info ──────────────────────── */}
        <div className={cn('grid grid-cols-1 sm:grid-cols-2', gridGap)}>
          <Input
            compact={compact}
            label="Monthly Allowance"
            name="monthlyAllowanceBaseline"
            type="number"
            min="0"
            step="0.01"
            placeholder="Optional"
            icon={<Wallet className="h-4 w-4" />}
            hint="Your typical monthly budget"
            value={monthlyAllowanceBaseline}
            onChange={(e) => setMonthlyAllowanceBaseline(e.target.value)}
          />
          <Input
            compact={compact}
            label="Savings Goal"
            name="savingsGoalAmount"
            type="number"
            min="0"
            step="0.01"
            placeholder="Optional"
            icon={<PiggyBank className="h-4 w-4" />}
            hint="Target amount to save"
            value={savingsGoalAmount}
            onChange={(e) => setSavingsGoalAmount(e.target.value)}
          />
        </div>

        {/* ── Password ────────────────────────────── */}
        <div className={cn('flex flex-col', gap)}>
          <Input
            compact={compact}
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Create a password"
            icon={<Lock className="h-4 w-4" />}
            hint="At least 8 characters"
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="rounded p-0.5 text-gray-400 transition-colors hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />

          <Input
            compact={compact}
            label="Confirm Password"
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Confirm your password"
            icon={<Lock className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>

        {/* ── Error banner ────────────────────────── */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 3.75a.75.75 0 0 1 1.5 0v3.5a.75.75 0 0 1-1.5 0v-3.5ZM8 11.5a.875.875 0 1 1 0-1.75.875.875 0 0 1 0 1.75Z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          isLoading={isSubmitting}
          loadingText="Creating account…"
        >
          Sign Up
          <ArrowRight className="h-4 w-4" />
        </Button>
      </form>

      {/* ── Divider ─────────────────────────────── */}
      <div className={cn('flex items-center gap-3', compact ? 'my-3' : 'my-5')}>
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">or</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <GoogleButton onClick={() => void handleGoogleSignup()} isLoading={isGoogleLoading} label="Sign up with Google" />

      <p className={cn('text-center text-sm text-gray-500', compact ? 'mt-3' : 'mt-5')}>
        Already have an account?{' '}
        <Link to={PUBLIC_ROUTES.login} className="font-semibold text-brand-600 hover:text-brand-700 transition-colors">
          Login
        </Link>
      </p>
    </div>
  );
}
