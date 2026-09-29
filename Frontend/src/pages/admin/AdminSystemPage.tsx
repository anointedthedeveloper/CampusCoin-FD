import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, DatabaseBackup, Mail, Send, Server } from 'lucide-react';
import { Badge, Button, Card, Input, PageSpinner } from '@/components/common';
import { adminSystemApi, type BackupStats, type EmailStatus } from '@/api/admin/system.api';
import { useAuth } from '@/hooks/useAuth';
import { formatBytes } from '@/utils/download';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';

const PROVIDER_LABEL: Record<string, string> = { brevo: 'Brevo', resend: 'Resend', smtp: 'SMTP' };

function Message({ ok, text }: { ok: boolean; text: string }) {
  return (
    <p role={ok ? 'status' : 'alert'} className={cn('text-sm', ok ? 'text-brand-700 dark:text-primary-accent' : 'text-red-600 dark:text-red-400')}>
      {text}
    </p>
  );
}

/** Email delivery and backup health, with a test email and a manual backup run. */
export function AdminSystemPage() {
  const { user } = useAuth();
  const [email, setEmail] = useState<EmailStatus | null>(null);
  const [backups, setBackups] = useState<BackupStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [testTo, setTestTo] = useState(user?.email ?? '');
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [runMsg, setRunMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [running, setRunning] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, b] = await Promise.all([adminSystemApi.emailStatus(), adminSystemApi.backupStats()]);
      setEmail(e);
      setBackups(b);
      setLoadError(null);
    } catch {
      setLoadError('System status could not be loaded.');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function sendTest(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setTestMsg(null);
    try {
      setTestMsg({ ok: true, text: await adminSystemApi.sendTestEmail(testTo.trim() || undefined) });
    } catch (err) {
      setTestMsg({ ok: false, text: err instanceof ApiError ? err.message : 'The test email failed.' });
    } finally {
      setSending(false);
      void load();
    }
  }

  async function runBackups() {
    setRunning(true);
    setRunMsg(null);
    try {
      setRunMsg({ ok: true, text: await adminSystemApi.runBackups() });
    } catch (err) {
      setRunMsg({ ok: false, text: err instanceof ApiError ? err.message : 'The backup run failed.' });
    } finally {
      setRunning(false);
      void load();
    }
  }

  if (loadError) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">{loadError}</div>;
  if (!email || !backups) return <PageSpinner label="Checking system status…" />;

  const errors = Object.entries(email.lastErrors);
  const coverage = backups.activeUsers ? Math.round((backups.usersBackedUpLast24h / backups.activeUsers) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">System</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">Check that emails are being delivered and that student data is backed up.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-text-primary"><Mail className="h-4 w-4" /> Email delivery</h2>
            {email.configured ? <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Set up</Badge> : <Badge tone="danger"><AlertTriangle className="h-3 w-3" /> Not set up</Badge>}
          </div>
          {email.configured ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-text-secondary">Providers (in order)</dt><dd className="font-medium text-gray-900 dark:text-text-primary">{email.providers.map((p) => PROVIDER_LABEL[p]).join(' → ')}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-gray-500 dark:text-text-secondary">Sender</dt><dd className="truncate font-medium text-gray-900 dark:text-text-primary">{email.from}</dd></div>
            </dl>
          ) : (
            <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">
              Password-reset codes, welcome emails and notifications can&apos;t be sent yet. On the backend host, set <code className="font-mono">BREVO_API_KEY</code> and <code className="font-mono">BREVO_SENDER</code> (free, sends to anyone once you verify your sender email at brevo.com), or <code className="font-mono">EMAIL_HOST</code>/<code className="font-mono">EMAIL_USER</code>/<code className="font-mono">EMAIL_PASS</code> for Gmail SMTP with an App Password. Then redeploy.
            </div>
          )}
          {errors.length > 0 && (
            <div className="mt-4 space-y-2">
              {errors.map(([provider, e]) => (
                <div key={provider} className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300">
                  <p className="font-semibold">{PROVIDER_LABEL[provider] ?? provider} failed {new Date(e.at).toLocaleString()}</p>
                  <p className="mt-0.5 break-words">{e.message}</p>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={sendTest} className="mt-5 space-y-3 border-t border-gray-100 pt-4 dark:border-white/10">
            <Input label="Send a test email to" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
            {testMsg && <Message {...testMsg} />}
            <Button type="submit" variant="primary" isLoading={sending} disabled={!email.configured}><Send className="h-4 w-4" /> Send test email</Button>
          </form>
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 dark:text-text-primary"><DatabaseBackup className="h-4 w-4" /> Backups</h2>
            <Badge tone={coverage >= 90 ? 'success' : coverage >= 50 ? 'warning' : 'danger'}>{coverage}% backed up today</Badge>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { label: 'Backups stored', value: backups.totalBackups.toLocaleString() },
              { label: 'Storage used', value: formatBytes(backups.totalBytes) },
              { label: 'Accounts backed up (24 h)', value: `${backups.usersBackedUpLast24h} / ${backups.activeUsers}` },
              { label: 'Last backup', value: backups.lastBackupAt ? new Date(backups.lastBackupAt).toLocaleString() : 'Never' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-gray-50 p-3 dark:bg-white/[0.04]">
                <p className="text-xs text-gray-500 dark:text-text-muted">{s.label}</p>
                <p className="mt-0.5 font-semibold text-gray-900 dark:text-text-primary">{s.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs text-gray-500 dark:text-text-muted">
            <Server className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Each student is backed up automatically once a day (and whenever they open their dashboard), keeping the last 7 days.
            {backups.cronConfigured ? ' The nightly job is set up.' : ' Set CRON_SECRET on Vercel to also run the nightly job for inactive students.'}
          </p>
          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4 dark:border-white/10">
            {runMsg && <Message {...runMsg} />}
            <Button type="button" variant="secondary" isLoading={running} onClick={() => void runBackups()}>Back up everyone who is due now</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
