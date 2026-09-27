import { useEffect, useState, type FormEvent } from 'react';
import { Bot, Check, Send, Sparkles } from 'lucide-react';
import { Card, Spinner } from '@/components/common';
import { aiService, transactionService, categoryService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { formatMonthLabel } from '@/utils/format';
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

const QUICK_QUESTIONS = ['How do I add money?', "What's my budget?", 'Spending this month?', 'Saving tips?'];

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hi! I'm your Campus Coin Assistant. Ask me about your budget, spending, or describe a purchase and I'll suggest a category.",
    },
  ]);
  const [draft, setDraft] = useState('');
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());

  async function sendMessage(text: string) {
    const trimmedText = text.trim();
    if (!trimmedText || isSending) return;
    const history = messages
      .filter((message) => message.id !== 'welcome')
      .slice(-8)
      .map(({ role, text: turnText }) => ({ role, text: turnText }));
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmedText };
    setMessages((prev) => [...prev, userMessage]);
    setDraft('');
    setIsSending(true);

    try {
      const answer = await aiService.answer(trimmedText, history);
      const looksLikeExpense = /bought|spent|₦|paid|purchase/i.test(trimmedText);
      const lower = trimmedText.toLowerCase();
      const categoryMatch = categories
        .filter((category) => category.type === 'expense')
        .find((category) => lower.includes(category.name.toLowerCase()));
      const amount = parseAmount(trimmedText);
      setMessages((prev) => [...prev, {
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
      setMessages((prev) => [...prev, {
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
    setLoggedIds((prev) => new Set(prev).add(message.id));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage(draft);
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
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Gemini · grounded in your monthly totals
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
              {isSending && <div className="flex items-center gap-2 text-xs text-gray-500"><Spinner /> Gemini is thinking...</div>}
            </div>

            <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-gray-100 p-3">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={isSending}
                placeholder="Type a message..."
                className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={isSending || !draft.trim()}
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
                  onClick={() => void sendMessage(question)}
                  disabled={isSending}
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
