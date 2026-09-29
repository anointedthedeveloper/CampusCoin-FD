import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bot,
  CalendarClock,
  Check,
  ChevronDown,
  History,
  MessageSquarePlus,
  Send,
  ShoppingBag,
  Sparkles,
  Table2,
  Trash2,
  Zap,
} from 'lucide-react';
import { Card, ConfirmDialog, Markdown, PageSpinner, Spinner } from '@/components/common';
import { aiApi, type AIConversationSummary, type AITemplate } from '@/api/ai.api';
import { transactionService, categoryService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate, formatMonthLabel } from '@/utils/format';
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

const QUICK_QUESTIONS = [
  "What's my budget status this month?",
  'Where did my money go this month?',
  'Any saving tips for me?',
  'How do I add a transaction?',
];

const TABLE_PROMPTS = [
  { label: 'Spending by category', prompt: 'Show my spending by category this month as a table with amounts and percentages.' },
  { label: 'This month vs last month', prompt: 'Compare this month with last month in a table: income, expenses, net and the biggest category changes.' },
  { label: 'Budget status table', prompt: 'Show all my budgets in a table: category, limit, spent, remaining and status.' },
  { label: 'Weekly savings plan', prompt: 'Make a weekly savings plan table for the rest of this month that helps me reach my savings goal.' },
];

const FOLLOW_UPS = ['Show that as a table', 'How can I cut back?', 'Compare with last month'];

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  text: "Hi! I'm your **Campus Coin Assistant**. Ask about your budget or spending, use a template on the right, or describe a purchase and I'll suggest a category.",
};

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted';

function parseAmount(text: string): number | undefined {
  const match = text.replace(/,/g, '').match(/₦?\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
}

export function InsightsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currency = user?.settings?.currency ?? DEFAULT_CURRENCY;
  const month = new Date().toISOString().slice(0, 7);

  const [categories, setCategories] = useState<Category[]>([]);
  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const showLoader = useMinLoadTime(isLoading);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [template, setTemplate] = useState<'afford' | 'when-afford'>('afford');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [targetMonths, setTargetMonths] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialQuestionHandled = useRef(false);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    Promise.allSettled([categoryService.list(user.id), aiApi.listConversations()]).then(([cats, convs]) => {
      if (cancelled) return;
      setCategories(cats.status === 'fulfilled' ? cats.value : []);
      setConversations(convs.status === 'fulfilled' ? convs.value : []);
      setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deep links from the dashboard: ?c=<conversationId> or ?q=<question>
  useEffect(() => {
    if (isLoading || initialQuestionHandled.current) return;
    initialQuestionHandled.current = true;
    const c = searchParams.get('c');
    const q = searchParams.get('q');
    if (c) void openConversation(c);
    else if (q) void sendMessage(q);
    if (c || q) setSearchParams({}, { replace: true });
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isSending]);

  async function refreshConversations() {
    setConversations(await aiApi.listConversations().catch(() => conversations));
  }

  async function openConversation(id: string) {
    setIsOpeningChat(true);
    setIsHistoryOpen(false);
    try {
      const conv = await aiApi.getConversation(id);
      setConversationId(conv.id);
      setMessages(conv.messages.length ? conv.messages.map((m) => ({ id: m.id, role: m.role, text: m.text, ai: m.ai })) : [WELCOME]);
      setLoggedIds(new Set());
    } catch {
      setMessages([WELCOME, { id: crypto.randomUUID(), role: 'assistant', text: 'That conversation could not be opened.' }]);
    } finally {
      setIsOpeningChat(false);
    }
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([WELCOME]);
    setLoggedIds(new Set());
    setIsHistoryOpen(false);
  }

  async function deleteConversation(id: string) {
    await aiApi.deleteConversation(id).catch(() => undefined);
    if (id === conversationId) startNewChat();
    void refreshConversations();
  }

  async function sendMessage(text: string, aiTemplate?: AITemplate) {
    const trimmedText = text.trim();
    if (!trimmedText || isSending) return;

    setMessages((previous) => [...previous.filter((m) => m.id !== 'welcome' || previous.length > 1), { id: crypto.randomUUID(), role: 'user', text: trimmedText }]);
    setDraft('');
    setIsSending(true);

    try {
      const result = await aiApi.answer(trimmedText, { conversationId: conversationId ?? undefined, template: aiTemplate });
      const looksLikeExpense = !aiTemplate && /bought|spent|₦|paid|purchase/i.test(trimmedText);
      const lowerText = trimmedText.toLowerCase();
      const expenseCategories = categories.filter((category) => category.type === 'expense');
      const categoryMatch = expenseCategories.find((category) => lowerText.includes(category.name.toLowerCase()))
        ?? expenseCategories.find((category) => /^(other|miscellaneous)/i.test(category.name));
      const amount = parseAmount(trimmedText);

      setMessages((previous) => [...previous, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: result.answer,
        ai: result.ai,
        ...(looksLikeExpense && categoryMatch && amount ? {
          suggestedCategoryId: categoryMatch.id,
          suggestedCategoryName: categoryMatch.name,
          suggestedAmount: amount,
          suggestedDescription: trimmedText,
        } : {}),
      }]);
      if (result.conversationId && result.conversationId !== conversationId) {
        setConversationId(result.conversationId);
      }
      void refreshConversations();
    } catch (error) {
      const reason = error instanceof ApiError && error.status && error.message
        ? error.message
        : 'I could not reach the AI service right now. Please try again shortly.';
      setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'assistant', text: reason }]);
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

  function handleTemplate(event: FormEvent) {
    event.preventDefault();
    const item = itemName.trim() || 'this item';
    const price = Number(itemPrice);
    if (!Number.isFinite(price) || price <= 0) return;
    const months = Number(targetMonths);
    const priceLabel = formatCurrency(price, currency);
    if (template === 'afford') {
      void sendMessage(`Can I afford ${item} for ${priceLabel} right now?`, { kind: 'afford', amount: price, itemName: item });
    } else {
      void sendMessage(
        months > 0 ? `Can I afford ${item} (${priceLabel}) in ${months} month(s)? When could I afford it?` : `When can I afford ${item} for ${priceLabel}?`,
        { kind: 'when-afford', amount: price, itemName: item, targetMonths: months > 0 ? months : undefined },
      );
    }
    setItemName('');
    setItemPrice('');
    setTargetMonths('');
  }

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant' && m.id !== 'welcome')?.id;

  const historyList = (
    <div className="space-y-1">
      {conversations.length === 0 ? (
        <p className="px-1 py-2 text-xs text-gray-400 dark:text-text-muted">Your saved chats will appear here.</p>
      ) : (
        conversations.map((conv) => (
          <div
            key={conv.id}
            className={cn(
              'group flex items-center gap-1 rounded-lg border px-2.5 py-2 transition-colors',
              conv.id === conversationId
                ? 'border-brand-200 bg-brand-50 dark:border-primary/30 dark:bg-primary/10'
                : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.04]',
            )}
          >
            <button type="button" onClick={() => void openConversation(conv.id)} className="min-w-0 flex-1 text-left">
              <p className="truncate text-xs font-semibold text-gray-800 dark:text-text-primary">{conv.title}</p>
              <p className="truncate text-[11px] text-gray-400 dark:text-text-muted">{formatDate(conv.updatedAt)} · {conv.messageCount} messages</p>
            </button>
            <button
              type="button"
              onClick={() => void deleteConversation(conv.id)}
              aria-label={`Delete chat ${conv.title}`}
              className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">AI Assistant</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
            Ask about your spending, budgets, or a purchase. Answers use your {formatMonthLabel(month)} numbers.
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-text-muted">
            AI answers and suggestions are advisory only — review them before acting. They are not certified financial advice.
          </p>
        </div>
      </div>

      {confirmClear && (
        <ConfirmDialog
          open
          title="Clear all chat history?"
          description="Every saved conversation will be deleted. This cannot be undone."
          confirmLabel="Clear history"
          onConfirm={async () => {
            await aiApi.clearConversations();
            startNewChat();
            setConversations([]);
          }}
          onClose={() => setConfirmClear(false)}
        />
      )}

      {showLoader ? (
        <PageSpinner label="Loading AI Assistant…" />
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[15rem_minmax(0,1fr)_19rem] lg:grid-cols-[minmax(0,1fr)_19rem]">
          {/* History — sidebar on wide screens */}
          <Card className="hidden h-fit xl:block">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-text-primary"><History className="h-4 w-4" /> Chat history</h2>
              {conversations.length > 0 && (
                <button type="button" onClick={() => setConfirmClear(true)} className="text-[11px] font-semibold text-gray-400 hover:text-red-600 dark:text-text-muted">Clear</button>
              )}
            </div>
            {historyList}
          </Card>

          {/* Chat */}
          <Card noPadding className="flex h-[min(640px,calc(100dvh-13rem))] min-h-[420px] flex-col">
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white dark:bg-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">
                  {conversations.find((c) => c.id === conversationId)?.title ?? 'Campus Coin Assistant'}
                </p>
                <p className="text-xs text-gray-400 dark:text-text-muted">Grounded in your own records · chats are saved</p>
              </div>
              <button type="button" onClick={() => setIsHistoryOpen((o) => !o)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-text-secondary dark:hover:bg-white/[0.08] xl:hidden" aria-expanded={isHistoryOpen}>
                <History className="h-4 w-4" /> <span className="hidden sm:inline">History</span>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isHistoryOpen && 'rotate-180')} />
              </button>
              <button type="button" onClick={startNewChat} disabled={isSending} title="New chat" aria-label="New chat" className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:text-text-secondary dark:hover:bg-white/[0.08] dark:hover:text-text-primary">
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </div>

            {isHistoryOpen && (
              <div className="max-h-56 overflow-y-auto border-b border-gray-100 px-3 py-2 dark:border-white/[0.06] xl:hidden">
                {historyList}
              </div>
            )}

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              {isOpeningChat ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : messages.map((message) => (
                <div key={message.id} className={cn('flex flex-col', message.role === 'user' ? 'items-end' : 'items-start')}>
                  <div className={cn(
                    'max-w-[92%] rounded-2xl px-4 py-2.5 sm:max-w-[85%]',
                    message.role === 'user'
                      ? 'rounded-br-sm bg-brand-600 text-sm text-white dark:bg-primary'
                      : 'rounded-bl-sm border border-gray-100 bg-gray-50 text-gray-800 dark:border-white/[0.06] dark:bg-surface-elevated dark:text-text-primary',
                  )}>
                    {message.role === 'user' ? <p className="whitespace-pre-wrap">{message.text}</p> : <Markdown>{message.text}</Markdown>}
                    {message.role === 'assistant' && message.ai && (
                      <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide opacity-50">{message.ai.provider} · {message.ai.model}</p>
                    )}
                    {message.suggestedCategoryName && message.suggestedAmount && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:bg-surface dark:text-text-secondary">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          {message.suggestedCategoryName} · {formatCurrency(message.suggestedAmount, currency)}
                        </div>
                        {loggedIds.has(message.id) ? (
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-700 dark:text-primary-accent"><Check className="h-3.5 w-3.5" /> Logged to your transactions</p>
                        ) : (
                          <button type="button" onClick={() => void handleAccept(message)} className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 dark:bg-primary dark:hover:bg-primary-accent">
                            Log this expense
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {message.id === lastAssistantId && !isSending && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {FOLLOW_UPS.map((q) => (
                        <button key={q} type="button" onClick={() => void sendMessage(q)} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-surface dark:text-text-secondary dark:hover:border-primary/40 dark:hover:text-primary-accent">
                          {q}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {isSending && <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-text-muted"><Spinner size="sm" /> Assistant is thinking…</div>}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-100 p-3 dark:border-white/[0.06]">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                disabled={isSending}
                maxLength={1200}
                placeholder="Ask a question or describe a purchase…"
                aria-label="Message"
                className={cn(inputCls, 'flex-1 rounded-xl bg-gray-50 px-4 dark:bg-surface')}
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary dark:hover:bg-primary-accent"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </Card>

          {/* Templates */}
          <div className="flex flex-col gap-4">
            <Card>
              <div className="mb-3 inline-flex w-full rounded-lg bg-gray-100 p-1 dark:bg-white/[0.06]" role="tablist">
                {([
                  { id: 'afford', label: 'Can I afford?', icon: ShoppingBag },
                  { id: 'when-afford', label: 'When can I?', icon: CalendarClock },
                ] as const).map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={template === id}
                    onClick={() => setTemplate(id)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors',
                      template === id ? 'bg-white text-gray-900 shadow-sm dark:bg-surface-elevated dark:text-text-primary' : 'text-gray-500 dark:text-text-muted',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
              <form onSubmit={handleTemplate} className="space-y-2.5">
                <input value={itemName} onChange={(e) => setItemName(e.target.value)} disabled={isSending} maxLength={80} placeholder="What do you want to buy?" aria-label="Item" className={inputCls} />
                <div className="flex gap-2">
                  <span className="flex h-10 shrink-0 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-text-muted">{currency}</span>
                  <input type="text" inputMode="decimal" required value={formatNumericInput(itemPrice)} onChange={(e) => setItemPrice(normalizeNumericInput(e.target.value))} disabled={isSending} placeholder="Price" aria-label="Price" className={cn(inputCls, 'min-w-0 flex-1')} />
                </div>
                {template === 'when-afford' && (
                  <input type="number" min={1} max={60} value={targetMonths} onChange={(e) => setTargetMonths(e.target.value)} disabled={isSending} placeholder="Target months (optional)" aria-label="Target months" className={inputCls} />
                )}
                <button type="submit" disabled={isSending || !itemPrice || Number(itemPrice) <= 0} className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary dark:hover:bg-primary-accent">
                  {template === 'afford' ? 'Check affordability' : 'Work out when'}
                </button>
                <p className="text-[11px] text-gray-400 dark:text-text-muted">Uses your average monthly surplus from recent months.</p>
              </form>
            </Card>

            <Card>
              <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-text-primary">
                <Table2 className="h-4 w-4 text-purple-500" /> Tables &amp; summaries
              </h2>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                {TABLE_PROMPTS.map((t) => (
                  <button key={t.label} type="button" onClick={() => void sendMessage(t.prompt)} disabled={isSending} className="rounded-lg border border-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 dark:border-white/[0.06] dark:text-text-secondary dark:hover:border-primary/30 dark:hover:bg-primary/[0.08] dark:hover:text-primary-accent">
                    {t.label}
                  </button>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-text-primary">
                <Zap className="h-4 w-4 text-amber-500" /> Quick questions
              </h2>
              <div className="space-y-1.5">
                {QUICK_QUESTIONS.map((question) => (
                  <button key={question} type="button" onClick={() => void sendMessage(question)} disabled={isSending} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 dark:border-white/[0.06] dark:text-text-secondary dark:hover:border-primary/30 dark:hover:bg-primary/[0.08] dark:hover:text-primary-accent">
                    {question}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
