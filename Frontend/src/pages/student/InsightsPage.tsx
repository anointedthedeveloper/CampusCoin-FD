import { useEffect, useState } from 'react';
import { Bot, Check, Send, Sparkles, Zap } from 'lucide-react';
import { Card, PageSpinner } from '@/components/common';
import { transactionService, categoryService, budgetService, tipsService } from '@/services';
import { reportsApi } from '@/api/reports.api';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatMonthLabel } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Category } from '@/types/category';
import type { BudgetSummary } from '@/types/budget';
import type { MonthlyReport } from '@/types/report';
import type { SavingTip } from '@/types/insight';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  suggestedCategoryId?: string;
  suggestedCategoryName?: string;
  suggestedAmount?: number;
}

const QUICK_QUESTIONS = [
  "What's my budget this month?",
  'How much have I spent?',
  'Any saving tips for me?',
  'How do I add a transaction?',
];

function monthKey() { return new Date().toISOString().slice(0, 7); }

function parseAmount(text: string): number | undefined {
  const m = text.replace(/,/g, '').match(/₦?\s*(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : undefined;
}

interface PageData {
  categories: Category[];
  budgetSummary: BudgetSummary | null;
  report: MonthlyReport | null;
  tips: SavingTip[];
}

export function InsightsPage() {
  const { user }   = useAuth();
  const month      = monthKey();
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages]   = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'assistant',
    text: "Hi! I'm your Campus Coin Assistant. Ask me about your budget, spending, or describe a purchase and I'll suggest a category to log it under.",
  }]);
  const [draft, setDraft]         = useState('');
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      const [cats, budSum, report, tips] = await Promise.allSettled([
        categoryService.list(user!.id),
        budgetService.summary(user!.id, month),
        reportsApi.getMonthlyReport({ month }),
        tipsService.list(user!.id, month),
      ]);
      if (cancelled) return;
      setPageData({
        categories:   cats.status === 'fulfilled' ? cats.value : [],
        budgetSummary: budSum.status === 'fulfilled' ? budSum.value : null,
        report:        report.status === 'fulfilled' ? report.value : null,
        tips:          tips.status === 'fulfilled' ? tips.value : [],
      });
      setIsLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, month]);

  function buildQuickAnswer(question: string): string {
    if (!pageData) return 'Still loading your data…';
    const { budgetSummary, report, tips, categories } = pageData;

    if (/add.*transaction|how do i add/i.test(question)) {
      return 'Tap "Add Transaction" in the sidebar (or the ＋ button on your dashboard), choose Income or Expense, pick a category, enter the amount and date, then hit Save.';
    }
    if (/budget/i.test(question)) {
      if (!budgetSummary || budgetSummary.budgets.length === 0)
        return "You haven't set any budgets for this month yet. Head to the Budgets page to set one.";
      const top = [...budgetSummary.budgets].sort((a, b) => b.spentAmount - a.spentAmount)[0];
      const topName = categories.find((c) => c.id === top.categoryId)?.name ?? 'a category';
      return `You've budgeted ${formatCurrency(budgetSummary.totalBudgeted, DEFAULT_CURRENCY)} across ${budgetSummary.budgets.length} categor${budgetSummary.budgets.length === 1 ? 'y' : 'ies'} this month, spending ${formatCurrency(budgetSummary.totalSpent, DEFAULT_CURRENCY)} so far. Biggest category: ${topName}.`;
    }
    if (/spent|spending/i.test(question)) {
      if (!report) return "You haven't logged any transactions this month yet.";
      return `You've spent ${formatCurrency(report.totalExpense, DEFAULT_CURRENCY)} and earned ${formatCurrency(report.totalIncome, DEFAULT_CURRENCY)} this month — net savings: ${formatCurrency(report.netSavings, DEFAULT_CURRENCY)}.`;
    }
    if (/tip/i.test(question)) {
      if (tips.length === 0) return 'No specific tips right now. Check the Saving Tips page any time.';
      return `Here's a quick tip: "${tips[0].title}" — ${tips[0].body}`;
    }
    return '';
  }

  function buildAssistantReply(userText: string): ChatMessage {
    const quick = buildQuickAnswer(userText);
    if (quick) return { id: crypto.randomUUID(), role: 'assistant', text: quick };

    const looksLikeExpense = /bought|spent|₦|paid|purchase/i.test(userText);
    if (looksLikeExpense && pageData) {
      const expenseCats = pageData.categories.filter((c) => c.type === 'expense');
      const lower = userText.toLowerCase();
      const catMatch = expenseCats.find((c) => lower.includes(c.name.toLowerCase()))
        ?? expenseCats.find((c) => /^other/i.test(c.name));
      const amt = parseAmount(userText);
      if (catMatch && amt) {
        return {
          id: crypto.randomUUID(), role: 'assistant',
          text: `Got it — that looks like a ${formatCurrency(amt, DEFAULT_CURRENCY)} expense in ${catMatch.name}. Want me to log it?`,
          suggestedCategoryId: catMatch.id, suggestedCategoryName: catMatch.name, suggestedAmount: amt,
        };
      }
      if (catMatch) {
        return { id: crypto.randomUUID(), role: 'assistant', text: `Sounds like ${catMatch.name}, but I couldn't find an amount — try including one, e.g. "₦3,500".` };
      }
    }

    return {
      id: crypto.randomUUID(), role: 'assistant',
      text: 'I can help with your budget, spending summary, saving tips, or log an expense. Try a quick question below, or say something like "Bought lunch at campus cafe ₦2,500".',
    };
  }

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    const assistantMsg = buildAssistantReply(text);
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setDraft('');
  }

  async function handleAccept(msg: ChatMessage) {
    if (!user || !msg.suggestedCategoryId || !msg.suggestedAmount) return;
    await transactionService.create(user.id, {
      type: 'expense', categoryId: msg.suggestedCategoryId,
      amount: msg.suggestedAmount, occurredAt: new Date().toISOString(),
    });
    setLoggedIds((prev) => new Set(prev).add(msg.id));
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">AI Assistant</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
          Ask about your spending, budgets, or describe a purchase — answers use your real {formatMonthLabel(month)} data.
        </p>
      </div>

      {isLoading ? (
        <PageSpinner />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Chat panel */}
          <Card noPadding className="flex h-[580px] flex-col lg:col-span-2">
            {/* Chat header */}
            <div className="flex items-center gap-3 border-b border-gray-50 px-5 py-3.5 dark:border-white/[0.04]">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white dark:bg-primary">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">Campus Coin Assistant</p>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500 dark:bg-primary-accent" />
                  <p className="text-xs text-gray-400 dark:text-text-muted">Rule-based · your real data</p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {messages.map((msg) => (
                <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'rounded-br-sm bg-brand-600 text-white dark:bg-primary'
                      : 'rounded-bl-sm border border-gray-100 bg-gray-50 text-gray-800 dark:border-white/[0.06] dark:bg-surface-elevated dark:text-text-primary',
                  )}>
                    <p>{msg.text}</p>
                    {msg.suggestedCategoryName && msg.suggestedAmount && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:bg-surface dark:text-text-secondary">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          {msg.suggestedCategoryName} · {formatCurrency(msg.suggestedAmount, DEFAULT_CURRENCY)}
                        </div>
                        {loggedIds.has(msg.id) ? (
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-200">
                            <Check className="h-3.5 w-3.5" /> Logged to your transactions
                          </p>
                        ) : (
                          <button
                            onClick={() => void handleAccept(msg)}
                            className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
                          >
                            Log this expense
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(draft); }}
              className="flex items-center gap-2 border-t border-gray-50 p-3 dark:border-white/[0.04]"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask a question or describe a purchase…"
                className={cn(
                  'flex-1 rounded-xl border bg-gray-50 px-4 py-2 text-sm text-gray-900',
                  'border-gray-100 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/20',
                  'dark:border-white/8 dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent/70',
                )}
              />
              <button
                type="submit"
                aria-label="Send"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 dark:bg-primary dark:hover:bg-primary-accent"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </Card>

          {/* Quick questions sidebar */}
          <div className="flex flex-col gap-4">
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400">
                  <Zap className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-text-primary">Quick Questions</h2>
              </div>
              <div className="space-y-1.5">
                {QUICK_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className={cn(
                      'w-full rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium',
                      'border-gray-100 text-gray-700 transition-all duration-150',
                      'hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
                      'dark:border-white/5 dark:text-text-secondary dark:hover:border-primary/30 dark:hover:bg-primary/8 dark:hover:text-primary-accent',
                    )}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-brand-50 to-blue-50 border-brand-100 dark:from-primary/8 dark:to-blue-400/8 dark:border-primary/15">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-primary/20 dark:text-primary-accent">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">Tip</p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-text-secondary leading-relaxed">
                    Describe purchases like <em className="not-italic font-medium text-brand-700 dark:text-primary-accent">"Bought suya — ₦1,200"</em> and I'll suggest a category and offer to log it for you.
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
