import { useEffect, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { ArrowDownRight, ArrowUpRight, Lock, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { Button, Card, ConfirmDialog, EmptyState, PageSpinner } from '@/components/common';
import { CategoryIconBadge } from '@/components/categories/CategoryIconBadge';
import { IconPicker } from '@/components/categories/IconPicker';
import { suggestIcons } from '@/constants/categoryIcons';
import { categoryService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import { cn } from '@/utils/cn';
import { ApiError } from '@/types/api';
import type { Category, CategoryType } from '@/types/category';

const PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#94a3b8'];
const FALLBACK_NAMES = ['miscellaneous', 'other', 'other income'];
const isFallback = (c: Category) => FALLBACK_NAMES.includes(c.name.trim().toLowerCase());

interface EditorState {
  mode: 'create' | 'edit';
  category?: Category;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  iconTouched: boolean;
}

function CategoryEditor({ state, onChange, onClose, onSaved }: {
  state: EditorState;
  onChange: (patch: Partial<EditorState>) => void;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lockedName = state.mode === 'edit' && state.category && isFallback(state.category);

  // Follow the name with the best icon until the student picks one.
  useEffect(() => {
    if (state.iconTouched) return;
    const best = suggestIcons(state.name, state.type, 1)[0];
    if (best && best !== state.icon) onChange({ icon: best });
  }, [state.name, state.type, state.iconTouched]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    const name = state.name.trim();
    if (!name) { setError('Give the category a name.'); return; }
    setSaving(true);
    setError(null);
    try {
      if (state.mode === 'create') {
        await categoryService.create(user.id, { name, type: state.type, color: state.color, icon: state.icon });
        onSaved(`Added "${name}".`);
      } else if (state.category) {
        await categoryService.update(user.id, state.category.id, { ...(lockedName ? {} : { name }), color: state.color, icon: state.icon });
        onSaved(`Saved "${name}".`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save this category. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="category-editor-title">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !saving && onClose()} />
      <Card className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto p-6">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute right-3 top-3 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"><X className="h-4 w-4" /></button>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-3">
            <CategoryIconBadge category={{ name: state.name || 'New category', icon: state.icon, color: state.color, type: state.type }} size="lg" />
            <div>
              <h2 id="category-editor-title" className="text-lg font-bold text-gray-900 dark:text-text-primary">{state.mode === 'create' ? 'New category' : 'Edit category'}</h2>
              <p className="text-xs text-gray-500 dark:text-text-muted">Pick a name, colour and icon — we suggest an icon as you type.</p>
            </div>
          </div>

          <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">
            Name
            <input
              autoFocus
              required
              maxLength={40}
              value={state.name}
              disabled={Boolean(lockedName)}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Gym & Fitness"
              className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 disabled:opacity-60 dark:border-white/[0.08] dark:bg-surface dark:text-text-primary"
            />
            {lockedName && <span className="mt-1 block text-xs text-gray-500 dark:text-text-muted">This is your fallback category, so its name stays the same.</span>}
          </label>

          {state.mode === 'create' && (
            <div>
              <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">Type</span>
              <div className="mt-1 inline-flex rounded-lg bg-gray-100 p-1 dark:bg-white/[0.08]">
                {(['expense', 'income'] as CategoryType[]).map((t) => (
                  <button key={t} type="button" onClick={() => onChange({ type: t })} className={cn('rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all', state.type === t ? 'bg-white text-gray-900 shadow-btn dark:bg-surface-elevated dark:text-text-primary' : 'text-gray-500 dark:text-text-muted')}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">Colour</span>
            <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
              {PALETTE.map((c) => (
                <button key={c} type="button" role="radio" aria-checked={state.color === c} aria-label={c} onClick={() => onChange({ color: c })} className={cn('h-7 w-7 rounded-full ring-offset-2 transition-transform hover:scale-110 dark:ring-offset-surface-elevated', state.color === c && 'ring-2 ring-gray-900 dark:ring-white')} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>

          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">Icon</span>
            <div className="mt-2">
              <IconPicker value={state.icon} onChange={(slug) => onChange({ icon: slug, iconTouched: true })} name={state.name} type={state.type} color={state.color} />
            </div>
          </div>

          {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={saving}>{state.mode === 'create' ? 'Add category' : 'Save changes'}</Button>
          </div>
        </form>
      </Card>
    </div>,
    document.body,
  );
}

function CategoryGrid({ categories, ownerId, onEdit, onDelete }: { categories: Category[]; ownerId?: string; onEdit: (c: Category) => void; onDelete: (c: Category) => void }) {
  if (categories.length === 0) {
    return <EmptyState compact icon={Tags} title="No categories yet" description="Add one with the button above." />;
  }
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((cat) => {
        const own = !cat.userId || cat.userId === ownerId;
        return (
          <div
            key={cat.id}
            className="group flex items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-card transition-all duration-200 hover:-translate-y-px hover:border-gray-200 hover:shadow-card-hover dark:border-white/[0.06] dark:bg-surface-elevated dark:shadow-dark-card dark:hover:border-white/10"
          >
            <div className="flex min-w-0 items-center gap-3">
              <CategoryIconBadge category={cat} />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-900 dark:text-text-primary">
                  {cat.name}
                  {isFallback(cat) && <Lock className="h-3 w-3 shrink-0 text-gray-400" aria-label="Fallback category" />}
                </p>
                <p className="text-2xs font-medium text-gray-400 dark:text-text-muted">{cat.isDefault ? 'Starter category' : 'Created by you'}</p>
              </div>
            </div>
            {own && cat.userId && (
              <div className="flex shrink-0 items-center gap-0.5 sm:opacity-60 sm:transition-opacity sm:group-hover:opacity-100">
                <button type="button" onClick={() => onEdit(cat)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-text-muted dark:hover:bg-white/10 dark:hover:text-text-primary" aria-label={`Edit ${cat.name}`}>
                  <Pencil className="h-4 w-4" />
                </button>
                {!isFallback(cat) && (
                  <button type="button" onClick={() => onDelete(cat)} className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400" aria-label={`Delete ${cat.name}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function CategoriesPage() {
  const { user } = useAuth();
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadCategories() {
    if (!user) return;
    const cats = await categoryService.list(user.id).catch(() => [] as Category[]);
    setCategories(cats);
    setIsLoading(false);
  }

  useEffect(() => { void loadCategories(); }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const expenseCategories = categories.filter((c) => c.type === 'expense');
  const incomeCategories = categories.filter((c) => c.type === 'income');

  function openCreate(type: CategoryType = 'expense') {
    setEditor({ mode: 'create', name: '', type, color: PALETTE[5], icon: type === 'income' ? 'wallet' : 'utensils', iconTouched: false });
  }

  function openEdit(category: Category) {
    setEditor({
      mode: 'edit',
      category,
      name: category.name,
      type: category.type,
      color: category.color && /^#[0-9a-f]{6}$/i.test(category.color) ? category.color : PALETTE[9],
      icon: category.icon || suggestIcons(category.name, category.type, 1)[0] || 'tag',
      iconTouched: true,
    });
  }

  const showLoader = useMinLoadTime(isLoading);
  if (showLoader) return <PageSpinner label="Loading categories…" />;

  const sections: { type: CategoryType; label: string; hint: string; icon: typeof ArrowUpRight; list: Category[] }[] = [
    { type: 'expense', label: 'Expense categories', hint: 'Where your money goes', icon: ArrowDownRight, list: expenseCategories },
    { type: 'income', label: 'Income sources', hint: 'Where your money comes from', icon: ArrowUpRight, list: incomeCategories },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Manage your categories</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
            Add, rename, recolour or remove the categories you use for transactions and budgets.
          </p>
        </div>
        <Button variant="primary" onClick={() => openCreate()}>
          <Plus className="h-4 w-4" /> Add category
        </Button>
      </div>

      {notice && (
        <div role="status" className="flex items-center justify-between gap-3 rounded-lg border border-brand-100 bg-brand-50 px-4 py-2.5 text-sm font-medium text-brand-700 dark:border-primary/20 dark:bg-primary/[0.08] dark:text-primary-accent">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-xs font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {sections.map(({ type, label, hint, icon: Icon, list }) => (
        <section key={type} className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-900 dark:text-text-primary">{label}</h2>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-2xs font-semibold text-gray-500 dark:bg-white/[0.08] dark:text-text-muted">{list.length}</span>
              <span className="hidden text-xs text-gray-400 dark:text-text-muted sm:inline">· {hint}</span>
            </div>
            <button type="button" onClick={() => openCreate(type)} className="text-xs font-semibold text-brand-700 hover:underline dark:text-primary-accent">+ Add {type}</button>
          </div>
          <CategoryGrid categories={list} ownerId={user?.id} onEdit={openEdit} onDelete={setDeleting} />
        </section>
      ))}

      {editor && (
        <CategoryEditor
          state={editor}
          onChange={(patch) => setEditor((e) => (e ? { ...e, ...patch } : e))}
          onClose={() => setEditor(null)}
          onSaved={(message) => { setNotice(message); setEditor(null); void loadCategories(); }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          open
          title={`Delete "${deleting.name}"?`}
          description="Any transactions and budgets in this category move to your fallback category (Miscellaneous / Other Income), so nothing is lost."
          confirmLabel="Delete category"
          onConfirm={async () => {
            if (!user) return;
            try {
              const { reassignedCount } = await categoryService.remove(user.id, deleting.id);
              setNotice(reassignedCount > 0
                ? `Deleted "${deleting.name}" — ${reassignedCount} transaction${reassignedCount === 1 ? '' : 's'} moved to the fallback category.`
                : `Deleted "${deleting.name}".`);
              void loadCategories();
            } catch (err) {
              throw new Error(err instanceof ApiError ? err.message : 'Could not delete this category.');
            }
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
