import { Link } from 'react-router-dom';
import {
  BookOpen,
  Bot,
  ChevronDown,
  FileSpreadsheet,
  HelpCircle,
  Lock,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';

const categories = [
  {
    key: 'getting-started',
    icon: BookOpen,
    label: 'Getting Started',
    color: 'bg-[#d7f0d1] text-[#1c8f53] dark:bg-white/10 dark:text-[var(--primary-accent)]',
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
          'Yes. When adding a transaction you can mark it as recurring (e.g. monthly allowance or a subscription charge) and it will be automatically re-logged each period.',
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
          'Yes. Campus Coin sends an in-app notification when a category reaches 80% of its budget, and another when it exceeds 100%. You can view all alerts on the Notifications page.',
      },
      {
        question: 'Can I set a savings goal?',
        answer:
          'Yes. Go to your Profile page and enter a Savings Goal amount. Your dashboard will then show a progress bar tracking your current balance against that goal.',
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
          'The Reports page shows: a category-wise spending breakdown (donut chart), an income vs. expense trend over the last 6 months, weekly spending bars, a daily spending heatmap, and a full category and daily breakdown table. You can filter by month and by expense category.',
      },
      {
        question: 'Can I export my reports?',
        answer:
          'Yes. Click "Export CSV" on the Reports page to download a full report for the selected month, including the summary, category breakdown, and daily spending data.',
      },
      {
        question: 'What are Saving Tips?',
        answer:
          'Saving Tips are personalized suggestions generated from your own transaction history. They compare your current spending against your historical averages and budget goals, then surface the most impactful changes you could make. You can bookmark tips you find useful or dismiss ones that don\'t apply.',
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
          'The AI Assistant can answer questions about your budget and spending using your real data, suggest a category when you describe a purchase (e.g. "Bought food at Campus Cafe — ₦3,500"), and let you log that expense directly from the chat.',
      },
      {
        question: 'Does the AI post transactions automatically?',
        answer:
          'No. Any AI suggestion — whether for categorizing a transaction or summarizing your month — is always shown for you to review first. Nothing is finalized without your confirmation.',
      },
      {
        question: 'Is the AI a live language model?',
        answer:
          'The current assistant is rule-based and works entirely from your own data — it does not call an external AI API. This means it\'s fast, private, and works offline, but it answers a defined set of questions rather than open-ended conversation.',
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
          'Yes. Contact support or use the account settings to request deletion. All your data will be permanently removed.',
      },
    ],
  },
];

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-2xl bg-[#f6f4ee] p-5 transition-colors duration-200 open:bg-[#f2efe9] dark:bg-surface-elevated dark:open:bg-white/[0.04]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-[#1d3d2d] dark:text-text-primary">
        {question}
        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180 dark:text-text-muted" />
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-text-secondary">{answer}</p>
    </details>
  );
}

export function FaqPage() {
  return (
    <div>
      <section className="mx-auto max-w-[1280px] px-4 pb-4 pt-10 sm:px-6 lg:pt-14">
        <div className="flex items-center gap-2 text-[#1a8f57] dark:text-[var(--primary-accent)]">
          <HelpCircle className="h-5 w-5" />
          <p className="text-sm font-semibold uppercase tracking-wide">Help & FAQ</p>
        </div>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-[#1d3d2d] dark:text-text-primary sm:text-5xl">
          Frequently asked questions
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 dark:text-text-secondary sm:text-lg">
          Everything you need to know about Campus Coin — from getting started to understanding your
          reports and saving tips.
        </p>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
          {/* Sticky category nav on desktop */}
          <nav className="hidden lg:block">
            <ul className="sticky top-24 space-y-1">
              {categories.map(({ key, icon: Icon, label, color }) => (
                <li key={key}>
                  <a
                    href={`#${key}`}
                    className="group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors duration-200 hover:bg-[#f6f4ee] hover:text-[#1d3d2d] dark:text-text-secondary dark:hover:bg-white/5 dark:hover:text-text-primary"
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* FAQ sections */}
          <div className="space-y-12">
            {categories.map(({ key, icon: Icon, label, color, faqs }) => (
              <div key={key} id={key}>
                <div className="mb-5 flex items-center gap-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full ${color}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h2 className="text-xl font-bold text-[#1d3d2d] dark:text-text-primary">{label}</h2>
                </div>
                <div className="space-y-3">
                  {faqs.map(({ question, answer }) => (
                    <FaqItem key={question} question={question} answer={answer} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 pb-16 pt-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-[28px] bg-[#122a1f] px-6 py-10 text-center text-white dark:bg-surface-elevated dark:shadow-lg dark:shadow-black/20 sm:py-12">
          <Lock className="h-8 w-8 text-[#4ade80] dark:text-[var(--primary-accent)]" />
          <h2 className="text-2xl font-bold sm:text-3xl">Still have questions?</h2>
          <p className="max-w-md text-sm text-white/60">
            Campus Coin is free, private, and requires no bank account. Jump in and explore — your
            data is yours.
          </p>
          <Link
            to={PUBLIC_ROUTES.register}
            className="mt-2 rounded-xl bg-[#1c8f53] px-7 py-3.5 text-base font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#177e48] hover:shadow-lg hover:shadow-[#1c8f53]/20 active:translate-y-0 dark:bg-[var(--primary)] dark:hover:bg-[var(--primary-accent)]"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
