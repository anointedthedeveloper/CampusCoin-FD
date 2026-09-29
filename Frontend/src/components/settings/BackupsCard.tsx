import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { DatabaseBackup, Download, RotateCcw, Trash2, Upload } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Spinner } from '@/components/common';
import { backupsApi, type BackupSummary } from '@/api/backups.api';
import { ApiError } from '@/types/api';
import { downloadBlob, formatBytes } from '@/utils/download';

const KIND_LABEL: Record<BackupSummary['kind'], { label: string; tone: 'brand' | 'info' | 'neutral' }> = {
  daily: { label: 'Automatic', tone: 'brand' },
  manual: { label: 'Manual', tone: 'info' },
  'pre-restore': { label: 'Before restore', tone: 'neutral' },
};

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function summary(b: BackupSummary) {
  const c = b.counts;
  return `${c.transactions ?? 0} transactions · ${c.categories ?? 0} categories · ${c.budgets ?? 0} budgets · ${c.savingsGoals ?? 0} goals`;
}

/**
 * Automatic daily backups plus manual ones: download a copy, restore any of
 * them, or restore from a previously downloaded file.
 */
export function BackupsCard() {
  const [backups, setBackups] = useState<BackupSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<BackupSummary | null>(null);
  const [deleting, setDeleting] = useState<BackupSummary | null>(null);
  const [fileSnapshot, setFileSnapshot] = useState<{ name: string; data: unknown } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      setBackups(await backupsApi.list());
      setError(null);
    } catch {
      setError('Backups could not be loaded.');
      setBackups((b) => b ?? []);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function backUpNow() {
    setCreating(true);
    setError(null);
    try {
      await backupsApi.create();
      setNotice('Backup created.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The backup could not be created.');
    } finally {
      setCreating(false);
    }
  }

  async function download(b: BackupSummary) {
    try {
      const blob = await backupsApi.download(b.id);
      downloadBlob(blob, `campus-coin-backup-${b.createdAt.slice(0, 10)}.json`);
    } catch {
      setError('The backup could not be downloaded.');
    }
  }

  async function pickFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    if (file.size > 15 * 1024 * 1024) { setError('That file is too large to be a Campus Coin backup.'); return; }
    try {
      const data = JSON.parse(await file.text()) as { format?: string };
      if (data?.format !== 'campus-coin-backup') { setError('That file is not a Campus Coin backup.'); return; }
      setFileSnapshot({ name: file.name, data });
    } catch {
      setError('That file could not be read. Choose a .json backup downloaded from Campus Coin.');
    }
  }

  function restoredMessage(counts: Record<string, number>) {
    return `Restored ${counts.transactions ?? 0} transactions, ${counts.categories ?? 0} categories, ${counts.budgets ?? 0} budgets and ${counts.savingsGoals ?? 0} goals.`;
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <DatabaseBackup className="h-4 w-4 text-brand-600 dark:text-primary-accent" />
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Backups</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => void pickFile(e)} />
          <Button type="button" variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Restore from file
          </Button>
          <Button type="button" variant="primary" size="sm" isLoading={creating} onClick={() => void backUpNow()}>
            Back up now
          </Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-text-muted">
        Campus Coin backs up your transactions, categories, budgets, recurring entries and goals every day and keeps the last 7 daily backups. Restoring replaces your current data — a copy of it is saved first, so you can undo.
      </p>
      {notice && <p role="status" className="mt-2 text-xs font-medium text-brand-700 dark:text-primary-accent">{notice}</p>}
      {error && <p role="alert" className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}

      {backups === null ? (
        <div className="flex justify-center py-4"><Spinner size="md" /></div>
      ) : backups.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500 dark:text-text-muted">No backups yet.</p>
      ) : (
        <ul className="mt-3 max-h-64 divide-y divide-gray-100 overflow-y-auto dark:divide-white/[0.06]">
          {backups.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-2 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-text-primary">
                  {when(b.createdAt)}
                  <Badge tone={KIND_LABEL[b.kind].tone} size="sm">{KIND_LABEL[b.kind].label}</Badge>
                </p>
                <p className="text-xs text-gray-500 dark:text-text-muted">{summary(b)} · {formatBytes(b.sizeBytes)}</p>
              </div>
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => void download(b)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-text-muted dark:hover:bg-white/10" aria-label="Download backup" title="Download">
                  <Download className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setRestoring(b)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-text-muted dark:hover:bg-white/10" aria-label="Restore this backup" title="Restore">
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setDeleting(b)} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10" aria-label="Delete backup" title="Delete">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {restoring && (
        <ConfirmDialog
          open
          tone="primary"
          title="Restore this backup?"
          description={`Your data will be replaced with the backup from ${when(restoring.createdAt)} (${summary(restoring)}). What you have now is saved as a "Before restore" backup first.`}
          confirmLabel="Restore"
          onConfirm={async () => {
            try {
              const counts = await backupsApi.restore(restoring.id);
              setNotice(restoredMessage(counts));
              await load();
            } catch (err) {
              throw new Error(err instanceof ApiError ? err.message : 'The restore failed. Your data was not changed.');
            }
          }}
          onClose={() => setRestoring(null)}
        />
      )}
      {fileSnapshot && (
        <ConfirmDialog
          open
          tone="primary"
          title="Restore from this file?"
          description={`Your data will be replaced with the contents of "${fileSnapshot.name}". What you have now is saved as a "Before restore" backup first.`}
          confirmLabel="Restore"
          onConfirm={async () => {
            try {
              const counts = await backupsApi.restoreFile(fileSnapshot.data);
              setNotice(restoredMessage(counts));
              await load();
            } catch (err) {
              throw new Error(err instanceof ApiError ? err.message : 'The restore failed. Your data was not changed.');
            }
          }}
          onClose={() => setFileSnapshot(null)}
        />
      )}
      {deleting && (
        <ConfirmDialog
          open
          title="Delete this backup?"
          description={`The backup from ${when(deleting.createdAt)} will be removed. Your current data is not affected.`}
          confirmLabel="Delete"
          onConfirm={async () => {
            await backupsApi.remove(deleting.id);
            await load();
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </Card>
  );
}
