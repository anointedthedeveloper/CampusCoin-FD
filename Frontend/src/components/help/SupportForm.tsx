import { useState, type FormEvent } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { Button } from '@/components/common';
import { supportApi } from '@/api/support.api';
import { useAuth } from '@/hooks/useAuth';
import { isValidEmail } from '@/utils/validation';
import { ApiError } from '@/types/api';

const TOPICS = ['General question', 'Account & sign-in', 'Transactions & budgets', 'AI Assistant', 'Report a problem', 'Delete my account'];

const fieldCls =
  'mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted';

/** Contact form that files a message in the admin Support inbox. */
export function SupportForm({ onSent }: { onSent?: (id: string) => void } = {}) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.fullName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [topic, setTopic] = useState(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [linked, setLinked] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) { setError('Enter your name.'); return; }
    if (!isValidEmail(email)) { setError('Enter a valid email address so we can reply.'); return; }
    if (message.trim().length < 10) { setError('Please write at least 10 characters.'); return; }
    setIsSubmitting(true);
    try {
      const result = await supportApi.send({ name: name.trim(), email: email.trim(), topic, message: message.trim() });
      setLinked(result.linked);
      setSent(true);
      setMessage('');
      onSent?.(result.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your message could not be sent. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
        <CheckCircle2 className="h-10 w-10 text-brand-600 dark:text-primary-accent" />
        <p className="text-lg font-bold text-gray-900 dark:text-text-primary">Message sent</p>
        <p className="max-w-sm text-sm text-gray-600 dark:text-text-secondary">
          {linked
            ? 'Thanks — replies from the Campus Coin team will appear in “My conversations” and in your notifications. We’ll email you too.'
            : `Thanks — the Campus Coin team will reply to ${email}.`}
        </p>
        <button type="button" onClick={() => setSent(false)} className="text-sm font-semibold text-brand-700 hover:underline dark:text-primary-accent">Send another message</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
      <label className="text-sm font-medium text-gray-700 dark:text-text-secondary">
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" className={fieldCls} />
      </label>
      <label className="text-sm font-medium text-gray-700 dark:text-text-secondary">
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} autoComplete="email" className={fieldCls} />
      </label>
      <label className="text-sm font-medium text-gray-700 dark:text-text-secondary sm:col-span-2">
        Topic
        <select value={topic} onChange={(e) => setTopic(e.target.value)} className={fieldCls}>
          {TOPICS.map((t) => <option key={t}>{t}</option>)}
        </select>
      </label>
      <label className="text-sm font-medium text-gray-700 dark:text-text-secondary sm:col-span-2">
        Message
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} maxLength={4000} placeholder="Tell us what you need help with…" className={`${fieldCls} resize-y`} />
      </label>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2">
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          <Send className="h-4 w-4" /> Send message
        </Button>
      </div>
    </form>
  );
}
