import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  BarChart3,
  Bot,
  BookOpen,
  KeyRound,
  LifeBuoy,
  Mail,
  MessageCircle,
  MessagesSquare,
  PlayCircle,
  Plus,
  Repeat,
  Search,
  Wallet,
} from 'lucide-react';
import { Card, QuickGuideVideo, openQuickGuide } from '@/components/common';
import { SupportForm } from '@/components/help/SupportForm';
import { MyConversations } from '@/components/help/MyConversations';
import { PUBLIC_ROUTES, STUDENT_ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

const POPULAR = ['reset password', 'budget alerts', 'recurring', 'export report', 'Google sign in', 'delete account'];

const GUIDES = [
  { icon: Plus, title: 'Log income or an expense', steps: ['Open Add Transaction', 'Pick Income or Expense, enter the amount', 'Choose a category (or use the suggestion) and save'], to: STUDENT_ROUTES.newTransaction },
  { icon: Wallet, title: 'Set a monthly budget', steps: ['Open Budgets', 'Click Set Budget and choose a category', 'Enter the limit — you’re alerted near and over it'], to: STUDENT_ROUTES.budgets },
  { icon: Repeat, title: 'Automate allowance & subscriptions', steps: ['Open Recurring', 'Add the amount, category and how often', 'It’s logged for you on schedule'], to: STUDENT_ROUTES.recurring },
  { icon: Bot, title: 'Ask the AI Assistant', steps: ['Open AI Assistant', 'Ask a question or use "Can I afford?"', 'Ask for a table to compare numbers'], to: STUDENT_ROUTES.insights },
  { icon: BarChart3, title: 'Export a monthly report', steps: ['Open Reports and pick a month', 'Filter by type, category or date', 'Export as PDF, image or CSV'], to: STUDENT_ROUTES.reports },
  { icon: KeyRound, title: 'Reset your password', steps: ['On the login page, click Forgot password?', 'Enter your email', 'Use the code or the link in the email'], to: PUBLIC_ROUTES.forgotPassword },
];

function openLiveChat() {
  const tawk = window.Tawk_API as { maximize?: () => void; showWidget?: () => void } | undefined;
  tawk?.showWidget?.();
  tawk?.maximize?.();
}

/**
 * Help centre — shared by the public site (/help) and the student app
 * (/support, inside the app layout so the sidebar stays put).
 */
export function HelpPage({ inApp = false }: { inApp?: boolean }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [searchParams] = useSearchParams();
  const focusThread = searchParams.get('thread');
  const [threadsKey, setThreadsKey] = useState(0);
  const [newThreadId, setNewThreadId] = useState<string | null>(null);

  // Arriving from a "Support replied" notification: jump to the chat.
  useEffect(() => {
    if (!inApp || !(focusThread || window.location.hash === '#my-messages')) return undefined;
    const timer = window.setTimeout(() => document.getElementById('my-messages')?.scrollIntoView({ behavior: 'smooth' }), 150);
    return () => window.clearTimeout(timer);
  }, [inApp, focusThread]);

  function search(event?: FormEvent, text = query) {
    event?.preventDefault();
    const q = text.trim();
    navigate(q ? `${PUBLIC_ROUTES.faq}?q=${encodeURIComponent(q)}` : PUBLIC_ROUTES.faq);
  }

  const ways = [
    inApp
      ? { icon: MessagesSquare, title: 'Chat with support', text: 'Message the team and see their replies right here in the app.', action: 'Open my conversations', onClick: () => document.getElementById('my-messages')?.scrollIntoView({ behavior: 'smooth' }) }
      : { icon: MessageCircle, title: 'Live chat', text: 'Chat with the Campus Coin team from the bubble in the corner.', action: 'Start a chat', onClick: openLiveChat },
    { icon: PlayCircle, title: 'Watch the quick guide', text: 'A short video walkthrough of the whole app.', action: 'Play video', onClick: openQuickGuide },
    { icon: BookOpen, title: 'Browse the FAQ', text: 'Answers to the most common questions.', action: 'Open FAQ', onClick: () => navigate(PUBLIC_ROUTES.faq) },
    { icon: Mail, title: 'Send us a message', text: inApp ? 'Replies appear in the app and in your email, usually within a day.' : 'We reply by email, usually within a day.', action: 'Write to us', onClick: () => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }) },
  ];

  return (
    <div className={cn(!inApp && 'mx-auto max-w-[1280px] px-4 pb-16 pt-10 sm:px-6 lg:pt-14', inApp && 'space-y-2')}>
      <QuickGuideVideo scrollThreshold={Number.POSITIVE_INFINITY} />

      {/* Hero */}
      <section className={cn('glass-panel rounded-[28px] px-6 py-10 text-center sm:px-10', inApp && 'py-8')}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-primary/15 dark:text-primary-accent">
          <LifeBuoy className="h-3.5 w-3.5" /> Help centre
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-[#1d3d2d] dark:text-text-primary sm:text-4xl">How can we help?</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600 dark:text-text-secondary sm:text-base">Search the FAQ, follow a step-by-step guide, or reach the Campus Coin team directly.</p>
        <form role="search" onSubmit={search} className="mx-auto mt-6 flex max-w-lg items-center gap-1.5 rounded-full border border-gray-200 bg-white p-1.5 shadow-card dark:border-white/10 dark:bg-surface-elevated">
          <Search className="ml-3 h-4 w-4 shrink-0 text-gray-400" aria-hidden="true" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. how do I reset my password?" aria-label="Search help" className="min-w-0 flex-1 bg-transparent px-1 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-text-primary dark:placeholder:text-text-muted" />
          <button type="submit" className="shrink-0 rounded-full bg-[#1c8f53] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#177e48] dark:bg-primary dark:hover:bg-primary-accent">Search</button>
        </form>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {POPULAR.map((p) => (
            <button key={p} type="button" onClick={() => search(undefined, p)} className="rounded-full border border-gray-200 bg-white/70 px-3 py-1 text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-700 dark:border-white/10 dark:bg-white/5 dark:text-text-secondary dark:hover:text-primary-accent">
              {p}
            </button>
          ))}
        </div>
      </section>

      {/* Ways to get help */}
      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-text-primary">Ways to get help</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ways.map(({ icon: Icon, title, text, action, onClick }) => (
            <Card key={title} className="flex flex-col gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-primary/15 dark:text-primary-accent"><Icon className="h-5 w-5" /></span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-text-primary">{title}</p>
                <p className="mt-1 text-sm text-gray-600 dark:text-text-secondary">{text}</p>
              </div>
              <button type="button" onClick={onClick} className="self-start text-sm font-semibold text-brand-700 hover:underline dark:text-primary-accent">{action} →</button>
            </Card>
          ))}
        </div>
      </section>

      {/* Guides */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-text-primary">Step-by-step guides</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {GUIDES.map(({ icon: Icon, title, steps, to }) => (
            <Card key={title} className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700 dark:bg-white/[0.08] dark:text-text-secondary"><Icon className="h-4 w-4" /></span>
                <p className="font-semibold text-gray-900 dark:text-text-primary">{title}</p>
              </div>
              <ol className="mt-3 flex-1 space-y-1.5 text-sm text-gray-600 dark:text-text-secondary">
                {steps.map((step, i) => (
                  <li key={step} className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white dark:bg-primary">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <Link to={to} className="mt-4 self-start text-sm font-semibold text-brand-700 hover:underline dark:text-primary-accent">Go there →</Link>
            </Card>
          ))}
        </div>
      </section>

      {inApp && (
        <section id="my-messages" className="mt-10 scroll-mt-24">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-text-primary">My conversations</h2>
              <p className="text-sm text-gray-600 dark:text-text-secondary">Your messages to the Campus Coin team and their replies.</p>
            </div>
          </div>
          <MyConversations refreshKey={threadsKey} focusId={newThreadId ?? focusThread} />
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="mt-10 scroll-mt-24">
        <Card className="p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-text-primary">Send us a message</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-text-secondary">
              {inApp
                ? 'Questions, problems, or a request to delete your account — replies show up in “My conversations” above.'
                : <>Questions, problems, or a request to delete your account — we&apos;ll reply by email. <Link to={PUBLIC_ROUTES.login} className="font-semibold text-brand-700 hover:underline dark:text-primary-accent">Sign in</Link> to chat with the team in the app.</>}
            </p>
          </div>
          <SupportForm
            onSent={(id) => {
              if (!inApp) return;
              setThreadsKey((k) => k + 1);
              setNewThreadId(id);
              window.setTimeout(() => document.getElementById('my-messages')?.scrollIntoView({ behavior: 'smooth' }), 300);
            }}
          />
        </Card>
      </section>
    </div>
  );
}
