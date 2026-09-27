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
    <details className="group border-b border-[#1d3d2d]/10 first:border-t dark:border-white/10">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-sm font-semibold text-[#1d3d2d] marker:hidden dark:text-text-primary sm:text-base">
        {question}
        <ChevronDown className="h-4 w-4 shrink-0 text-[#1c8f53] transition-transform duration-200 group-open:rotate-180 dark:text-primary-accent" />
      </summary>
      <p className="max-w-3xl pb-5 pr-8 text-sm leading-7 text-gray-600 dark:text-text-secondary">{answer}</p>
    </details>
  );
}

export function FaqPage() {
  return (
    <div className="overflow-hidden">
      <section className="border-b border-[#1d3d2d]/10 dark:border-white/10">
        <div className="mx-auto max-w-[1200px] px-4 pb-10 pt-12 sm:px-6 sm:pb-14 lg:pt-16">
          <div className="flex items-center gap-2 text-[#1a8f57] dark:text-primary-accent">
            <HelpCircle className="h-4 w-4" />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">Help & FAQ</p>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-[1fr_0.65fr] md:items-end">
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] text-[#1d3d2d] dark:text-text-primary sm:text-5xl lg:text-[3.5rem]">
              Answers for your money questions.
            </h1>
            <p className="max-w-lg text-sm leading-7 text-gray-600 dark:text-text-secondary sm:text-base">
              Find quick guidance on getting started, tracking transactions, setting budgets, and keeping your information private.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-8 lg:grid-cols-[210px_1fr] lg:gap-16">
          <nav aria-label="FAQ topics" className="lg:block">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-gray-500 dark:text-text-muted">Browse by topic</p>
            <ul className="flex gap-2 overflow-x-auto pb-2 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:pb-0">
              {categories.map(({ key, icon: Icon, label, color }) => (
                <li key={key}>
                  <a
                    href={`#${key}`}
                    className="flex w-max items-center gap-2 whitespace-nowrap border border-[#1d3d2d]/10 px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-[#1c8f53]/40 hover:text-[#1c8f53] dark:border-white/10 dark:text-text-secondary dark:hover:text-primary-accent lg:w-full lg:text-sm"
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center ${color}`}>
                      <Icon className="h-3 w-3" />
                    </span>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            {categories.map(({ key, icon: Icon, label, color, faqs }) => (
              <section key={key} id={key} className="scroll-mt-24">
                <div className="mb-2 flex items-center gap-3">
                  <span className={`flex h-8 w-8 items-center justify-center ${color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <h2 className="text-lg font-bold text-[#1d3d2d] dark:text-text-primary">{label}</h2>
                </div>
                <div>
                  {faqs.map(({ question, answer }) => (
                    <FaqItem key={question} question={question} answer={answer} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#122a1f] text-white dark:bg-surface-elevated">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between md:py-12">
          <div className="flex items-start gap-4">
            <Lock className="mt-1 h-5 w-5 shrink-0 text-[#78d99a] dark:text-primary-accent" />
            <div>
              <h2 className="text-xl font-bold">Ready to take a closer look?</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">Campus Coin is free to use, needs no bank connection, and keeps every entry in your hands.</p>
            </div>
          </div>
          <Link to={PUBLIC_ROUTES.register} className="inline-flex w-fit shrink-0 items-center gap-2 bg-[#1c8f53] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#25a864]">
            Get started free <span aria-hidden="true">-&gt;</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
