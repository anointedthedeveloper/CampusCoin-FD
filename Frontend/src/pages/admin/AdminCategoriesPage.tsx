import { useEffect, useState, type FormEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, Lock, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { Button, Card, ConfirmDialog, EmptyState } from '@/components/common';
import { adminCategoryService, type DefaultCategoryTemplate } from '@/services/admin/category.service';
import { ApiError } from '@/types/api';
import { cn } from '@/utils/cn';
import type { CategoryType } from '@/types/category';
import { IconPicker } from '@/components/categories/IconPicker';
import { CategoryIconBadge } from '@/components/categories/CategoryIconBadge';
import { suggestIcons } from '@/constants/categoryIcons';

const PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#94a3b8'];

const inputCls =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-surface dark:text-text-primary';

function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          onClick={() => onChange(color)}
          className={cn('h-7 w-7 rounded-full ring-offset-2 transition-transform hover:scale-110 dark:ring-offset-surface-elevated', value === color && 'ring-2 ring-gray-900 dark:ring-white')}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

export function AdminCategoriesPage() {
  const [templates, setTemplates] = useState<DefaultCategoryTemplate[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);

  // create
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<CategoryType>('expense');
  const [color, setColor] = useState(PALETTE[5]);
  const [icon, setIcon] = useState('utensils');
  // Until the admin picks an icon, keep choosing the best match for the name.
  const [iconTouched, setIconTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // edit / delete
  const [editing, setEditing] = useState<DefaultCategoryTemplate | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PALETTE[5]);
  const [editIcon, setEditIcon] = useState('more-horizontal');
  const [applyToStudents, setApplyToStudents] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deleting, setDeleting] = useState<DefaultCategoryTemplate | null>(null);
  const [removeFromStudents, setRemoveFromStudents] = useState(false);

  useEffect(() => {
    adminCategoryService.list().then(setTemplates).catch(() => setTemplates([]));
  }, [refreshToken]);

  useEffect(() => {
    if (iconTouched) return;
    const best = suggestIcons(name, type, 1)[0];
    setIcon(best ?? (type === 'income' ? 'hand-coins' : 'tag'));
  }, [name, type, iconTouched]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await adminCategoryService.create({ name: name.trim(), type, color, icon });
      setFlash(`"${name.trim()}" added. New students will start with it and existing students see it too.`);
      setName('');
      setIconTouched(false);
      setIsFormOpen(false);
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create this category.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEdit(template: DefaultCategoryTemplate) {
    setEditing(template);
    setEditName(template.name);
    setEditColor(template.color && PALETTE.includes(template.color) ? template.color : PALETTE[9]);
    setEditIcon(template.icon || suggestIcons(template.name, template.type, 1)[0] || 'tag');
    setApplyToStudents(true);
    setEditError(null);
  }

  async function handleSaveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing || !editName.trim()) return;
    setIsSaving(true);
    setEditError(null);
    try {
      const result = await adminCategoryService.update(editing.id, { name: editName.trim(), color: editColor, icon: editIcon, applyToStudents });
      setFlash(`Saved "${editName.trim()}"${applyToStudents ? ` — updated for ${result.studentsUpdated ?? 0} student${result.studentsUpdated === 1 ? '' : 's'}` : ''}.`);
      setEditing(null);
      setRefreshToken((t) => t + 1);
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Could not save this category.');
    } finally {
      setIsSaving(false);
    }
  }

  const groups: { type: CategoryType; label: string; icon: typeof ArrowUpRight }[] = [
    { type: 'expense', label: 'Expense categories', icon: ArrowDownRight },
    { type: 'income', label: 'Income sources', icon: ArrowUpRight },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Categories</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-text-secondary">
            Default categories every student starts with. Edit or remove them here — you can also apply changes to students who already have them.
          </p>
        </div>
        <Button variant="primary" onClick={() => { setIsFormOpen((open) => !open); setError(null); }}>
          {isFormOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {isFormOpen ? 'Cancel' : 'New Category'}
        </Button>
      </div>

      {flash && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-primary/25 dark:bg-primary/10 dark:text-primary-accent" role="status">
          <span>{flash}</span>
          <button type="button" onClick={() => setFlash(null)} className="text-xs font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {isFormOpen && (
        <Card className="animate-fade-in-up p-5">
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">
                Name
                <input required maxLength={40} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Data & Airtime" className={cn(inputCls, 'mt-1')} />
              </label>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">Colour</span>
                <div className="mt-2"><ColorPicker value={color} onChange={setColor} /></div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">Icon</span>
                <div className="mt-2"><IconPicker value={icon} onChange={(slug) => { setIcon(slug); setIconTouched(true); }} name={name} type={type} color={color} /></div>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-4">
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-gray-200 p-3 dark:border-white/10">
                <CategoryIconBadge category={{ name: name || 'New category', icon, color, type }} size="lg" />
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 dark:text-text-muted">Preview</p>
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-text-primary">{name.trim() || 'New category'}</p>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">Type</span>
                <div className="mt-1 flex rounded-lg bg-gray-100 p-1 dark:bg-white/[0.06]">
                  {(['expense', 'income'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setType(t)} className={cn('flex-1 rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-colors', type === t ? 'bg-brand-600 text-white shadow-sm dark:bg-primary' : 'text-gray-600 dark:text-text-muted')}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <Button type="submit" variant="primary" isLoading={isSubmitting}>Add category</Button>
            </div>
            {error && <p className="text-sm text-red-600 dark:text-red-400 md:col-span-2">{error}</p>}
          </form>
        </Card>
      )}

      {editing && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => !isSaving && setEditing(null)}>
          <Card className="max-h-[90vh] w-full max-w-md overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={handleSaveEdit} className="space-y-4" aria-label={`Edit ${editing.name}`}>
              <h2 className="text-lg font-bold text-gray-900 dark:text-text-primary">Edit category</h2>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-secondary">
                Name
                <input required maxLength={40} value={editName} disabled={editing.isProtected} onChange={(e) => setEditName(e.target.value)} className={cn(inputCls, 'mt-1 disabled:opacity-60')} />
                {editing.isProtected && <span className="mt-1 block text-xs text-gray-500 dark:text-text-muted">This is a fallback category, so its name can't change.</span>}
              </label>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">Colour</span>
                <div className="mt-2"><ColorPicker value={editColor} onChange={setEditColor} /></div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700 dark:text-text-secondary">Icon</span>
                <div className="mt-2"><IconPicker value={editIcon} onChange={setEditIcon} name={editName} type={editing.type} color={editColor} /></div>
              </div>
              <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-text-secondary">
                <input type="checkbox" checked={applyToStudents} onChange={(e) => setApplyToStudents(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600" />
                <span>Also update the {editing.studentCount ?? 0} student{editing.studentCount === 1 ? '' : 's'} who already have this category</span>
              </label>
              {editError && <p className="text-sm text-red-600 dark:text-red-400">{editError}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={() => setEditing(null)} disabled={isSaving}>Cancel</Button>
                <Button type="submit" variant="primary" isLoading={isSaving}>Save changes</Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {deleting && (
        <ConfirmDialog
          open
          title={`Delete "${deleting.name}"?`}
          description={
            <>
              New students won&apos;t get this category any more.
              <label className="mt-3 flex items-start gap-2 text-sm">
                <input type="checkbox" checked={removeFromStudents} onChange={(e) => setRemoveFromStudents(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-gray-300" />
                <span>Also remove it from students who haven&apos;t used it (copies with transactions or budgets are kept).</span>
              </label>
            </>
          }
          confirmLabel="Delete category"
          onConfirm={async () => {
            const result = await adminCategoryService.remove(deleting.id, removeFromStudents);
            setFlash(`"${deleting.name}" deleted${removeFromStudents ? ` and removed from ${result.studentsRemoved} student${result.studentsRemoved === 1 ? '' : 's'}` : ''}.`);
            setRefreshToken((t) => t + 1);
          }}
          onClose={() => { setDeleting(null); setRemoveFromStudents(false); }}
        />
      )}

      {templates.length === 0 ? (
        <EmptyState icon={Tags} title="No default categories" description="Add one with the button above." />
      ) : (
        groups.map(({ type: groupType, label, icon: GroupIcon }) => {
          const list = templates.filter((t) => t.type === groupType);
          return (
            <section key={groupType} className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-text-muted">
                <GroupIcon className="h-4 w-4" /> {label} <span className="font-normal normal-case">({list.length})</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {list.map((template) => (
                  <div key={template.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 transition-shadow hover:shadow-sm dark:border-white/[0.06] dark:bg-surface-elevated">
                    <CategoryIconBadge category={template} />
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-900 dark:text-text-primary">
                        {template.name}
                        {template.isProtected && <Lock className="h-3 w-3 shrink-0 text-gray-400" aria-label="Fallback category" />}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-text-muted">
                        {template.studentCount ?? 0} students · {template.transactionCount ?? 0} transactions
                      </p>
                    </div>
                    <button type="button" onClick={() => openEdit(template)} aria-label={`Edit ${template.name}`} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-text-muted dark:hover:bg-white/5 dark:hover:text-text-primary">
                      <Pencil className="h-4 w-4" />
                    </button>
                    {!template.isProtected && (
                      <button type="button" onClick={() => setDeleting(template)} aria-label={`Delete ${template.name}`} className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-text-muted dark:hover:bg-red-500/10 dark:hover:text-red-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
