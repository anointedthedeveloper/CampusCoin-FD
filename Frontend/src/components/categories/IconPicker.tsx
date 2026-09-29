import { useMemo, useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { CATEGORY_ICON_SET, suggestIcons } from '@/constants/categoryIcons';
import { cn } from '@/utils/cn';

interface IconPickerProps {
  value: string;
  onChange: (slug: string) => void;
  /** The category name being typed — drives the suggestions. */
  name: string;
  type?: 'income' | 'expense';
  color?: string;
}

/**
 * Grid of category icons with a search box and a "Suggested" row that
 * follows the category name as it's typed.
 */
export function IconPicker({ value, onChange, name, type, color = '#1c8f53' }: IconPickerProps) {
  const [query, setQuery] = useState('');
  const suggested = useMemo(() => suggestIcons(name, type, 6), [name, type]);
  const all = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(CATEGORY_ICON_SET)
      .filter(([slug, def]) => !q || slug.includes(q) || def.label.toLowerCase().includes(q) || def.words.some((w) => w.includes(q)))
      .map(([slug]) => slug);
  }, [query]);

  const tile = (slug: string) => {
    const def = CATEGORY_ICON_SET[slug];
    const Icon = def.icon;
    const selected = value === slug;
    return (
      <button
        key={slug}
        type="button"
        role="radio"
        aria-checked={selected}
        aria-label={def.label}
        title={def.label}
        onClick={() => onChange(slug)}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-xl border transition',
          selected ? 'border-transparent ring-2 ring-offset-1 ring-offset-white dark:ring-offset-surface-elevated' : 'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50 dark:border-white/10 dark:text-text-secondary dark:hover:bg-white/5',
        )}
        style={selected ? { backgroundColor: `${color}22`, color, boxShadow: `0 0 0 2px ${color}` } : undefined}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  };

  return (
    <div className="space-y-2.5">
      {suggested.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1 text-xs font-semibold text-gray-600 dark:text-text-secondary">
            <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-primary-accent" /> Suggested{name.trim() ? ` for “${name.trim()}”` : ''}
          </p>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Suggested icons">{suggested.map(tile)}</div>
        </div>
      )}
      <label className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 dark:border-white/10 dark:bg-white/[0.04]">
        <Search className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search icons (e.g. data, rent, gym)" aria-label="Search icons" className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none dark:text-text-primary" />
      </label>
      <div className="grid max-h-40 grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5 overflow-y-auto pr-1" role="radiogroup" aria-label="All icons">
        {all.map(tile)}
        {!all.length && <p className="col-span-full py-3 text-center text-xs text-gray-500">No icons match “{query}”.</p>}
      </div>
    </div>
  );
}
