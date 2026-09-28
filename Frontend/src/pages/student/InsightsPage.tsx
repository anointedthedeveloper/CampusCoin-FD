import { useEffect, useState, type FormEvent } from 'react';
import { Bot, Check, MessageSquarePlus, Send, Sparkles, Trash2, Zap } from 'lucide-react';
import { Card, PageSpinner, Spinner } from '@/components/common';
import { aiService, transactionService, categoryService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatMonthLabel } from '@/utils/format';
import { formatNumericInput, normalizeNumericInput } from '@/utils/number';
import { cn } from '@/utils/cn';
import type { Category } from '@/types/category';
import { ApiError } from '@/types/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  suggestedAmount?: number;
  suggestedDescription?: string;
  ai?: { provider: string; model: string };
}

interface PastConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  updatedAt: string;
}

const QUICK_QUESTIONS = [
  "What's my budget this month?",
  'How much have I spent?',
  'Any saving tips for me?',
  'How do I add a transaction?',
];

const WELCOME_MESSAGE_ID = 'welcome';

function welcomeMessage(): ChatMessage {
  return {
    id: WELCOME_MESSAGE_ID,
    role: 'assistant',
    text: "Hi! I'm your Campus Coin Assistant. Ask about your budget or spending, or describe a purchase and I'll suggest a category.",
  };
}

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
  const showLoader = useMinLoadTime(isLoading);
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage()]);
  const [draft, setDraft] = useState('');
  const [purchaseItem, setPurchaseItem] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  const [pastConversations, setPastConversations] = useState<PastConversation[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const historyStorageKey = user ? `campus-coin.ai-history.${user.id}` : null;

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`campus-coin.ai-history.${user.id}`);
    if (stored) {
      try {
        const saved = JSON.parse(stored) as ChatMessage[] | { current: ChatMessage[]; past: PastConversation[] };
        if (Array.isArray(saved)) {
          setMessages(saved.length ? saved : [welcomeMessage()]);
        } else {
          setMessages(saved.current?.length ? saved.current : [welcomeMessage()]);
          setPastConversations(Array.isArray(saved.past) ? saved.past : []);
        }
      } catch {
        localStorage.removeItem(`campus-coin.ai-history.${user.id}`);
      }
    }
    setHistoryLoaded(true);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!historyStorageKey || !historyLoaded) return;
    localStorage.setItem(
      historyStorageKey,
      JSON.stringify({
        current: messages.filter((message) => message.id !== WELCOME_MESSAGE_ID).slice(-100),
        past: pastConversations,
      }),
    );
  }, [historyStorageKey, historyLoaded, messages, pastConversations]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
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
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendMessage(text: string) {
    const trimmedText = text.trim();
    if (!trimmedText || isSending) return;

    const history = messages
      .filter((message) => message.id !== WELCOME_MESSAGE_ID)
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
      const aiResult = await aiService.answer(trimmedText, history);
      const answer = aiResult.answer;
      const looksLikeExpense = /bought|spent|₦|paid|purchase/i.test(trimmedText);
      const lowerText = trimmedText.toLowerCase();
      const expenseCategories = categories.filter((category) => category.type === 'expense');
      const categoryMatch = expenseCategories.find((category) => lowerText.includes(category.name.toLowerCase()))
        ?? expenseCategories.find((category) => /^(other|miscellaneous)/i.test(category.name));
      const amount = parseAmount(trimmedText);

      setMessages((previous) => [...previous, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: answer,
        ai: aiResult.ai,
        ...(looksLikeExpense && categoryMatch && amount ? {
          suggestedCategoryId: categoryMatch.id,
          suggestedCategoryName: categoryMatch.name,
          suggestedAmount: amount,
          suggestedDescription: trimmedText,
        } : {}),
      }]);
    } catch (error) {
      // Surface the server's reason (e.g. "AI answers are not configured on
      // the server", a timeout) instead of one generic line for every failure.
      const reason = error instanceof ApiError && error.status && error.message
        ? error.message
        : 'I could not reach the AI service right now. Please try again shortly.';
      setMessages((previous) => [...previous, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: reason,
      }]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleAccept(message: ChatMessage) {
    if (!user || !message.suggestedCategoryId || !message.suggestedAmount) return;
    try {
      await transactionService.create(user.id, {
        type: 'expense',
        categoryId: message.suggestedCategoryId,
        amount: message.suggestedAmount,
        description: message.suggestedDescription,
        occurredAt: new Date().toISOString(),
        confirmDuplicate: true,
      });
      setLoggedIds((previous) => new Set(previous).add(message.id));
    } catch (error) {
      setMessages((previous) => [...previous, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `I couldn't log that expense: ${error instanceof Error ? error.message : 'please try again.'}`,
      }]);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(draft);
  }

  function handlePurchaseQuestion(event: FormEvent) {
    event.preventDefault();
    const item = purchaseItem.trim();
    const price = Number(purchasePrice);
    if (!item || !Number.isFinite(price) || price <= 0) return;
    setPurchaseItem('');
    setPurchasePrice('');
    void sendMessage(`Can I buy ${item} for ${user?.settings?.currency ?? DEFAULT_CURRENCY} ${price.toLocaleString()}?`);
  }

  function handleNewChat() {
    const currentMessages = messages.filter((message) => message.id !== WELCOME_MESSAGE_ID);
    if (currentMessages.length) {
      setPastConversations((previous) => [
        {
          id: crypto.randomUUID(),
          title: currentMessages.find((message) => message.role === 'user')?.text.slice(0, 48) || 'Campus Coin chat',
          messages: currentMessages,
          updatedAt: new Date().toISOString(),
        },
        ...previous,
      ].slice(0, 20));
    }
    setMessages([welcomeMessage()]);
    setLoggedIds(new Set());
  }

  function handleClearChat() {
    setMessages([]);
    setLoggedIds(new Set());
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">AI Assistant</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
          Ask about your spending, budgets, or describe a purchase. Answers use your {formatMonthLabel(month)} totals.
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-text-muted">
          AI answers and category suggestions are advisory only — review them before acting. They are not certified financial advice.
        </p>
      </div>

      {showLoader ? (
        <PageSpinner label="Loading AI Assistant…" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card noPadding className="flex h-[580px] flex-col lg:col-span-2">
            <div className="flex items-center gap-3 border-b border-gray-50 px-5 py-3.5 dark:border-white/[0.04]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white dark:bg-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">Campus Coin Assistant</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-primary-accent" />
                  <p className="text-xs text-gray-400 dark:text-text-muted">AI · grounded in your monthly totals</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button type="button" onClick={handleNewChat} disabled={isSending} title="New chat" aria-label="New chat" className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:text-text-secondary dark:hover:bg-white/8 dark:hover:text-text-primary">
                  <MessageSquarePlus className="h-4 w-4" />
                </button>
                <button type="button" onClick={handleClearChat} disabled={isSending || messages.length === 0} title="Clear chat" aria-label="Clear chat" className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-text-secondary dark:hover:bg-red-400/10 dark:hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.length === 0 && <p className="py-8 text-center text-sm text-gray-400 dark:text-text-muted">Chat cleared. Start a new conversation below.</p>}
              {messages.map((message) => (
                <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    message.role === 'user'
                      ? 'rounded-br-sm bg-brand-600 text-white dark:bg-primary'
                      : 'rounded-bl-sm border border-gray-100 bg-gray-50 text-gray-800 dark:border-white/[0.06] dark:bg-surface-elevated dark:text-text-primary',
                  )}>
                    <p>{message.text}</p>
                    {message.role === 'assistant' && message.ai && (
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide opacity-60">
                        {message.ai.provider} · {message.ai.model}
                      </p>
                    )}
                    {message.suggestedCategoryName && message.suggestedAmount && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:bg-surface dark:text-text-secondary">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          {message.suggestedCategoryName} · {formatCurrency(message.suggestedAmount, user?.settings?.currency ?? DEFAULT_CURRENCY)}
                        </div>
                        {loggedIds.has(message.id) ? (
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-primary-accent">
                            <Check className="h-3.5 w-3.5" /> Logged to your transactions
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void handleAccept(message)}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-primary dark:hover:bg-primary-accent"
                          >
                            Log this expense
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSending && <div className="flex items-center gap-2 text-xs text-gray-500"><Spinner /> Assistant is thinking...</div>}
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
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-400">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-text-primary">Can I buy...?</h2>
              </div>
              <form onSubmit={handlePurchaseQuestion} className="space-y-2.5">
                <input
                  value={purchaseItem}
                  onChange={(event) => setPurchaseItem(event.target.value)}
                  disabled={isSending}
                  required
                  maxLength={120}
                  placeholder="What do you want to buy?"
                  aria-label="Item you want to buy"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-surface dark:text-text-primary"
                />
                <div className="flex gap-2">
                  <span className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 dark:border-white/10 dark:bg-surface dark:text-text-muted">{user?.settings?.currency ?? DEFAULT_CURRENCY}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatNumericInput(purchasePrice)}
                    onChange={(event) => setPurchasePrice(normalizeNumericInput(event.target.value))}
                    disabled={isSending}
                    required
                    placeholder="Price"
                    aria-label="Price"
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-surface dark:text-text-primary"
                  />
                </div>
                <button type="submit" disabled={isSending || !purchaseItem.trim() || !purchasePrice || Number(purchasePrice) <= 0} className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary dark:hover:bg-primary-accent">
                  Ask about this purchase
                </button>
              </form>
            </Card>
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
            {pastConversations.length > 0 && (
              <Card>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-text-primary">Past conversations</h2>
                  <span className="text-xs text-gray-400 dark:text-text-muted">{pastConversations.length}</span>
                </div>
                <div className="space-y-1.5">
                  {pastConversations.slice(0, 5).map((conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => setMessages(conversation.messages)}
                      className="w-full truncate rounded-lg border border-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:border-white/5 dark:text-text-secondary dark:hover:border-primary/30 dark:hover:bg-primary/[0.08] dark:hover:text-primary-accent"
                    >
                      {conversation.title}
                    </button>
                  ))}
                </div>
              </Card>
            )}

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