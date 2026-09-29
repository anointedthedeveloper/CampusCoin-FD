import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bot,
  CalendarClock,
  ChevronDown,
  History,
  MessageSquarePlus,
  PiggyBank,
  Receipt,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Table2,
  Target,
  Trash2,
  Wallet,
  Wand2,
  Zap,
} from 'lucide-react';
import { Card, ConfirmDialog, Markdown, PageSpinner, Spinner } from '@/components/common';
import { AiActionCards } from '@/components/insights/AiActionCard';
import { aiApi, type AIAction, type AIConversationSummary, type AITemplate } from '@/api/ai.api';
import { useAuth } from '@/hooks/useAuth';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate, formatMonthLabel } from '@/utils/format';
import { formatNumericInput, normalizeNumericInput } from '@/utils/number';
import { cn } from '@/utils/cn';
import { ApiError } from '@/types/api';

interface ChatMessage {
  id: string;
  /** Server id of the stored message (needed to approve its actions). */
  serverId?: string;
  role: 'user' | 'assistant';
  text: string;
  ai?: { provider: string; model: string };
  actions?: AIAction[];
}

const STARTERS = [
  { icon: Receipt, title: 'Log something', prompt: 'I spent ₦1,500 on lunch today', hint: 'The assistant prepares it — you approve' },
  { icon: Wallet, title: 'Set a budget', prompt: 'Set my Food budget to ₦20,000 this month', hint: 'Creates or updates the budget' },
  { icon: Target, title: 'Start a goal', prompt: 'Create a savings goal for a laptop of ₦300,000', hint: 'Adds it to Savings Goals' },
  { icon: Table2, title: 'See a table', prompt: 'Show my spending by category this month as a table with amounts and percentages.', hint: 'Answers from your own numbers' },
];

const QUICK_QUESTIONS = [
  "What's my budget status this month?",
  'Where did my money go this month?',
  'Any saving tips for me?',
  'Compare this month with last month',
];

const TABLE_PROMPTS = [
  { label: 'Spending by category', prompt: 'Show my spending by category this month as a table with amounts and percentages.' },
  { label: 'This month vs last month', prompt: 'Compare this month with last month in a table: income, expenses, net and the biggest category changes.' },
  { label: 'Budget status table', prompt: 'Show all my budgets in a table: category, limit, spent, remaining and status.' },
  { label: 'Weekly savings plan', prompt: 'Make a weekly savings plan table for the rest of this month that helps me reach my savings goal.' },
];

const DO_IT_PROMPTS = [
  'Add ₦50,000 allowance income today',
  'I paid ₦1,200 for a Bolt ride yesterday',
  'Save ₦5,000 to my laptop goal',
  'Delete my last transaction',
];

const FOLLOW_UPS = ['Show that as a table', 'How can I cut back?', 'Compare with last month'];

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/10 dark:bg-surface dark:text-text-primary dark:placeholder:text-text-muted';

export function InsightsPage() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const currency = user?.settings?.currency ?? DEFAULT_CURRENCY;
  const month = new Date().toISOString().slice(0, 7);
  const firstName = user?.fullName?.split(' ')[0] ?? 'there';

  const [conversations, setConversations] = useState<AIConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpeningChat, setIsOpeningChat] = useState(false);
  const showLoader = useMinLoadTime(isLoading);
  const [isSending, setIsSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [template, setTemplate] = useState<'afford' | 'when-afford'>('afford');
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [targetMonths, setTargetMonths] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialQuestionHandled = useRef(false);

  useEffect(() => {
    if (!user) { setIsLoading(false); return; }
    let cancelled = false;
    aiApi.listConversations()
      .then((convs) => { if (!cancelled) setConversations(convs); })
      .catch(() => undefined)
      .finally(() => { if (!cancelled) setIsLoading(false); });
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

  // Grow the composer with its content (up to ~5 lines).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft]);

  async function refreshConversations() {
    setConversations(await aiApi.listConversations().catch(() => conversations));
  }

  async function openConversation(id: string) {
    setIsOpeningChat(true);
    setIsHistoryOpen(false);
    try {
      const conv = await aiApi.getConversation(id);
      setConversationId(conv.id);
      setMessages(conv.messages.map((m) => ({ id: m.id, serverId: m.id, role: m.role, text: m.text, ai: m.ai, actions: m.actions })));
    } catch {
      setMessages([{ id: crypto.randomUUID(), role: 'assistant', text: 'That conversation could not be opened.' }]);
    } finally {
      setIsOpeningChat(false);
    }
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    setIsHistoryOpen(false);
    inputRef.current?.focus();
  }

  async function deleteConversation(id: string) {
    await aiApi.deleteConversation(id).catch(() => undefined);
    if (id === conversationId) startNewChat();
    void refreshConversations();
  }

  async function sendMessage(text: string, aiTemplate?: AITemplate) {
    const trimmedText = text.trim();
    if (!trimmedText || isSending) return;
    setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'user', text: trimmedText }]);
    setDraft('');
    setIsSending(true);
    try {
      const result = await aiApi.answer(trimmedText, { conversationId: conversationId ?? undefined, template: aiTemplate });
      setMessages((previous) => [...previous, {
        id: result.messageId ?? crypto.randomUUID(),
        serverId: result.messageId,
        role: 'assistant',
        text: result.answer,
        ai: result.ai,
        actions: result.actions?.length ? result.actions : undefined,
      }]);
      if (result.conversationId && result.conversationId !== conversationId) setConversationId(result.conversationId);
      void refreshConversations();
    } catch (error) {
      const reason = error instanceof ApiError && error.status && error.message
        ? error.message
        : 'I could not reach the assistant right now. Please try again shortly.';
      setMessages((previous) => [...previous, { id: crypto.randomUUID(), role: 'assistant', text: reason }]);
    } finally {
      setIsSending(false);
    }
  }

  function updateActions(messageId: string, next: AIAction[]) {
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId || !m.actions) return m;
      const byId = new Map(next.map((a) => [a.id, a]));
      return { ...m, actions: m.actions.map((a) => byId.get(a.id) ?? a) };
    }));
  }

  async function afterChange(applied: AIAction[]) {
    // Profile edits change the signed-in user (allowance, goal).
    if (applied.some((a) => a.kind === 'update_profile' && a.status === 'applied')) await refreshUser().catch(() => undefined);
  }

  function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    void sendMessage(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
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
    setItemName(''); setItemPrice(''); setTargetMonths('');
  }

  const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;

  const historyList = (
    <div className="space-y-1">
      {conversations.length === 0 ? (
        <p className="px-1 py-2 text-xs text-gray-400 dark:text-text-muted">Your saved chats will appear here.</p>
      ) : conversations.map((conv) => (
        <div key={conv.id} className={cn('group flex items-center gap-1 rounded-lg border px-2.5 py-2 transition-colors', conv.id === conversationId ? 'border-brand-200 bg-brand-50 dark:border-primary/30 dark:bg-primary/10' : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/[0.04]')}>
          <button type="button" onClick={() => void openConversation(conv.id)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-semibold text-gray-800 dark:text-text-primary">{conv.title}</p>
            <p className="truncate text-[11px] text-gray-400 dark:text-text-muted">{formatDate(conv.updatedAt)} · {conv.messageCount} messages</p>
          </button>
          <button type="button" onClick={() => void deleteConversation(conv.id)} aria-label={`Delete chat ${conv.title}`} className="shrink-0 rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-950 via-[#0f3a23] to-brand-800 px-5 py-5 text-white shadow-card sm:px-7">
        <div className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-brand-400/20 blur-2xl" aria-hidden="true" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20"><Bot className="h-5 w-5" /></span>
            <div>
              <h1 className="text-xl font-bold sm:text-2xl">AI Assistant</h1>
              <p className="text-sm text-emerald-100/80">Ask about your money, or tell it what to add — using your {formatMonthLabel(month)} numbers.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {[
              { icon: Sparkles, text: 'Answers from your records' },
              { icon: Wand2, text: 'Makes changes you approve' },
              { icon: Table2, text: 'Tables & plans' },
            ].map(({ icon: Icon, text }) => (
              <span key={text} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 font-medium ring-1 ring-white/15"><Icon className="h-3.5 w-3.5" /> {text}</span>
            ))}
          </div>
        </div>
      </div>

      {confirmClear && (
        <ConfirmDialog
          open
          title="Clear all chat history?"
          description="Every saved conversation will be deleted. Changes you already approved stay saved."
          confirmLabel="Clear history"
          onConfirm={async () => { await aiApi.clearConversations(); startNewChat(); setConversations([]); }}
          onClose={() => setConfirmClear(false)}
        />
      )}

      {showLoader ? (
        <PageSpinner label="Loading AI Assistant…" />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[15rem_minmax(0,1fr)_19rem]">
          {/* History — sidebar on wide screens */}
          <Card className="hidden h-fit xl:block">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-text-primary"><History className="h-4 w-4" /> Chats</h2>
              <div className="flex items-center gap-2">
                {conversations.length > 0 && <button type="button" onClick={() => setConfirmClear(true)} className="text-[11px] font-semibold text-gray-400 hover:text-red-600 dark:text-text-muted">Clear</button>}
                <button type="button" onClick={startNewChat} className="rounded-md p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10" aria-label="New chat" title="New chat"><MessageSquarePlus className="h-4 w-4" /></button>
              </div>
            </div>
            {historyList}
          </Card>

          {/* Chat */}
          <Card noPadding className="flex h-[min(680px,calc(100dvh-16rem))] min-h-[460px] flex-col overflow-hidden">
            <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/[0.06] sm:px-5">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white dark:bg-primary">
                <Bot className="h-4 w-4" />
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-surface-elevated" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">{conversations.find((c) => c.id === conversationId)?.title ?? 'New chat'}</p>
                <p className="text-xs text-gray-400 dark:text-text-muted">Chats are saved · nothing changes until you approve</p>
              </div>
              <button type="button" onClick={() => setIsHistoryOpen((o) => !o)} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 dark:text-text-secondary dark:hover:bg-white/[0.08] xl:hidden" aria-expanded={isHistoryOpen}>
                <History className="h-4 w-4" /> <span className="hidden sm:inline">History</span>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isHistoryOpen && 'rotate-180')} />
              </button>
              <button type="button" onClick={startNewChat} disabled={isSending} title="New chat" aria-label="New chat" className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50 dark:text-text-secondary dark:hover:bg-white/[0.08] dark:hover:text-text-primary">
                <MessageSquarePlus className="h-4 w-4" />
              </button>
            </div>

            {isHistoryOpen && <div className="max-h-56 overflow-y-auto border-b border-gray-100 px-3 py-2 dark:border-white/[0.06] xl:hidden">{historyList}</div>}

            <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-b from-gray-50/60 to-white px-4 py-5 dark:from-transparent dark:to-transparent sm:px-5">
              {isOpeningChat ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : messages.length === 0 ? (
                <div className="mx-auto flex max-w-xl flex-col items-center py-4 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-primary/15 dark:text-primary-accent"><Sparkles className="h-6 w-6" /></span>
                  <h2 className="mt-3 text-lg font-bold text-gray-900 dark:text-text-primary">Hi {firstName}, how can I help?</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">Ask a question about your money, or just say what happened — “I spent ₦1,500 on lunch” — and I’ll prepare it for you to approve.</p>
                  <div className="mt-5 grid w-full gap-2 sm:grid-cols-2">
                    {STARTERS.map(({ icon: Icon, title, prompt, hint }) => (
                      <button key={title} type="button" onClick={() => void sendMessage(prompt)} className="group rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:-translate-y-px hover:border-brand-300 hover:shadow-sm dark:border-white/10 dark:bg-surface dark:hover:border-primary/40">
                        <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-text-primary"><Icon className="h-4 w-4 text-brand-600 dark:text-primary-accent" /> {title}</span>
                        <span className="mt-1 block text-xs text-gray-600 dark:text-text-secondary">“{prompt}”</span>
                        <span className="mt-1 block text-[11px] text-gray-400 dark:text-text-muted">{hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : messages.map((message) => (
                <div key={message.id} className={cn('flex gap-2.5', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {message.role === 'assistant' && (
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white dark:bg-primary"><Bot className="h-3.5 w-3.5" /></span>
                  )}
                  <div className={cn('flex min-w-0 flex-col', message.role === 'user' ? 'max-w-[85%] items-end' : 'max-w-[92%] items-start sm:max-w-[85%]')}>
                    <div className={cn(
                      'rounded-2xl px-4 py-2.5',
                      message.role === 'user'
                        ? 'rounded-br-md bg-brand-600 text-sm text-white shadow-sm dark:bg-primary'
                        : 'rounded-tl-md border border-gray-100 bg-white text-gray-800 shadow-sm dark:border-white/[0.06] dark:bg-surface-elevated dark:text-text-primary',
                    )}>
                      {message.role === 'user' ? <p className="whitespace-pre-wrap">{message.text}</p> : <Markdown>{message.text}</Markdown>}
                      {message.role === 'assistant' && message.ai && (
                        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide opacity-50">{message.ai.provider} · {message.ai.model}</p>
                      )}
                    </div>
                    {message.actions && message.serverId && conversationId && (
                      <div className="w-full max-w-md">
                        <AiActionCards
                          actions={message.actions}
                          onApply={async (action) => {
                            const updated = await aiApi.applyAction(conversationId, message.serverId!, action.id);
                            updateActions(message.id, [updated]);
                            await afterChange([updated]);
                          }}
                          onReject={async (action) => {
                            const updated = await aiApi.rejectAction(conversationId, message.serverId!, action.id);
                            updateActions(message.id, [updated]);
                          }}
                          onApplyAll={async () => {
                            const updated = await aiApi.applyAllActions(conversationId, message.serverId!);
                            updateActions(message.id, updated);
                            await afterChange(updated);
                          }}
                        />
                      </div>
                    )}
                    {message.id === lastAssistantId && !isSending && !message.actions && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {FOLLOW_UPS.map((q) => (
                          <button key={q} type="button" onClick={() => void sendMessage(q)} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-surface dark:text-text-secondary dark:hover:border-primary/40 dark:hover:text-primary-accent">{q}</button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isSending && (
                <div className="flex items-center gap-2.5">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white dark:bg-primary"><Bot className="h-3.5 w-3.5" /></span>
                  <span className="inline-flex items-center gap-1 rounded-2xl border border-gray-100 bg-white px-4 py-3 dark:border-white/[0.06] dark:bg-surface-elevated" aria-label="Assistant is thinking">
                    {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: `${i * 120}ms` }} />)}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="border-t border-gray-100 p-3 dark:border-white/[0.06]">
              <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-white p-1.5 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-400/20 dark:border-white/10 dark:bg-surface">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  maxLength={1200}
                  placeholder="Ask a question, or say what you spent or earned…"
                  aria-label="Message"
                  className="max-h-36 min-h-[40px] flex-1 resize-none bg-transparent px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-text-primary dark:placeholder:text-text-muted"
                />
                <button type="submit" disabled={isSending || !draft.trim()} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary dark:hover:bg-primary-accent">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 flex items-center gap-1 px-1 text-[11px] text-gray-400 dark:text-text-muted">
                <ShieldCheck className="h-3 w-3" /> Suggestions are advisory, not financial advice. Enter to send, Shift+Enter for a new line.
              </p>
            </form>
          </Card>

          {/* Tools */}
          <div className="flex flex-col gap-4">
            <Card>
              <div className="mb-3 inline-flex w-full rounded-lg bg-gray-100 p-1 dark:bg-white/[0.06]" role="tablist">
                {([
                  { id: 'afford', label: 'Can I afford?', icon: ShoppingBag },
                  { id: 'when-afford', label: 'When can I?', icon: CalendarClock },
                ] as const).map(({ id, label, icon: Icon }) => (
                  <button key={id} type="button" role="tab" aria-selected={template === id} onClick={() => setTemplate(id)} className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold transition-colors', template === id ? 'bg-white text-gray-900 shadow-sm dark:bg-surface-elevated dark:text-text-primary' : 'text-gray-500 dark:text-text-muted')}>
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
              <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-text-primary"><Wand2 className="h-4 w-4 text-brand-600 dark:text-primary-accent" /> Do it for me</h2>
              <div className="space-y-1.5">
                {DO_IT_PROMPTS.map((p) => (
                  <button key={p} type="button" onClick={() => void sendMessage(p)} disabled={isSending} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 dark:border-white/[0.06] dark:text-text-secondary dark:hover:border-primary/30 dark:hover:bg-primary/[0.08] dark:hover:text-primary-accent">“{p}”</button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-gray-400 dark:text-text-muted">You’ll always see exactly what will change before anything is saved.</p>
            </Card>

            <Card>
              <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-text-primary"><Table2 className="h-4 w-4 text-purple-500" /> Tables &amp; summaries</h2>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
                {TABLE_PROMPTS.map((t) => (
                  <button key={t.label} type="button" onClick={() => void sendMessage(t.prompt)} disabled={isSending} className="rounded-lg border border-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 dark:border-white/[0.06] dark:text-text-secondary dark:hover:border-primary/30 dark:hover:bg-primary/[0.08] dark:hover:text-primary-accent">{t.label}</button>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-text-primary"><Zap className="h-4 w-4 text-amber-500" /> Quick questions</h2>
              <div className="space-y-1.5">
                {QUICK_QUESTIONS.map((question) => (
                  <button key={question} type="button" onClick={() => void sendMessage(question)} disabled={isSending} className="w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-700 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 dark:border-white/[0.06] dark:text-text-secondary dark:hover:border-primary/30 dark:hover:bg-primary/[0.08] dark:hover:text-primary-accent">{question}</button>
                ))}
              </div>
              <p className="mt-2 flex items-center gap-1 text-[11px] text-gray-400 dark:text-text-muted"><PiggyBank className="h-3 w-3" /> Tip: ask for any answer “as a table”.</p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
