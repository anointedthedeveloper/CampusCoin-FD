import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ArrowRight, Bot, CheckCircle2, Download, FileSpreadsheet, History, Sparkles, Trash2, Upload, Wand2 } from 'lucide-react';
import { Badge, Button, Card } from '@/components/common';
import { ExportMenu } from '@/components/transactions/ExportMenu';
import { STUDENT_ROUTES } from '@/constants/routes';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { categoryService } from '@/services';
import { transactionsApi, type ImportResult, type ImportSuggestion } from '@/api/transactions.api';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import { ApiError } from '@/types/api';
import type { Category } from '@/types/category';
import {
  ACCEPT_ATTR,
  buildRows,
  detectColumns,
  downloadTemplate,
  hasHeaderRow,
  readTransactionFile,
  type AmountMode,
  type ColumnMap,
  type ColumnRole,
  type DateOrder,
  type ParseResult,
  type Table,
} from '@/utils/fileImport';

type Step = 'upload' | 'map' | 'review' | 'done';

interface ReviewRow {
  key: number;
  line: number;
  occurredAt: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
  suggestion?: ImportSuggestion['source'] | 'file';
  include: boolean;
}

const selectCls = cn(
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-gray-900',
  'border-gray-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
  'dark:border-white/[0.08] dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent/70',
);

const ROLE_LABELS: { role: ColumnRole; label: string; help: string }[] = [
  { role: 'date', label: 'Date', help: 'Required' },
  { role: 'description', label: 'Description', help: 'What it was' },
  { role: 'amount', label: 'Amount', help: 'One amount column…' },
  { role: 'debit', label: 'Money out (debit)', help: '…or separate out/in columns' },
  { role: 'credit', label: 'Money in (credit)', help: 'Bank statements' },
  { role: 'type', label: 'Type (income/expense)', help: 'Optional' },
  { role: 'category', label: 'Category', help: 'Optional — matched by name' },
];

const SOURCE_BADGE: Record<string, { label: string; icon: typeof Bot; tone: 'brand' | 'info' | 'neutral' }> = {
  ai: { label: 'AI', icon: Sparkles, tone: 'brand' },
  history: { label: 'Your history', icon: History, tone: 'info' },
  keywords: { label: 'Rule', icon: Wand2, tone: 'neutral' },
  file: { label: 'From file', icon: FileSpreadsheet, tone: 'info' },
};

const FORMATS = ['CSV', 'TSV', 'Excel .xlsx', 'Excel .xls', 'OpenDocument .ods', 'Word .docx (tables)', 'JSON'];

export function ImportPage() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const currency = user?.settings?.currency ?? DEFAULT_CURRENCY;

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState<string | null>(null);
  const [table, setTable] = useState<Table>([]);
  const [hasHeader, setHasHeader] = useState(true);
  const [columns, setColumns] = useState<ColumnMap>({});
  const [dateOrder, setDateOrder] = useState<DateOrder>('auto');
  const [amountMode, setAmountMode] = useState<AmountMode>('auto');
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [skipped, setSkipped] = useState<ParseResult['skipped']>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [bulkCategory, setBulkCategory] = useState('');

  useEffect(() => {
    if (!user) return;
    void categoryService.list(user.id).then(setCategories).catch(() => setCategories([]));
  }, [user]);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const header = hasHeader ? table[0] ?? [] : [];
  const width = Math.max(0, ...table.slice(0, 50).map((r) => r.length));
  const columnName = (i: number) => (hasHeader && String(header[i] ?? '').trim()) || `Column ${i + 1}`;
  const preview = useMemo(
    () => buildRows(table, columns, { dateOrder, amountMode, hasHeader }),
    [table, columns, dateOrder, amountMode, hasHeader],
  );

  async function handleFile(file: File) {
    setError(null);
    setIsReading(true);
    setFileName(file.name);
    try {
      const data = await readTransactionFile(file);
      if (data.length < 1) throw new Error('No rows were found in that file.');
      const header = hasHeaderRow(data);
      setTable(data);
      setHasHeader(header);
      setColumns(detectColumns(data));
      setDateOrder('auto');
      setAmountMode('auto');
      setStep('map');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That file could not be read.');
      setFileName(null);
    } finally {
      setIsReading(false);
    }
  }

  function defaultCategory(type: 'income' | 'expense') {
    const pool = categories.filter((c) => c.type === type);
    return (pool.find((c) => (type === 'income' ? /other/i : /misc|other/i).test(c.name)) ?? pool[0])?.id ?? '';
  }

  async function goToReview() {
    if (columns.date === undefined) { setError('Choose which column has the date.'); return; }
    if (columns.amount === undefined && columns.debit === undefined && columns.credit === undefined) { setError('Choose the amount column (or the money in / money out columns).'); return; }
    if (!preview.rows.length) { setError('None of the rows could be read with these settings. Check the date format and columns.'); return; }
    setError(null);
    const byName = new Map(categories.map((c) => [`${c.type}|${c.name.toLowerCase()}`, c.id]));
    const initial: ReviewRow[] = preview.rows.map((r, i) => {
      const fromFile = r.categoryName ? byName.get(`${r.type}|${r.categoryName.toLowerCase()}`) : undefined;
      return {
        key: i, line: r.line, occurredAt: r.occurredAt, description: r.description, amount: r.amount, type: r.type,
        categoryId: fromFile ?? '', suggestion: fromFile ? 'file' : undefined, include: true,
      };
    });
    setRows(initial);
    setSkipped(preview.skipped);
    setStep('review');

    // Batch suggestions for everything the file didn't already categorise.
    const needs = initial.filter((r) => !r.categoryId);
    if (!needs.length) return;
    setIsSuggesting(true);
    try {
      const suggestions: ImportSuggestion[] = [];
      for (let i = 0; i < needs.length; i += 500) {
        const chunk = needs.slice(i, i + 500);
        suggestions.push(...await transactionsApi.suggestImportCategories(chunk.map((r) => ({ description: r.description, type: r.type }))));
      }
      const byKey = new Map(needs.map((r, i) => [r.key, suggestions[i]]));
      setRows((prev) => prev.map((r) => {
        const s = byKey.get(r.key);
        if (!s || r.categoryId) return r;
        return { ...r, categoryId: s.categoryId ?? defaultCategory(r.type), suggestion: s.source ?? undefined };
      }));
    } catch {
      setRows((prev) => prev.map((r) => (r.categoryId ? r : { ...r, categoryId: defaultCategory(r.type) })));
    } finally {
      setIsSuggesting(false);
    }
  }

  function updateRow(key: number, patch: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r) => {
      if (r.key !== key) return r;
      const next = { ...r, ...patch };
      // Switching income/expense needs a category of the new type.
      if (patch.type && patch.type !== r.type) next.categoryId = defaultCategory(patch.type);
      if (patch.categoryId) next.suggestion = undefined;
      return next;
    }));
  }

  function applyBulkCategory() {
    const cat = catById.get(bulkCategory);
    if (!cat) return;
    setRows((prev) => prev.map((r) => (r.include && r.type === cat.type ? { ...r, categoryId: cat.id, suggestion: undefined } : r)));
  }

  async function handleImport() {
    const chosen = rows.filter((r) => r.include);
    if (!chosen.length) { setError('Select at least one row to import.'); return; }
    if (chosen.some((r) => !r.categoryId)) { setError('Every selected row needs a category.'); return; }
    setError(null);
    setIsImporting(true);
    const total: ImportResult = { imported: 0, duplicates: 0, invalid: 0, errors: [] };
    try {
      for (let i = 0; i < chosen.length; i += 500) {
        const chunk = chosen.slice(i, i + 500);
        const res = await transactionsApi.importRows(
          chunk.map((r) => ({ occurredAt: r.occurredAt, description: r.description, amount: r.amount, type: r.type, categoryId: r.categoryId })),
          { skipDuplicates, fileName: fileName ?? undefined },
        );
        total.imported += res.imported;
        total.duplicates += res.duplicates;
        total.invalid += res.invalid;
        total.errors.push(...res.errors.map((e) => ({ ...e, row: chunk[e.row - 1]?.line ?? e.row })));
      }
      setResult(total);
      setStep('done');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The import failed. Nothing after the last successful batch was saved — please try again.');
      if (total.imported) setResult(total);
    } finally {
      setIsImporting(false);
    }
  }

  function reset() {
    setStep('upload'); setTable([]); setRows([]); setFileName(null); setResult(null); setError(null); setColumns({});
  }

  const included = rows.filter((r) => r.include);
  const totals = included.reduce((acc, r) => { acc[r.type] += r.amount; return acc; }, { income: 0, expense: 0 });

  /* ── Done ──────────────────────────────────────────────────── */
  if (step === 'done' && result) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-text-primary">
              {result.imported} transaction{result.imported !== 1 ? 's' : ''} imported
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">
              {result.duplicates > 0 && `${result.duplicates} duplicate${result.duplicates === 1 ? ' was' : 's were'} skipped. `}
              {result.invalid > 0 && `${result.invalid} row${result.invalid === 1 ? '' : 's'} had problems. `}
              Budgets and alerts have been updated.
            </p>
            {result.errors.length > 0 && (
              <ul className="mx-auto mt-3 max-w-sm text-left text-xs text-red-600 dark:text-red-400">
                {result.errors.slice(0, 5).map((e) => <li key={`${e.row}-${e.message}`}>Row {e.row}: {e.message}</li>)}
              </ul>
            )}
          </div>
          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <Button variant="outline" onClick={reset}>Import another file</Button>
            <Link to={STUDENT_ROUTES.transactions}><Button variant="primary">View transactions</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  const steps: { id: Step; label: string }[] = [
    { id: 'upload', label: 'Upload a file' },
    { id: 'map', label: 'Match the columns' },
    { id: 'review', label: 'Review & import' },
  ];
  const stepIndex = steps.findIndex((s) => s.id === step);

  return (
    <div className={cn('mx-auto space-y-5', step === 'review' ? 'max-w-6xl' : 'max-w-3xl')}>
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Import &amp; export</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
          Bring in months of history from a spreadsheet, bank statement or document — categories are suggested for you.
        </p>
      </div>

      <ol className="grid grid-cols-3 gap-2 text-center" aria-label="Import steps">
        {steps.map((s, i) => (
          <li key={s.id} className={cn('rounded-xl border px-2 py-2.5 text-xs font-semibold sm:text-sm', i === stepIndex ? 'border-brand-300 bg-brand-50 text-brand-800 dark:border-primary/40 dark:bg-primary/10 dark:text-primary-accent' : i < stepIndex ? 'border-gray-200 bg-white text-gray-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-text-muted' : 'border-gray-100 bg-white text-gray-400 dark:border-white/[0.06] dark:bg-transparent dark:text-text-muted')} aria-current={i === stepIndex ? 'step' : undefined}>
            <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-current/10">{i < stepIndex ? '✓' : i + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-950/20">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* ── Step 1: upload ─────────────────────────────────────── */}
      {step === 'upload' && (
        <>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void handleFile(f); }}
            className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/40 p-10 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/30 dark:border-white/[0.08] dark:bg-white/[0.015] dark:hover:border-primary/40 sm:p-14"
          >
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent">
              <Upload className="h-6 w-6" />
            </span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-text-primary">Drag and drop your file here</p>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-text-muted">or choose one from your device (up to 10 MB, 2,000 rows)</p>
            </div>
            <Button variant="primary" isLoading={isReading} onClick={() => fileRef.current?.click()}>Choose file</Button>
            <input ref={fileRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handleFile(f); }} />
            <div className="flex flex-wrap justify-center gap-1.5">
              {FORMATS.map((f) => <Badge key={f} tone="neutral">{f}</Badge>)}
            </div>
          </div>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900 dark:text-text-primary">Not sure how to lay it out?</p>
                <p className="text-sm text-gray-500 dark:text-text-secondary">Any file with a date, a description and an amount works. Bank statements with separate money-in / money-out columns work too.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => void downloadTemplate('csv')}><Download className="h-3.5 w-3.5" /> CSV template</Button>
                <Button variant="outline" size="sm" onClick={() => void downloadTemplate('xlsx')}><Download className="h-3.5 w-3.5" /> Excel template</Button>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900 dark:text-text-primary">Export your transactions</p>
                <p className="text-sm text-gray-500 dark:text-text-secondary">
                  Download everything as CSV, Excel, PDF, JSON or a shareable image. For a full copy you can restore later, use{' '}
                  <Link to={STUDENT_ROUTES.settings} className="font-semibold text-brand-700 hover:underline dark:text-primary-accent">Settings → Backups</Link>.
                </p>
              </div>
              <ExportMenu filters={{}} currency={currency} owner={user?.fullName ?? ''} />
            </div>
          </Card>
        </>
      )}

      {/* ── Step 2: map columns ────────────────────────────────── */}
      {step === 'map' && (
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent"><FileSpreadsheet className="h-5 w-5" /></span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">{fileName}</p>
                <p className="text-xs text-gray-500 dark:text-text-muted">{table.length - (hasHeader ? 1 : 0)} rows · we guessed the columns below — check them</p>
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-text-secondary">
              <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
              First row is headings
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLE_LABELS.map(({ role, label, help }) => (
              <label key={role} className="text-sm">
                <span className="font-medium text-gray-700 dark:text-text-secondary">{label}</span>
                <span className="ml-1 text-xs text-gray-400 dark:text-text-muted">{help}</span>
                <select
                  className={cn(selectCls, 'mt-1')}
                  value={columns[role] ?? ''}
                  onChange={(e) => setColumns((c) => {
                    const next = { ...c };
                    if (e.target.value === '') delete next[role];
                    else next[role] = Number(e.target.value);
                    return next;
                  })}
                >
                  <option value="">— none —</option>
                  {Array.from({ length: width }, (_, i) => <option key={i} value={i}>{columnName(i)}</option>)}
                </select>
              </label>
            ))}
            <label className="text-sm">
              <span className="font-medium text-gray-700 dark:text-text-secondary">Date format</span>
              <select className={cn(selectCls, 'mt-1')} value={dateOrder} onChange={(e) => setDateOrder(e.target.value as DateOrder)}>
                <option value="auto">Automatic (day first, e.g. 31/01/2025)</option>
                <option value="dmy">Day / Month / Year</option>
                <option value="mdy">Month / Day / Year</option>
                <option value="ymd">Year-Month-Day</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="font-medium text-gray-700 dark:text-text-secondary">Amounts are</span>
              <select className={cn(selectCls, 'mt-1')} value={amountMode} onChange={(e) => setAmountMode(e.target.value as AmountMode)}>
                <option value="auto">Detect (type column or +/- signs)</option>
                <option value="expense">All expenses</option>
                <option value="income">All income</option>
                <option value="signed">Negative = expense, positive = income</option>
              </select>
            </label>
          </div>

          <div className="mt-5 overflow-x-auto rounded-lg border border-gray-100 dark:border-white/[0.06]">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-white/[0.03] dark:text-text-muted">
                <tr><th className="px-3 py-2">Row</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Description</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {preview.rows.slice(0, 6).map((r) => (
                  <tr key={r.line}>
                    <td className="px-3 py-2 text-gray-400">{r.line}</td>
                    <td className="px-3 py-2 text-gray-700 dark:text-text-secondary">{formatDate(r.occurredAt)}</td>
                    <td className="max-w-[240px] truncate px-3 py-2 text-gray-900 dark:text-text-primary">{r.description || '—'}</td>
                    <td className="px-3 py-2"><Badge tone={r.type === 'income' ? 'success' : 'danger'} size="sm">{r.type}</Badge></td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-900 dark:text-text-primary">{formatCurrency(r.amount, currency)}</td>
                  </tr>
                ))}
                {!preview.rows.length && <tr><td colSpan={5} className="px-3 py-6 text-center text-sm text-gray-500">No rows can be read yet — pick the date and amount columns.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-text-muted">
            {preview.rows.length} of {preview.totalRows} rows readable{preview.skipped.length ? ` · ${preview.skipped.length} will be skipped (${Array.from(new Set(preview.skipped.map((s) => s.reason))).join(', ').toLowerCase()})` : ''}.
          </p>

          <div className="mt-5 flex justify-between gap-3">
            <Button variant="outline" onClick={reset}><ArrowLeft className="h-4 w-4" /> Choose another file</Button>
            <Button variant="primary" onClick={() => void goToReview()} disabled={!preview.rows.length}>Continue <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {/* ── Step 3: review ─────────────────────────────────────── */}
      {step === 'review' && (
        <Card noPadding>
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-100 p-4 dark:border-white/10 sm:p-5">
            <div>
              <p className="font-semibold text-gray-900 dark:text-text-primary">{included.length} of {rows.length} rows selected</p>
              <p className="text-xs text-gray-500 dark:text-text-muted">
                Income {formatCurrency(totals.income, currency)} · Expenses {formatCurrency(totals.expense, currency)}
                {skipped.length > 0 && ` · ${skipped.length} unreadable rows left out`}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500 dark:text-text-muted">
                {isSuggesting ? <><Sparkles className="h-3.5 w-3.5 animate-pulse text-brand-600" /> Suggesting categories…</> : <>Categories are suggestions — change any of them before importing.</>}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-xs text-gray-600 dark:text-text-secondary">
                Set category for selected rows
                <select className={cn(selectCls, 'mt-1 w-52')} value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)}>
                  <option value="">Choose…</option>
                  <optgroup label="Expense">{categories.filter((c) => c.type === 'expense').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                  <optgroup label="Income">{categories.filter((c) => c.type === 'income').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>
                </select>
              </label>
              <Button variant="outline" size="sm" disabled={!bulkCategory} onClick={applyBulkCategory}>Apply</Button>
            </div>
          </div>

          <div className="max-h-[55vh] overflow-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="sticky top-0 z-10 bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-surface dark:text-text-muted">
                <tr>
                  <th className="px-3 py-2.5">
                    <input type="checkbox" aria-label="Select all rows" checked={included.length === rows.length} onChange={(e) => setRows((p) => p.map((r) => ({ ...r, include: e.target.checked })))} className="h-4 w-4 rounded accent-brand-600" />
                  </th>
                  <th className="px-3 py-2.5">Date</th>
                  <th className="px-3 py-2.5">Description</th>
                  <th className="px-3 py-2.5">Type</th>
                  <th className="px-3 py-2.5">Category</th>
                  <th className="px-3 py-2.5 text-right">Amount</th>
                  <th className="px-2 py-2.5"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {rows.map((r) => {
                  const badge = r.suggestion ? SOURCE_BADGE[r.suggestion] : undefined;
                  return (
                    <tr key={r.key} className={cn(!r.include && 'opacity-50')}>
                      <td className="px-3 py-2"><input type="checkbox" aria-label={`Include row ${r.line}`} checked={r.include} onChange={(e) => updateRow(r.key, { include: e.target.checked })} className="h-4 w-4 rounded accent-brand-600" /></td>
                      <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-text-secondary">{formatDate(r.occurredAt)}</td>
                      <td className="px-3 py-2">
                        <input value={r.description} onChange={(e) => updateRow(r.key, { description: e.target.value.slice(0, 300) })} aria-label={`Description for row ${r.line}`} className="w-full min-w-[160px] rounded-md border border-transparent bg-transparent px-1.5 py-1 text-gray-900 hover:border-gray-200 focus:border-brand-400 focus:outline-none dark:text-text-primary dark:hover:border-white/10" />
                      </td>
                      <td className="px-3 py-2">
                        <select value={r.type} onChange={(e) => updateRow(r.key, { type: e.target.value as 'income' | 'expense' })} aria-label={`Type for row ${r.line}`} className={cn(selectCls, 'w-28 py-1.5')}>
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <select value={r.categoryId} onChange={(e) => updateRow(r.key, { categoryId: e.target.value })} aria-label={`Category for row ${r.line}`} className={cn(selectCls, 'w-44 py-1.5', !r.categoryId && 'border-amber-300')}>
                            <option value="" disabled>{isSuggesting ? 'Suggesting…' : 'Choose…'}</option>
                            {categories.filter((c) => c.type === r.type).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                          {badge && <Badge tone={badge.tone} size="sm" title="Where this suggestion came from"><badge.icon className="h-3 w-3" />{badge.label}</Badge>}
                        </div>
                      </td>
                      <td className={cn('whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums', r.type === 'income' ? 'text-brand-700 dark:text-primary-accent' : 'text-gray-900 dark:text-text-primary')}>
                        {r.type === 'income' ? '+' : '−'}{formatCurrency(r.amount, currency)}
                      </td>
                      <td className="px-2 py-2">
                        <button type="button" onClick={() => setRows((p) => p.filter((x) => x.key !== r.key))} aria-label={`Remove row ${r.line}`} className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="h-3.5 w-3.5" /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-4 dark:border-white/10 sm:p-5">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-text-secondary">
              <input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="h-4 w-4 rounded accent-brand-600" />
              Skip rows I've already logged (same day, amount and description)
            </label>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('map')}><ArrowLeft className="h-4 w-4" /> Back</Button>
              <Button variant="primary" isLoading={isImporting} disabled={isSuggesting || !included.length} onClick={() => void handleImport()}>
                Import {included.length} transaction{included.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
