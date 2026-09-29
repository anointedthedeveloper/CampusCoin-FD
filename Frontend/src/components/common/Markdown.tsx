import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/utils/cn';

/**
 * Renders AI replies: GitHub-flavoured Markdown with tables, lists and
 * emphasis, styled for both themes. Raw HTML is not rendered (react-markdown
 * escapes it by default), so model output can't inject markup.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('space-y-2 break-words text-sm leading-relaxed', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children: c }) => <p>{c}</p>,
          strong: ({ children: c }) => <strong className="font-semibold text-gray-900 dark:text-text-primary">{c}</strong>,
          ul: ({ children: c }) => <ul className="ml-4 list-disc space-y-1">{c}</ul>,
          ol: ({ children: c }) => <ol className="ml-4 list-decimal space-y-1">{c}</ol>,
          h1: ({ children: c }) => <p className="text-base font-bold">{c}</p>,
          h2: ({ children: c }) => <p className="text-sm font-bold">{c}</p>,
          h3: ({ children: c }) => <p className="text-sm font-semibold">{c}</p>,
          a: ({ children: c, href }) => (
            <a href={href} target="_blank" rel="noreferrer noopener" className="font-medium text-brand-700 underline dark:text-primary-accent">
              {c}
            </a>
          ),
          code: ({ children: c }) => <code className="rounded bg-black/5 px-1 py-0.5 text-[0.85em] dark:bg-white/10">{c}</code>,
          table: ({ children: c }) => (
            <div className="my-2 max-w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-white/10">
              <table className="w-full min-w-[16rem] border-collapse text-left text-xs">{c}</table>
            </div>
          ),
          thead: ({ children: c }) => <thead className="bg-gray-100 dark:bg-white/[0.06]">{c}</thead>,
          th: ({ children: c }) => <th className="whitespace-nowrap px-3 py-2 font-semibold text-gray-700 dark:text-text-secondary">{c}</th>,
          td: ({ children: c }) => <td className="border-t border-gray-100 px-3 py-2 align-top text-gray-800 dark:border-white/[0.06] dark:text-text-primary">{c}</td>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
