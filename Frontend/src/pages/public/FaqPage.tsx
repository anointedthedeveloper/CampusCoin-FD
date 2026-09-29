import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen,
  Bot,
  ChevronDown,
  FileSpreadsheet,
  HelpCircle,
  Lock,
  PiggyBank,
  Receipt,
  Search,
  ShieldCheck,
  Wallet,
  X,
} from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { assets } from '@/assets';
import { cn } from '@/utils/cn';

const categories = [
  {
    key: 'getting-started',
    icon: BookOpen,
    label: 'Getting Started',
    color: 'bg-[#d7f0d1] text-[#1c8f53] dark:bg-white/10 dark:text-primary-accent',
    faqs: [
      {
        question: 'What is Campus Coin?',
        answer:
          'Campus Coin is a free budgeting web app built specifically for college and university students. It lets you log income and expenses, set monthly budgets per category, view spending trends, and get personalized saving tips — all without linking a bank account.',
      },
      {
        question: 'Do I need to link my bank account?',
        answer:
          'No. Campus Coin never asks for bank credentials or payment details. You log income and expenses yourself, or import them from a CSV file you control. Your financial data stays entirely in your hands.',
      },
      {
        question: 'Is Campus Coin free to use?',
        answer:
          "Yes, it's completely free. Create an account and use every feature — transactions, budgets, reports, saving tips, and the AI assistant — at no cost.",
      },
      {
        question: 'Can I sign in with Google?',
        answer:
          'Yes. Use "Continue with Google" on the login or sign-up page. New Google accounts are asked to choose a password too, so you can sign in either way. If you already have a Campus Coin account with the same email, you\'ll be asked whether to link them.',
      },
      {
        question: 'I forgot my password — what do I do?',
        answer:
          'Click "Forgot password?" on the login page and enter your email. You\'ll receive a 6-digit code and a one-click link to choose a new password. The code expires after 15 minutes.',
      },
      {
        question: 'How do I create an account?',
        answer:
          'Click "Get Started" on the home page, fill in your name, email, and a password, and you\'re in. You can optionally add your school, academic year, monthly allowance baseline, and a savings goal from your profile page at any time.',
      },
    ],
  },
  {
    key: 'transactions',
    icon: Receipt,
    label: 'Transactions',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-400/15 dark:text-blue-400',
    faqs: [
      {
        question: 'What income types can I log?',
        answer:
          'You can log Allowance, Part-time Job earnings, Scholarships, Gifts, and Other Income. You can also create your own custom income categories from the Categories page.',
      },
      {
        question: 'What expense categories are available?',
        answer:
          'Default expense categories include Food, Transport, Hostel/Rent, Academics (books, tuition, stationery), Subscriptions (streaming, apps), Entertainment (movies, outings), and Miscellaneous. You can add, edit, or delete your own categories too.',
      },
      {
        question: 'Can I edit or delete a transaction after logging it?',
        answer:
          'Yes. Open any transaction from your Transactions list, then use the edit or delete options. Your full history is retained — deleting a transaction removes it from reports going forward.',
      },
      {
        question: 'Does Campus Coin support recurring transactions?',
        answer:
          'Yes. When adding a transaction, pick a "Repeat" option (weekly, monthly or yearly), or manage everything on the Recurring page. Recurring entries like an allowance or a subscription are logged automatically each period, and you can pause or delete them any time.',
      },
    ],
  },
  {
    key: 'budgets',
    icon: Wallet,
    label: 'Budgets & Alerts',
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-400/15 dark:text-amber-400',
    faqs: [
      {
        question: 'How do I set a budget?',
        answer:
          'Go to the Budgets page, click "Set Budget", choose an expense category, and enter a monthly limit. You can set a separate budget for each category and navigate between months using the arrows at the top.',
      },
      {
        question: 'Will I be notified when I\'m close to my limit?',
        answer:
          'Yes. You get an in-app notification when a category reaches your alert threshold (80% by default — change it in Settings) and another when it goes over. You are also alerted when your spending passes your income or your monthly allowance, and when you reach your savings goal. Announcements from the Campus Coin team appear in the same place.',
      },
      {
        question: 'Can I set a savings goal?',
        answer:
          'Yes. Set a savings goal on your Profile page and track it on the dashboard, or create several named goals (like "New laptop") with target dates on the Savings Goals page. Each goal shows your progress and how much you need to save per week to hit it.',
      },
    ],
  },
  {
    key: 'reports',
    icon: PiggyBank,
    label: 'Reports & Insights',
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400',
    faqs: [
      {
        question: 'What reports does Campus Coin generate?',
        answer:
          'The Reports page shows: a category-wise spending breakdown (donut chart), an income vs. expense trend over the last 6 months, weekly spending bars, a daily spending heatmap, and a full category and daily breakdown table. You can filter by month, type, category or income source and a date range, and see every transaction in a table.',
      },
      {
        question: 'Can I export my reports?',
        answer:
          'Yes. The Reports page can export the selected month as a PDF, as an image (PNG) or as a CSV spreadsheet.',
      },
      {
        question: 'What are Saving Tips?',
        answer:
          'Saving Tips are personalized suggestions generated from your own transaction history. They compare your current spending against your historical averages and budget goals, then surface the most impactful changes you could make. They are ranked by how much they could save you. You can pin tips you find useful or dismiss ones that don\'t apply (and restore them later).',
      },
    ],
  },
  {
    key: 'ai',
    icon: Bot,
    label: 'AI Assistant',
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400',
    faqs: [
      {
        question: 'What does the AI Assistant do?',
        answer:
          'The AI Assistant answers questions about your budget and spending using your real data, can show answers as tables, and has templates like "Can I afford this?" and "When can I afford this?". It also suggests a category when you describe a purchase and lets you log it from the chat. Your chats are saved so you can continue them later.',
      },
      {
        question: 'Does the AI post transactions automatically?',
        answer:
          'No. Any AI suggestion — whether for categorizing a transaction or summarizing your month — is always shown for you to review first. Nothing is finalized without your confirmation.',
      },
      {
        question: 'Which AI powers the assistant?',
        answer:
          'The assistant uses a hosted language model (Groq or Google Gemini), given only a summary of your own Campus Coin figures. If the AI service is unavailable it still answers from your numbers. Its answers are advisory — not certified financial advice.',
      },
    ],
  },
  {
    key: 'import',
    icon: FileSpreadsheet,
    label: 'CSV Import',
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400',
    faqs: [
      {
        question: 'How do I import transactions from a CSV?',
        answer:
          'Go to Transactions → Import CSV. Drag and drop your file or click "Choose File". Campus Coin expects columns named date, description, and amount. You\'ll see a preview of the rows before confirming the import.',
      },
      {
        question: 'What format should my CSV be in?',
        answer:
          'Your CSV needs at least three columns: date (any standard date format), description (free text), and amount (a number). The header row is required. Rows with missing or unparseable dates or amounts are skipped and counted as "invalid rows" in the preview.',
      },
    ],
  },
  {
    key: 'privacy',
    icon: ShieldCheck,
    label: 'Privacy & Security',
    color: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-text-secondary',
    faqs: [
      {
        question: 'Is my data private?',
        answer:
          'Yes. Your transactions, budgets, and reports are visible only to your account. Nothing is shared or sold. Campus Coin does not integrate with any bank or payment system.',
      },
      {
        question: 'What if I don\'t have a steady income?',
        answer:
          "That's the normal case, not an exception. Campus Coin is built around irregular sources — allowance, gig income, scholarships, gifts — not a fixed monthly paycheck. Log whatever comes in, whenever it comes in.",
      },
      {
        question: 'Can I delete my account?',
        answer:
          'Yes. Contact support through the Help page (live chat or the contact form) and an administrator will delete the account and all its data permanently.',
      },
    ],
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border-b border-[#1d3d2d]/10 first:border-t dark:border-white/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold text-[#1d3d2d] marker:hidden dark:text-text-primary sm:text-base">
        {question}
        <ChevronDown className="h-4 w-4 shrink-0 text-[#1c8f53] transition-transform duration-200 group-open:rotate-180 dark:text-primary-accent" />
      </summary>
      <p className="max-w-3xl pb-5 pr-8 text-sm leading-7 text-gray-600 dark:text-text-secondary">{answer}</p>
    </details>
  );
}

function FaqIllustration() {
  return (
    <div className="mx-auto hidden w-full max-w-sm overflow-hidden rounded-[28px] shadow-panel dark:shadow-dark-panel md:block lg:max-w-md">
      <img src={assets.faqIllustration} alt="" aria-hidden="true" className="block w-full object-cover" />
    </div>
  );
}

const STOP_WORDS = new Set(['how', 'do', 'does', 'can', 'the', 'my', 'is', 'to', 'an', 'and', 'or', 'of', 'in', 'on', 'for', 'what', 'where', 'why', 'with', 'it', 'me', 'am', 'are', 'be', 'if', 'at', 'this', 'that', 'there', 'your', 'you']);
const SYNONYMS: Record<string, string[]> = {
  reset: ['forgot', 'new password', 'change'],
  forgot: ['reset'],
  login: ['sign in', 'log in'],
  signin: ['sign in', 'log in'],
  delete: ['remove', 'deletion'],
  export: ['download', 'pdf', 'csv'],
  recurring: ['repeat', 'automatic'],
  alert: ['notification', 'notified'],
  alerts: ['notification', 'notified'],
  ai: ['assistant'],
  bank: ['bank account'],
};

export function FaqPage() {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const isSearching = query.trim().length > 0;

  const filteredCategories = useMemo(() => {
    // Word-based search: ignore filler words, accept common synonyms, and
    // keep questions matching at least half of the meaningful words — so
    // "reset password" still finds "I forgot my password…".
    const words = query
      .trim()
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
    if (!words.length) return categories;
    const matches = (haystack: string, word: string) =>
      [word, word.replace(/s$/, ''), ...(SYNONYMS[word] ?? [])].some((w) => haystack.includes(w));
    // Prefer questions matching every word; only if none do, fall back to
    // those matching at least half of them.
    const everyWordHits = categories.some((category) =>
      category.faqs.some((faq) => {
        const haystack = `${faq.question} ${faq.answer} ${category.label}`.toLowerCase();
        return words.every((w) => matches(haystack, w));
      }),
    );
    const needed = everyWordHits ? words.length : Math.max(1, Math.ceil(words.length / 2));
    return categories
      .map((category) => ({
        ...category,
        faqs: category.faqs
          .map((faq) => {
            const haystack = `${faq.question} ${faq.answer} ${category.label}`.toLowerCase();
            const questionText = faq.question.toLowerCase();
            const score = words.filter((w) => matches(haystack, w)).length;
            const titleScore = words.filter((w) => matches(questionText, w)).length;
            return { faq, score, titleScore };
          })
          .filter((r) => r.score >= needed)
          .sort((a, b) => b.titleScore - a.titleScore || b.score - a.score)
          .map((r) => r.faq),
      }))
      .filter((category) => category.faqs.length > 0);
  }, [query]);

  const hasResults = filteredCategories.length > 0;
  const resultCount = useMemo(() => filteredCategories.reduce((sum, c) => sum + c.faqs.length, 0), [filteredCategories]);

  function goToCategory(key: string) {
    setQuery('');
    setExpandedKey(key);
    // Let the collapsed→expanded layout settle before scrolling, so the
    // target section lands under the sticky header instead of short.
    requestAnimationFrame(() => {
      document.getElementById(key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <div className="overflow-hidden">
      {/* ── Hero ── */}
      <section className="mx-auto max-w-[1280px] px-4 pb-10 pt-12 sm:px-6 sm:pb-14 lg:pt-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center md:gap-12">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-1.5 text-xs font-semibold text-[#1c8f53] shadow-sm dark:bg-white/10 dark:text-primary-accent">
              <HelpCircle className="h-3.5 w-3.5" />
              Help &amp; FAQ
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-[1.08] text-[#1d3d2d] dark:text-text-primary sm:text-5xl lg:text-[3.4rem]">
              Answers for your <span className="text-[#1a8f57] dark:text-primary-accent">money questions.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-gray-600 dark:text-text-secondary sm:text-base">
              Find quick guidance on getting started, tracking transactions, setting budgets, and keeping your information private.
            </p>

            <form
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                document.getElementById('faq-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="mt-7 flex max-w-md items-center gap-1.5 rounded-full bg-white p-1.5 shadow-card dark:bg-surface-elevated dark:shadow-dark-card"
            >
              <Search className="ml-3 h-4 w-4 shrink-0 text-gray-400 dark:text-text-muted" aria-hidden="true" />
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search questions..."
                aria-label="Search FAQ questions"
                className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-[#1d3d2d] placeholder:text-gray-400 focus:outline-none dark:text-text-primary dark:placeholder:text-text-muted"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  aria-label="Clear search"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:text-text-muted dark:hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="shrink-0 rounded-full bg-[#1c8f53] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#177e48] dark:bg-primary dark:hover:bg-primary-accent"
              >
                Search
              </button>
            </form>
            {isSearching && (
              <p className="mt-3 text-xs font-medium text-gray-500 dark:text-text-muted">
                {hasResults ? `${resultCount} question${resultCount === 1 ? '' : 's'} found` : 'No matches yet'}
              </p>
            )}
          </div>

          <FaqIllustration />
        </div>
      </section>

      {/* ── Topics + accordion ── */}
      <section id="faq-results" className="scroll-mt-24 mx-auto max-w-[1280px] px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[210px_1fr] lg:gap-16">
          <nav aria-label="FAQ topics" className="lg:block">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-text-muted">Browse by topic</p>
            <ul className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:pb-0">
              {categories.map(({ key, icon: Icon, label, color }) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => goToCategory(key)}
                    className={cn(
                      'flex w-max items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:bg-[#e5f1e5] hover:text-[#1c8f53] dark:text-text-secondary dark:hover:bg-white/10 dark:hover:text-primary-accent lg:w-full lg:text-sm',
                      expandedKey === key ? 'bg-[#e5f1e5] text-[#1c8f53] dark:bg-white/10' : 'bg-[#f6f4ee] dark:bg-white/5',
                    )}
                  >
                    <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', color)}>
                      <Icon className="h-3 w-3" />
                    </span>
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-3">
            {!hasResults && (
              <div className="rounded-[26px] bg-[#f6f4ee] px-6 py-12 text-center dark:bg-surface-elevated">
                <Search className="mx-auto h-6 w-6 text-gray-400 dark:text-text-muted" />
                <p className="mt-3 text-sm font-semibold text-[#1d3d2d] dark:text-text-primary">No questions match &ldquo;{query}&rdquo;</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-text-muted">Try a different word, or browse a topic on the left.</p>
              </div>
            )}
            {filteredCategories.map(({ key, icon: Icon, label, color, faqs }) => {
              const isOpen = isSearching || expandedKey === key;
              return (
                <section key={key} id={key} className="scroll-mt-24 overflow-hidden rounded-[20px] bg-[#f6f4ee] dark:bg-surface-elevated">
                  <button
                    type="button"
                    onClick={() => setExpandedKey((current) => (current === key ? null : key))}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left"
                  >
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', color)}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-[#1d3d2d] dark:text-text-primary">{label}</span>
                      <span className="block text-xs text-gray-500 dark:text-text-muted">
                        {faqs.length} question{faqs.length === 1 ? '' : 's'}
                      </span>
                    </span>
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 dark:text-text-muted',
                        isOpen && 'rotate-180',
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-[#1d3d2d]/8 bg-white px-5 dark:border-white/[0.08] dark:bg-transparent">
                      {faqs.map(({ question, answer }) => (
                        <FaqItem key={question} question={question} answer={answer} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="mx-auto max-w-[1280px] px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-6 rounded-[28px] bg-[#122a1f] px-6 py-10 text-white dark:bg-surface-elevated dark:shadow-lg dark:shadow-black/20 sm:flex-row sm:items-center sm:justify-between sm:px-10 sm:py-12">
          <div className="flex items-start gap-4">
            <Lock className="mt-1 h-5 w-5 shrink-0 text-[#78d99a] dark:text-primary-accent" />
            <div>
              <h2 className="text-xl font-bold">Ready to take a closer look?</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Campus Coin is free to use, needs no bank connection, and keeps every entry in your hands.</p>
            </div>
          </div>
          <Link
            to={PUBLIC_ROUTES.register}
            className="inline-flex w-fit shrink-0 items-center gap-2 rounded-xl bg-[#1c8f53] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#25a864] hover:shadow-lg dark:bg-primary dark:hover:bg-primary-accent"
          >
            Get started free <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
