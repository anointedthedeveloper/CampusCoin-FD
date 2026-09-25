import { useEffect, useState, type FormEvent } from 'react';
import { Bot, Check, Send, Sparkles } from 'lucide-react';
import { Card, Spinner } from '@/components/common';
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

const QUICK_QUESTIONS = ['How do I add money?', "What's my budget?", 'Spending this month?', 'Saving tips?'];

function monthKey() {
  return new Date().toISOString().slice(0, 7);
}

function parseAmount(text: string): number | undefined {
  const match = text.replace(/,/g, '').match(/₦?\s*(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : undefined;
}

interface PageData {
  categories: Category[];
  budgetSummary: BudgetSummary | null;
  report: MonthlyReport | null;
  tips: SavingTip[];
}

export function InsightsPage() {
  const { user } = useAuth();
  const month = monthKey();

  const [pageData, setPageData] = useState<PageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        categories: cats.status === 'fulfilled' ? cats.value : [],
        budgetSummary: budSum.status === 'fulfilled' ? budSum.value : null,
        report: report.status === 'fulfilled' ? report.value : null,
        tips: tips.status === 'fulfilled' ? tips.value : [],
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

    if (question === 'How do I add money?') {
      return 'Tap "Add Income" on your dashboard, choose a category like Allowance or Part-time Job, then enter the amount and date.';
    }
    if (question === "What's my budget?") {
      if (!budgetSummary || budgetSummary.budgets.length === 0) {
        return "You haven't set any budgets for this month yet. Head to the Budgets page to set one.";
      }
      const top = [...budgetSummary.budgets].sort((a, b) => b.spentAmount - a.spentAmount)[0];
      const topName = categories.find((c) => c.id === top.categoryId)?.name ?? 'a category';
      return `You've budgeted ${formatCurrency(budgetSummary.totalBudgeted, DEFAULT_CURRENCY)} across ${budgetSummary.budgets.length} categor${budgetSummary.budgets.length === 1 ? 'y' : 'ies'} this month, and spent ${formatCurrency(budgetSummary.totalSpent, DEFAULT_CURRENCY)} so far — ${topName} is your biggest category.`;
    }
    if (question === 'Spending this month?') {
      if (!report) return "You haven't logged any transactions this month yet.";
      return `You've spent ${formatCurrency(report.totalExpense, DEFAULT_CURRENCY)} this month and brought in ${formatCurrency(report.totalIncome, DEFAULT_CURRENCY)}.`;
    }
    if (question === 'Saving tips?') {
      if (tips.length === 0) {
        return 'No specific saving tips right now. Check the Saving Tips page any time.';
      }
      return `I've flagged ${tips.length} thing${tips.length === 1 ? '' : 's'} worth a look this month: ${tips.map((t) => t.title).join('; ')}. See the Saving Tips page for details.`;
    }
    return '';
  }

  function buildAssistantReply(userText: string): ChatMessage {
    const quickAnswer = buildQuickAnswer(userText);
    if (quickAnswer) {
      return { id: crypto.randomUUID(), role: 'assistant', text: quickAnswer };
    }

    const looksLikeExpense = /bought|spent|₦|paid|purchase/i.test(userText);
    if (looksLikeExpense && pageData) {
      const expenseCategories = pageData.categories.filter((c) => c.type === 'expense');
      const lower = userText.toLowerCase();
      const categoryMatch =
        expenseCategories.find((c) => lower.includes(c.name.toLowerCase())) ??
        expenseCategories.find((c) => c.name === 'Others' || c.name === 'Other');
      const amount = parseAmount(userText);

      if (categoryMatch && amount) {
        return {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `Got it — that looks like a ${formatCurrency(amount, DEFAULT_CURRENCY)} expense in ${categoryMatch.name}. Want me to log it?`,
          suggestedCategoryId: categoryMatch.id,
          suggestedCategoryName: categoryMatch.name,
          suggestedAmount: amount,
        };
      }
      if (categoryMatch) {
        return {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `That sounds like it fits ${categoryMatch.name}, but I couldn't find an amount in your message — try including one, e.g. "₦3,500".`,
        };
      }
    }

    return {
      id: crypto.randomUUID(),
      role: 'assistant',
      text: 'I can help with your budget, spending summary, saving tips, or logging an expense — try a quick question below, or describe a purchase like "Bought food at Campus Cafe - ₦3,500".',
    };
  }

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm your Campus Coin Assistant. Ask me about your budget, spending, or describe a purchase and I'll suggest a category.",
    },
  ]);
  const [draft, setDraft] = useState('');
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());

  function sendMessage(text: string) {
    if (!text.trim()) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text };
    const assistantMessage = buildAssistantReply(text);
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setDraft('');
  }

  async function handleAccept(message: ChatMessage) {
    if (!user || !message.suggestedCategoryId || !message.suggestedAmount) return;
    await transactionService.create(user.id, {
      type: 'expense',
      categoryId: message.suggestedCategoryId,
      amount: message.suggestedAmount,
      occurredAt: new Date().toISOString(),
    });
    setLoggedIds((prev) => new Set(prev).add(message.id));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    sendMessage(draft);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Assistant</h1>
        <p className="mt-1 text-sm text-gray-500">
          Ask about your spending, budgets, or describe a purchase — answers come from your real {formatMonthLabel(month)} data.
        </p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="flex h-[560px] flex-col p-0 lg:col-span-2">
            <div className="flex items-center gap-3 border-b border-gray-100 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900">Campus Coin Assistant</p>
                <p className="flex items-center gap-1 text-xs text-brand-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Rule-based, not a live model
                </p>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((message) => (
                <div key={message.id} className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                      message.role === 'user'
                        ? 'rounded-br-sm bg-brand-600 text-white'
                        : 'rounded-bl-sm border border-gray-100 bg-gray-50 text-gray-800',
                    )}
                  >
                    <p>{message.text}</p>
                    {message.suggestedCategoryName && message.suggestedAmount && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm">
                          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                          {message.suggestedCategoryName} · {formatCurrency(message.suggestedAmount, DEFAULT_CURRENCY)}
                        </div>
                        {loggedIds.has(message.id) ? (
                          <p className="flex items-center gap-1 text-xs font-medium text-brand-700">
                            <Check className="h-3.5 w-3.5" /> Logged to your transactions
                          </p>
                        ) : (
                          <button
                            onClick={() => void handleAccept(message)}
                            className="rounded-md bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700"
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

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-100 p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="submit"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white transition-colors duration-200 hover:bg-brand-700"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </Card>

          <Card className="h-fit p-5">
            <h2 className="text-sm font-semibold text-gray-900">Quick Questions</h2>
            <div className="mt-3 space-y-2">
              {QUICK_QUESTIONS.map((question) => (
                <button
                  key={question}
                  onClick={() => sendMessage(question)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-left text-sm text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
                >
                  {question}
                </button>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
