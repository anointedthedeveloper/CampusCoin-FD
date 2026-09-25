import { useEffect, useState, type FormEvent } from 'react';
import { Megaphone, Plus, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState } from '@/components/common';
import { adminAnnouncementService } from '@/services';
import { formatDate } from '@/utils/format';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';
import type { Announcement, AnnouncementAudience } from '@/types/admin';

const audienceLabel: Record<AnnouncementAudience, string> = {
  all: 'Everyone',
  students: 'Students',
  admins: 'Admins',
};

export function AdminAnnouncementsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('students');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    void adminAnnouncementService.list().then(setAnnouncements);
  }, [refreshToken]);

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this announcement? Students will no longer see it.')) return;
    await adminAnnouncementService.remove(id);
    setRefreshToken((t) => t + 1);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setError(null);

    setIsSubmitting(true);
    try {
      adminAnnouncementService.create({ title, body, audience });
      setTitle('');
      setBody('');
      setIsFormOpen(false);
      setRefreshToken((token) => token + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not publish this announcement.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements &amp; Tips</h1>
          <p className="mt-1 text-sm text-gray-500">
            Publish updates and guidance shown to students on their Notifications page.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setIsFormOpen((open) => !open);
            setError(null);
          }}
        >
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isFormOpen ? 'Cancel' : 'New Announcement'}
        </Button>
      </div>

      {isFormOpen && (
        <Card className="animate-fade-in-up p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="ann-title" className="text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                id="ann-title"
                type="text"
                required
                placeholder="e.g. New budget alerts are live"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label htmlFor="ann-body" className="text-sm font-medium text-gray-700">
                Message
              </label>
              <textarea
                id="ann-body"
                required
                rows={3}
                placeholder="What should students know?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="mt-1 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Audience</span>
                <div className="mt-1 inline-flex rounded-lg bg-gray-100 p-1">
                  {(['all', 'students', 'admins'] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setAudience(option)}
                      className={cn(
                        'rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200',
                        audience === option ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900',
                      )}
                    >
                      {audienceLabel[option]}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>
                Publish
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </Card>
      )}

      {announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Publish your first announcement above." />
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="flex items-start justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900">{announcement.title}</p>
                  <Badge tone={announcement.publishedAt ? 'success' : 'neutral'}>
                    {announcement.publishedAt ? 'Published' : 'Draft'}
                  </Badge>
                  <Badge tone="neutral">{audienceLabel[announcement.audience]}</Badge>
                </div>
                <p className="mt-1 text-sm text-gray-600">{announcement.body}</p>
                <p className="mt-2 text-xs text-gray-400">
                  {announcement.publishedAt ? `Published ${formatDate(announcement.publishedAt)}` : 'Not published'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(announcement.id)}
                className="shrink-0 rounded-lg p-1.5 text-gray-300 transition-colors duration-200 hover:bg-red-50 hover:text-red-600"
                aria-label={`Delete ${announcement.title}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
