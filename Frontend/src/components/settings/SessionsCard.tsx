import { useCallback, useEffect, useState } from 'react';
import { Laptop, LogOut, MonitorSmartphone, Smartphone } from 'lucide-react';
import { Badge, Card, Spinner } from '@/components/common';
import { authApi, type AuthSession } from '@/api/auth.api';
import { ApiError } from '@/types/api';

/** "Chrome on Windows" from a user-agent string — good enough for a device list. */
function describeDevice(ua: string): { label: string; mobile: boolean } {
  if (!ua) return { label: 'Unknown device', mobile: false };
  const browser = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS' : /Mac OS X|Macintosh/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'unknown OS';
  return { label: `${browser} on ${os}`, mobile: /Mobile|Android|iPhone/.test(ua) };
}

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return 'active now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}

/** Lists the devices signed in to this account and lets the student sign them out. */
export function SessionsCard() {
  const [sessions, setSessions] = useState<AuthSession[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSessions(await authApi.sessions());
      setError(null);
    } catch {
      setError('Signed-in devices could not be loaded.');
      setSessions((s) => s ?? []);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function signOut(id: string) {
    setBusy(id);
    try {
      await authApi.revokeSession(id);
      setNotice('That device was signed out.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign that device out.');
    } finally {
      setBusy(null);
    }
  }

  async function signOutOthers() {
    setBusy('others');
    try {
      const count = await authApi.revokeOtherSessions();
      setNotice(count ? `Signed out ${count} other device${count === 1 ? '' : 's'}.` : 'No other devices were signed in.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign the other devices out.');
    } finally {
      setBusy(null);
    }
  }

  const others = sessions?.filter((s) => !s.current).length ?? 0;

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MonitorSmartphone className="h-4 w-4 text-brand-600 dark:text-primary-accent" />
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Signed-in devices</h2>
        </div>
        {others > 0 && (
          <button type="button" onClick={() => void signOutOthers()} disabled={busy !== null} className="text-xs font-semibold text-red-600 hover:underline disabled:opacity-50 dark:text-red-400">
            Sign out all other devices
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-text-muted">You stay signed in on each device for 7 days after you last use it. Changing or resetting your password signs other devices out.</p>
      {notice && <p role="status" className="mt-2 text-xs font-medium text-brand-700 dark:text-primary-accent">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
      {sessions === null ? (
        <div className="flex justify-center py-4"><Spinner size="md" /></div>
      ) : (
        <ul className="mt-3 max-h-56 divide-y divide-gray-100 overflow-y-auto dark:divide-white/[0.06]">
          {sessions.map((s) => {
            const device = describeDevice(s.userAgent);
            const Icon = device.mobile ? Smartphone : Laptop;
            return (
              <li key={s.id} className="flex items-center gap-3 py-2.5">
                <Icon className="h-4 w-4 shrink-0 text-gray-400 dark:text-text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-text-primary">
                    {device.label}
                    {s.current && <Badge tone="success" size="sm">This device</Badge>}
                    {s.method === 'google' && <Badge tone="info" size="sm">Google</Badge>}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-text-muted">{s.current ? 'Active now' : ago(s.lastUsedAt)}{s.ip ? ` · ${s.ip}` : ''}</p>
                </div>
                {!s.current && (
                  <button type="button" onClick={() => void signOut(s.id)} disabled={busy !== null} aria-label={`Sign out ${device.label}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:text-text-secondary dark:hover:bg-white/10">
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
