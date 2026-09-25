import { useState, type FormEvent } from 'react';
import { CheckCircle2, Mail, MessageCircle, Send } from 'lucide-react';
import { Button, Input } from '@/components/common';
import { isValidEmail } from '@/utils/validation';

const faqs = [
  {
    question: 'Do I need to link my bank account?',
    answer:
      "No. Campus Coin never asks for bank credentials. You log income and expenses yourself, or import them from a CSV file you control.",
  },
  {
    question: 'Is my data private?',
    answer:
      'Yes. Nothing is shared or sold. Your transactions, budgets, and reports are visible only to your account.',
  },
  {
    question: 'Does the AI post transactions on its own?',
    answer:
      'No. AI suggestions for categorizing a transaction or summarizing your month are always shown for you to review — nothing is finalized without your confirmation.',
  },
  {
    question: 'Is Campus Coin free?',
    answer: "Yes, it's free to create an account and use every feature described on this site.",
  },
  {
    question: 'What if I don’t have a steady income?',
    answer:
      "That's the normal case, not an exception. Campus Coin is built around irregular sources — allowance, gig income, scholarships — not a fixed monthly paycheck.",
  },
];

function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Enter your name.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (message.trim().length < 10) {
      setError('Message should be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    // No backend yet — simulate a network round trip so the flow feels real.
    await new Promise((resolve) => setTimeout(resolve, 700));
    setIsSubmitting(false);
    setIsSubmitted(true);
  }

  if (isSubmitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-[28px] bg-[#f6f4ee] px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d7f0d1] text-[#1c8f53]">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <h3 className="text-xl font-bold text-[#1d3d2d]">Message sent</h3>
        <p className="max-w-sm text-sm text-gray-600">
          Thanks, {name.split(' ')[0]}. We&apos;ll get back to you at {email} soon.
        </p>
        <button
          type="button"
          onClick={() => {
            setIsSubmitted(false);
            setName('');
            setEmail('');
            setMessage('');
          }}
          className="mt-2 text-sm font-semibold text-[#1c8f53] hover:text-[#177e48]"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[28px] bg-white p-6 shadow-sm sm:p-8">
      <Input
        label="Full Name"
        name="name"
        placeholder="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        required
      />
      <Input
        label="Email Address"
        type="email"
        name="email"
        placeholder="you@example.com"
        icon={<Mail className="h-4 w-4" />}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-gray-700">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="What's on your mind?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#1c8f53] focus:outline-none focus:ring-2 focus:ring-[#1c8f53]/20"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" variant="primary" className="w-full" isLoading={isSubmitting}>
        <span className="inline-flex items-center gap-2">
          <Send className="h-4 w-4" />
          Send Message
        </span>
      </Button>
    </form>
  );
}

export function ContactPage() {
  return (
    <div>
      <section className="mx-auto max-w-[1280px] px-4 pb-4 pt-10 sm:px-6 lg:pt-14">
        <p className="text-sm font-semibold uppercase tracking-wide text-[#1a8f57]">Contact</p>
        <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-[1.05] tracking-[-0.02em] text-[#1d3d2d] sm:text-5xl">
          Questions, feedback, or something broken?
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
          Send us a message and we&apos;ll get back to you, or check the answers below first —
          they cover the most common questions.
        </p>
      </section>

      <section className="mx-auto max-w-[1280px] px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <ContactForm />
          </div>

          <div>
            <div className="flex items-center gap-2 text-[#1a8f57]">
              <MessageCircle className="h-5 w-5" />
              <h2 className="text-lg font-bold text-[#1d3d2d]">Frequently asked</h2>
            </div>
            <div className="mt-5 space-y-3">
              {faqs.map(({ question, answer }) => (
                <details
                  key={question}
                  className="group rounded-2xl bg-[#f6f4ee] p-5 transition-colors duration-200 open:bg-[#f2efe9]"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-[#1d3d2d]">
                    {question}
                    <span className="shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
