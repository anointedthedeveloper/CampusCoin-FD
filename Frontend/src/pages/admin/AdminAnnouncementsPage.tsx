import { useEffect, useState, type FormEvent } from 'react';
import { Lightbulb, Megaphone, Pencil, Plus, Send, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, EmptyState } from '@/components/common';
import { adminAnnouncementService } from '@/services';
import { adminSavingTipsApi } from '@/api/admin/users.api';
import { formatDate } from '@/utils/format';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';
import type { Announcement, AnnouncementAudience, SavingTipTemplate } from '@/types/admin';

const audienceLabel: Record<AnnouncementAudience, string> = {
  all: 'Everyone',
  students: 'Students',
  admins: 'Admins',
};

const inputClass =
  'mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted';
const labelClass = 'text-sm font-medium text-gray-700 dark:text-text-secondary';

type Tab = 'announcements' | 'tips';

export function AdminAnnouncementsPage() {
  const [tab, setTab] = useState<Tab>('announcements');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Announcements &amp; Tips</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">
          Announcements appear on students&apos; Notifications page. Saving-tip templates appear on their Saving Tips page.
        </p>
      </div>

      <div className="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-white/[0.06]" role="tablist">
        {([
          { id: 'announcements', label: 'Announcements', icon: Megaphone },
          { id: 'tips', label: 'Saving-tip templates', icon: Lightbulb },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
              tab === id
                ? 'bg-white text-gray-900 shadow-sm dark:bg-surface-elevated dark:text-text-primary'
                : 'text-gray-500 hover:text-gray-800 dark:text-text-muted dark:hover:text-text-secondary',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'announcements' ? <AnnouncementsPanel /> : <SavingTipsPanel />}
    </div>
  );
}

function AnnouncementsPanel() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('students');
  const [publishNow, setPublishNow] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [deleting, setDeleting] = useState<Announcement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  function startEdit(announcement: Announcement) {
    setEditingId(announcement.id);
    setTitle(announcement.title);
    setBody(announcement.body);
    setAudience(announcement.audience);
    setPublishNow(Boolean(announcement.publishedAt));
    setError(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function unpublish(id: string) {
    await adminAnnouncementService.update(id, { unpublish: true });
    setRefreshToken((t) => t + 1);
  }

  useEffect(() => {
    void adminAnnouncementService.list().then(setAnnouncements).catch(() => setAnnouncements([]));
  }, [refreshToken]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      if (editingId) {
        const original = announcements.find((a) => a.id === editingId);
        await adminAnnouncementService.update(editingId, {
          title: title.trim(),
          body: body.trim(),
          audience,
          ...(publishNow && !original?.publishedAt ? { publishNow: true } : {}),
          ...(!publishNow && original?.publishedAt ? { unpublish: true } : {}),
        });
      } else {
        await adminAnnouncementService.create({ title: title.trim(), body: body.trim(), audience, publishNow });
      }
      setEditingId(null);
      setTitle('');
      setBody('');
      setIsFormOpen(false);
      setRefreshToken((token) => token + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this announcement.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function publish(id: string) {
    await adminAnnouncementService.update(id, { publishNow: true });
    setRefreshToken((t) => t + 1);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" onClick={() => { setIsFormOpen((open) => !open); setError(null); setEditingId(null); setTitle(''); setBody(''); setPublishNow(true); }}>
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isFormOpen ? 'Cancel' : 'New Announcement'}
        </Button>
      </div>

      {deleting && (
        <ConfirmDialog
          open
          title="Delete this announcement?"
          description={<>&ldquo;{deleting.title}&rdquo; will no longer be shown to anyone.</>}
          confirmLabel="Delete"
          onConfirm={async () => {
            await adminAnnouncementService.remove(deleting.id);
            setRefreshToken((t) => t + 1);
          }}
          onClose={() => setDeleting(null)}
        />
      )}

      {isFormOpen && (
        <Card className="animate-fade-in-up p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="ann-title" className={labelClass}>Title</label>
              <input id="ann-title" type="text" required maxLength={120} placeholder="e.g. New budget alerts are live" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="ann-body" className={labelClass}>Message</label>
              <textarea id="ann-body" required rows={3} maxLength={1000} placeholder="What should students know?" value={body} onChange={(e) => setBody(e.target.value)} className={cn(inputClass, 'resize-none')} />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="flex flex-wrap items-end gap-6">
                <div>
                  <span className={labelClass}>Audience</span>
                  <div className="mt-1 inline-flex rounded-lg bg-gray-100 p-1 dark:bg-white/[0.06]">
                    {(['all', 'students', 'admins'] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setAudience(option)}
                        className={cn(
                          'rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200',
                          audience === option ? 'bg-brand-600 text-white shadow-sm dark:bg-primary' : 'text-gray-600 hover:text-gray-900 dark:text-text-muted dark:hover:text-text-primary',
                        )}
                      >
                        {audienceLabel[option]}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 pb-2 text-sm text-gray-700 dark:text-text-secondary">
                  <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
                  Publish immediately
                </label>
              </div>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                {editingId ? 'Save changes' : publishNow ? 'Publish' : 'Save draft'}
              </Button>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </form>
        </Card>
      )}

      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Create your first announcement with the button above." />
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-text-primary">{announcement.title}</p>
                  <Badge tone={announcement.publishedAt ? 'success' : 'warning'}>{announcement.publishedAt ? 'Published' : 'Draft'}</Badge>
                  <Badge tone="neutral">{audienceLabel[announcement.audience]}</Badge>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-gray-600 dark:text-text-secondary">{announcement.body}</p>
                <p className="mt-2 text-xs text-gray-400 dark:text-text-muted">
                  {announcement.publishedAt ? `Published ${formatDate(announcement.publishedAt)}` : `Draft saved ${formatDate(announcement.createdAt)}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!announcement.publishedAt && (
                  <button type="button" onClick={() => void publish(announcement.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-50 dark:border-primary/25 dark:text-primary-accent dark:hover:bg-primary/10">
                    <Send className="h-3.5 w-3.5" /> Publish
                  </button>
                )}
                {announcement.publishedAt && (
                  <button type="button" onClick={() => void unpublish(announcement.id)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-text-muted dark:hover:bg-white/5">
                    Unpublish
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => startEdit(announcement)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-text-muted dark:hover:bg-white/5 dark:hover:text-text-primary"
                  aria-label={`Edit ${announcement.title}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(announcement)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  aria-label={`Delete ${announcement.title}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SavingTipsPanel() {
  const [tips, setTips] = useState<SavingTipTemplate[]>([]);
  const [editing, setEditing] = useState<SavingTipTemplate | 'new' | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('General');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<SavingTipTemplate | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    adminSavingTipsApi.list().then(setTips).catch(() => setTips([]));
  }, [refreshToken]);

  function openEditor(tip: SavingTipTemplate | 'new') {
    setEditing(tip);
    setError(null);
    setTitle(tip === 'new' ? '' : tip.title);
    setBody(tip === 'new' ? '' : tip.body);
    setCategory(tip === 'new' ? 'General' : tip.category || 'General');
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = { title: title.trim(), body: body.trim(), category: category.trim() || 'General' };
      if (editing === 'new') await adminSavingTipsApi.create(payload);
      else if (editing) await adminSavingTipsApi.update(editing.id, payload);
      setEditing(null);
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this tip.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500 dark:text-text-secondary">
          General tips shown to every student, alongside the personalised tips generated from their own spending.
        </p>
        <Button variant="primary" onClick={() => (editing ? setEditing(null) : openEditor('new'))}>
          {editing ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {editing ? 'Cancel' : 'New Tip'}
        </Button>
      </div>

      {deleting && (
        <ConfirmDialog
          open
          title="Delete this tip template?"
          description={<>&ldquo;{deleting.title}&rdquo; will be removed for all students.</>}
          confirmLabel="Delete"
          onConfirm={async () => {
            await adminSavingTipsApi.remove(deleting.id);
            setRefreshToken((t) => t + 1);
          }}
          onClose={() => setDeleting(null)}
        />
      )}

      {editing && (
        <Card className="animate-fade-in-up p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <div>
                <label htmlFor="tip-title" className={labelClass}>Title</label>
                <input id="tip-title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Cook at home" className={inputClass} />
              </div>
              <div>
                <label htmlFor="tip-category" className={labelClass}>Category</label>
                <input id="tip-category" maxLength={60} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Food" className={inputClass} />
              </div>
            </div>
            <div>
              <label htmlFor="tip-body" className={labelClass}>Tip</label>
              <textarea id="tip-body" required rows={3} maxLength={600} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Explain the tip in a sentence or two." className={cn(inputClass, 'resize-none')} />
            </div>
            <div className="flex items-center justify-between gap-3">
              {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p> : <span />}
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                {editing === 'new' ? 'Add tip' : 'Save changes'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {tips.length === 0 ? (
        <EmptyState icon={Lightbulb} title="No tip templates yet" description="Default tips are created the first time a student opens Saving Tips." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tips.map((tip) => (
            <Card key={tip.id} className="flex items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900 dark:text-text-primary">{tip.title}</p>
                  {tip.category && <Badge tone="brand">{tip.category}</Badge>}
                </div>
                <p className="mt-1 text-sm text-gray-600 dark:text-text-secondary">{tip.body}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={() => openEditor(tip)} aria-label={`Edit ${tip.title}`} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-text-muted dark:hover:bg-white/5 dark:hover:text-text-primary">
                  <Pencil className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setDeleting(tip)} aria-label={`Delete ${tip.title}`} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
