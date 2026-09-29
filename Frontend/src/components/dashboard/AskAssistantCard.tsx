import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, MessageSquare, Send } from 'lucide-react';
import { Card } from '@/components/common';
import { STUDENT_ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/format';
import type { AIConversationSummary } from '@/api/ai.api';

const SUGGESTIONS = ['When can I afford a new phone?', 'Show my spending as a table', 'How am I doing this month?'];

/** Dashboard entry point to the AI Assistant: quick ask + recent chats. */
export function AskAssistantCard({ chats }: { chats: AIConversationSummary[] }) {
  const navigate = useNavigate();
  const [question, setQuestion] = useState('');

  function ask(text: string) {
    const q = text.trim();
    if (!q) return;
    navigate(`${STUDENT_ROUTES.insights}?q=${encodeURIComponent(q)}`);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  return (
    <Card>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white dark:bg-primary">
              <Bot className="h-4 w-4" />
            </span>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-text-primary">Ask the assistant</h2>
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={300}
              placeholder="e.g. Can I afford ₦15,000 headphones?"
              aria-label="Ask the AI assistant"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted"
            />
            <button type="submit" disabled={!question.trim()} aria-label="Ask" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 dark:bg-primary dark:hover:bg-primary-accent">
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:text-text-secondary dark:hover:border-primary/40 dark:hover:text-primary-accent">
                {s}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-text-muted">Recent chats</p>
            <Link to={STUDENT_ROUTES.insights} className="text-xs font-semibold text-brand-700 hover:underline dark:text-primary-accent">Open assistant →</Link>
          </div>
          {chats.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-text-muted">No chats yet — your conversations are saved here.</p>
          ) : (
            <div className="space-y-1.5">
              {chats.map((chat) => (
                <Link key={chat.id} to={`${STUDENT_ROUTES.insights}?c=${chat.id}`} className="flex items-center gap-2.5 rounded-lg border border-gray-100 px-3 py-2 transition-colors hover:border-brand-200 hover:bg-brand-50 dark:border-white/[0.06] dark:hover:border-primary/30 dark:hover:bg-primary/[0.06]">
                  <MessageSquare className="h-4 w-4 shrink-0 text-gray-400 dark:text-text-muted" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-800 dark:text-text-primary">{chat.title}</span>
                    <span className="block text-[11px] text-gray-400 dark:text-text-muted">{formatDate(chat.updatedAt)}</span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
