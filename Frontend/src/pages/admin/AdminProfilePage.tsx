import { useState, type FormEvent } from 'react';
import { KeyRound, Mail, ShieldCheck, Type, User as UserIcon } from 'lucide-react';
import { Avatar, Badge, Button, Card, Input } from '@/components/common';
import { authService, profileService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { FONT_SCALES, getFontScale, setFontScale, type FontScaleId } from '@/utils/fontScale';
import { isStrongPassword } from '@/utils/validation';
import { formatDate } from '@/utils/format';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';
import { SessionsCard } from '@/components/settings/SessionsCard';

export function AdminProfilePage() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [fontScale, setFontScaleState] = useState<FontScaleId>(getFontScale);

  if (!user) return null;

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    if (!fullName.trim()) { setProfileMsg({ ok: false, text: 'Name cannot be empty.' }); return; }
    setIsSavingProfile(true);
    setProfileMsg(null);
    try {
      await profileService.updateProfile({ fullName: fullName.trim() });
      await refreshUser();
      setProfileMsg({ ok: true, text: 'Profile saved.' });
    } catch (err) {
      setProfileMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not save your profile.' });
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordMsg(null);
    if (!isStrongPassword(newPassword)) { setPasswordMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return; }
    if (newPassword !== confirmPassword) { setPasswordMsg({ ok: false, text: 'Passwords do not match.' }); return; }
    setIsSavingPassword(true);
    try {
      await authService.changePassword(user!.id, currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMsg({ ok: true, text: 'Password changed.' });
    } catch (err) {
      setPasswordMsg({ ok: false, text: err instanceof ApiError ? err.message : 'Could not change your password.' });
    } finally {
      setIsSavingPassword(false);
    }
  }

  const message = (m: { ok: boolean; text: string } | null) =>
    m && <p role={m.ok ? 'status' : 'alert'} className={cn('text-sm', m.ok ? 'text-brand-700 dark:text-primary-accent' : 'text-red-600 dark:text-red-400')}>{m.text}</p>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">Your administrator account details and security.</p>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-4 bg-gradient-to-r from-brand-950 to-[#0f3a23] px-6 py-6 text-white">
          <Avatar name={user.fullName} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-xl font-bold">{user.fullName}</p>
            <p className="truncate text-sm text-emerald-100/80">{user.email}</p>
          </div>
          <Badge tone="success" className="ml-auto"><ShieldCheck className="mr-1 inline h-3 w-3" />Administrator</Badge>
        </div>
        <dl className="grid gap-3 px-6 py-5 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /><dt className="text-gray-500 dark:text-text-secondary">Email</dt><dd className="ml-auto truncate font-medium text-gray-900 dark:text-text-primary">{user.email}</dd></div>
          <div className="flex items-center gap-2"><UserIcon className="h-4 w-4 text-gray-400" /><dt className="text-gray-500 dark:text-text-secondary">Member since</dt><dd className="ml-auto font-medium text-gray-900 dark:text-text-primary">{formatDate(user.createdAt)}</dd></div>
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <form onSubmit={saveProfile} className="space-y-4">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-text-primary"><UserIcon className="h-4 w-4" /> Profile</h2>
            <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} required />
            <Input label="Email" value={user.email} disabled hint="Email can't be changed here." />
            {message(profileMsg)}
            <Button type="submit" variant="primary" isLoading={isSavingProfile}>Save profile</Button>
          </form>
        </Card>

        <Card>
          <form onSubmit={savePassword} className="space-y-4">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-text-primary"><KeyRound className="h-4 w-4" /> Change password</h2>
            {user.hasPassword !== false && (
              <Input label="Current password" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
            )}
            <Input label="New password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required hint="At least 8 characters." />
            <Input label="Confirm new password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            {message(passwordMsg)}
            <Button type="submit" variant="primary" isLoading={isSavingPassword}>Change password</Button>
          </form>
        </Card>
      </div>

      <SessionsCard />

      <Card>
        <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-text-primary"><Type className="h-4 w-4" /> Text size</h2>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Text size">
          {FONT_SCALES.map((scale) => (
            <button
              key={scale.id}
              type="button"
              role="radio"
              aria-checked={fontScale === scale.id}
              onClick={() => { setFontScale(scale.id); setFontScaleState(scale.id); }}
              className={cn(
                'rounded-lg border px-4 py-2',
                fontScale === scale.id
                  ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700 dark:border-primary-accent dark:bg-primary/10 dark:text-primary-accent'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5',
              )}
            >
              {scale.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
