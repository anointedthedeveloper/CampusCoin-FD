import { useEffect, useState, type FormEvent } from 'react';
import { Bot, Check, Send, Sparkles, Zap } from 'lucide-react';
import { Card, PageSpinner, Spinner } from '@/components/common';
import { aiService, transactionService, categoryService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatMonthLabel } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Category } from '@/types/category';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  suggestedAmount?: number;
  suggestedDescription?: string;
}

const QUICK_QUESTIONS = [
  "What's my budget this month?",
  'How much have I spent?',
  'Any saving tips for me?',
  'How do I add a transaction?',
];

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function parseAmount(text: string): number | undefined {
  const match = text.replace(/,/g, '').match(/₦?\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
}

export function InsightsPage() {
  const { user } = useAuth();
  const month = monthKey();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'assistant',
    text: "Hi! I'm your Campus Coin Assistant. Ask about your budget or spending, or describe a purchase and I'll suggest a category.",
  }]);
  const [draft, setDraft] = useState('');
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    categoryService.list(user.id)
      .then((result) => {
        if (!cancelled) setCategories(result);
      })
      .catch(() => {
        if (!cancelled) setCategories([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  async function sendMessage(text: string) {
    const trimmedText = text.trim();
    if (!trimmedText || isSending) return;

    const history = messages
      .filter((message) => message.id !== 'welcome')
      .slice(-8)
      .map(({ role, text: turnText }) => ({ role, text: turnText }));
    setMessages((previous) => [...previous, {
      id: crypto.randomUUID(),
      role: 'user',
      text: trimmedText,
    }]);
    setDraft('');
    setIsSending(true);

    try {
      const answer = await aiService.answer(trimmedText, history);
      const looksLikeExpense = /bought|spent|₦|paid|purchase/i.test(trimmedText);
      const lowerText = trimmedText.toLowerCase();
      const expenseCategories = categories.filter((category) => category.type === 'expense');
      const categoryMatch = expenseCategories.find((category) => lowerText.includes(category.name.toLowerCase()))
        ?? expenseCategories.find((category) => /^other/i.test(category.name));
      const amount = parseAmount(trimmedText);

      setMessages((previous) => [...previous, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: answer,
        ...(looksLikeExpense && categoryMatch && amount ? {
          suggestedCategoryId: categoryMatch.id,
          suggestedCategoryName: categoryMatch.name,
          suggestedAmount: amount,
          suggestedDescription: trimmedText,
        } : {}),
      }]);
    } catch {
      setMessages((previous) => [...previous, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'I could not reach the AI service right now. Please try again shortly.',
      }]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleAccept(message: ChatMessage) {
    if (!user || !message.suggestedCategoryId || !message.suggestedAmount) return;
    await transactionService.create(user.id, {
      type: 'expense',
      categoryId: message.suggestedCategoryId,
      amount: message.suggestedAmount,
      description: message.suggestedDescription,
      occurredAt: new Date().toISOString(),
    });
    setLoggedIds((previous) => new Set(previous).add(message.id));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(draft);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">AI Assistant</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
          Ask about your spending, budgets, or describe a purchase. Answers use your {formatMonthLabel(month)} totals.
        </p>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card noPadding className="flex h-[580px] flex-col lg:col-span-2">
            <div className="flex items-center gap-3 border-b border-gray-50 px-5 py-3.5 dark:border-white/[0.04]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white dark:bg-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">Campus Coin Assistant</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-primary-accent" />
                  <p className="text-xs text-gray-400 dark:text-text-muted">Gemini · grounded in your monthly totals</p>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.map((message) => (
                <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    message.role === 'user'
                      ? 'rounded-br-sm bg-brand-600 text-white dark:bg-primary'
                      : 'rounded-bl-sm border border-gray-100 bg-gray-50 text-gray-800 dark:border-white/[0.06] dark:bg-surface-elevated dark:text-text-primary',
                  )}>
                    <p>{message.text}</p>
                    {message.suggestedCategoryName && message.suggestedAmount && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:bg-surface dark:text-text-secondary">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          {message.suggestedCategoryName} · {formatCurrency(message.suggestedAmount, DEFAULT_CURRENCY)}
                        </div>
                        {loggedIds.has(message.id) ? (
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-primary-accent">
                            <Check className="h-3.5 w-3.5" /> Logged to your transactions
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleAccept(message)}
                            className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                          >
                            Log this expense
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSending && <div className="flex items-center gap-2 text-xs text-gray-500"><Spinner /> Gemini is thinking...</div>}
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 border-t border-gray-50 p-3 dark:border-white/[0.04]"
            >
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={isSending}
                placeholder="Ask a question or describe a purchase..."
                className={cn(
                  'flex-1 rounded-xl border bg-gray-50 px-4 py-2 text-sm text-gray-900',
                  'border-gray-100 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20',
                  'dark:border-white/[0.08] dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent/70',
                )}
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                aria-label="Send message"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary dark:hover:bg-primary-accent"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </Card>

          <div className="flex flex-col gap-4">
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-text-primary">Quick Questions</h2>
              </div>
              <div className="space-y-1.5">
                {QUICK_QUESTIONS.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => void sendMessage(question)}
                    disabled={isSending}
                    className={cn(
                      'w-full rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50',
                      'border-gray-100 text-gray-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
                      'dark:border-white/5 dark:text-text-secondary dark:hover:border-primary/30 dark:hover:bg-primary/[0.08] dark:hover:text-primary-accent',
                    )}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="border-brand-100 bg-gradient-to-br from-brand-50 to-blue-50 dark:border-primary/15 dark:from-primary/[0.08] dark:to-blue-400/[0.08]">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-primary/20 dark:text-primary-accent">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">Tip</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-gray-500 dark:text-text-secondary">
                    Describe purchases like <em className="not-italic font-medium text-brand-700 dark:text-primary-accent">"Bought lunch - ₦1,200"</em> to get a category suggestion you can confirm before logging.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}