import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { Button, Card } from '@/components/common';
import { STUDENT_ROUTES } from '@/constants/routes';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { categoryService, transactionService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Category, CategoryType } from '@/types/category';
import type { CsvImportRow } from '@/types/transaction';

function splitCsvLine(line: string): string[] {
  return line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
}

function parseCsv(text: string): { rows: CsvImportRow[]; invalidRows: number; totalRows: number } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { rows: [], invalidRows: 0, totalRows: 0 };

  const header  = splitCsvLine(lines[0]).map((c) => c.toLowerCase());
  const dateIdx = header.findIndex((c) => ['date', 'occurredat', 'occurred_at'].includes(c));
  const descIdx = header.findIndex((c) => ['description', 'desc', 'memo'].includes(c));
  const amtIdx  = header.findIndex((c) => ['amount', 'value'].includes(c));

  const rows: CsvImportRow[] = [];
  let invalidRows = 0;

  for (const line of lines.slice(1)) {
    const cells  = splitCsvLine(line);
    const raw    = dateIdx >= 0 ? cells[dateIdx] : undefined;
    const rawAmt = amtIdx  >= 0 ? cells[amtIdx]  : undefined;
    const desc   = descIdx >= 0 ? cells[descIdx]  : '';
    const parsed = raw ? new Date(raw) : null;
    const amt    = rawAmt ? Number(rawAmt.replace(/[^0-9.-]/g, '')) : NaN;
    if (!parsed || isNaN(parsed.getTime()) || isNaN(amt)) { invalidRows++; continue; }
    rows.push({ occurredAt: parsed.toISOString(), description: desc || 'Imported transaction', amount: Math.abs(amt) });
  }
  return { rows, invalidRows, totalRows: lines.length - 1 };
}

const selectCls = cn(
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-inset',
  'border-gray-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20',
  'dark:border-white/8 dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent/70',
);

export function ImportPage() {
  const { user } = useAuth();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [fileName,      setFileName]      = useState<string | null>(null);
  const [preview,       setPreview]       = useState<{ rows: CsvImportRow[]; invalidRows: number; totalRows: number } | null>(null);
  const [parseError,    setParseError]    = useState<string | null>(null);
  const [importType,    setImportType]    = useState<CategoryType>('expense');
  const [categoryId,    setCategoryId]    = useState('');
  const [importError,   setImportError]   = useState<string | null>(null);
  const [isImporting,   setIsImporting]   = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [categories,    setCategories]    = useState<Category[]>([]);

  useEffect(() => {
    if (!user) return;
    void categoryService.list(user.id, importType).then(setCategories);
  }, [user, importType]);

  function handleFile(file: File) {
    setParseError(null); setImportError(null); setImportedCount(null);
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please choose a .csv file.'); setPreview(null); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = parseCsv(String(reader.result ?? ''));
      if (!result.rows.length) {
        setParseError('No valid rows found. Make sure your CSV has "date", "description", and "amount" columns.');
        setPreview(null); return;
      }
      setPreview(result); setImportType('expense'); setCategoryId('');
    };
    reader.onerror = () => setParseError('Could not read that file. Please try again.');
    reader.readAsText(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleConfirm() {
    if (!preview || !user) return;
    if (!categoryId) { setImportError('Choose a category for these transactions.'); return; }
    setImportError(null); setIsImporting(true);
    try {
      const created = await transactionService.createMany(user.id, preview.rows.map((r) => ({
        type: importType, categoryId, amount: r.amount,
        description: r.description, occurredAt: r.occurredAt,
      })));
      setImportedCount(created.length);
      setPreview(null); setFileName(null);
    } finally { setIsImporting(false); }
  }

  /* ── Success ──────────────────────────────────────────────────── */
  if (importedCount !== null) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="flex flex-col items-center gap-4 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent">
            <CheckCircle2 className="h-8 w-8" />
          </span>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-text-primary">
              {importedCount} transaction{importedCount !== 1 ? 's' : ''} imported
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary">
              Your transactions have been added. Head to the list to review them.
            </p>
          </div>
          <div className="mt-1 flex gap-3">
            <Button variant="outline" onClick={() => setImportedCount(null)}>Import another file</Button>
            <Link to={STUDENT_ROUTES.transactions}><Button variant="primary">View Transactions</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Import Transactions</h1>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
          Bring in a CSV instead of re-typing months of history.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { step: '1', label: 'Upload CSV',      desc: 'Drag & drop or browse for your file' },
          { step: '2', label: 'Preview rows',    desc: 'Check the data before it imports' },
          { step: '3', label: 'Confirm import',  desc: 'Choose a category and confirm' },
        ].map(({ step, label, desc }) => (
          <div key={step} className="rounded-xl border border-gray-100 bg-white p-3 shadow-card dark:border-white/[0.06] dark:bg-surface-elevated">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700 dark:bg-primary/15 dark:text-primary-accent">
              {step}
            </span>
            <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-text-primary">{label}</p>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-text-muted">{desc}</p>
          </div>
        ))}
      </div>

      {/* Drop zone */}
      {!preview && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center gap-4 rounded-xl border-2 border-dashed p-14 text-center',
            'border-gray-200 bg-gray-50/40 transition-colors duration-200',
            'hover:border-brand-300 hover:bg-brand-50/30',
            'dark:border-white/8 dark:bg-white/[0.015] dark:hover:border-primary/40 dark:hover:bg-primary/[0.03]',
          )}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent">
            <Upload className="h-6 w-6" />
          </span>
          <div>
            <p className="font-semibold text-gray-900 dark:text-text-primary">Drag and drop your CSV here</p>
            <p className="mt-0.5 text-sm text-gray-400 dark:text-text-muted">or click to browse your files</p>
          </div>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Choose File
          </Button>
          <input
            ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <p className="text-xs text-gray-400 dark:text-text-muted">
            Expected columns:{' '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/8">date</code>{', '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/8">description</code>{', '}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/8">amount</code>
          </p>
        </div>
      )}

      {/* Parse error */}
      {fileName && parseError && (
        <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 dark:border-red-500/20 dark:bg-red-950/20">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
          <p className="text-sm text-red-700 dark:text-red-300">{parseError}</p>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <Card>
          {/* File info row */}
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-primary/15 dark:text-primary-accent">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-text-primary">{fileName}</p>
                <p className="text-xs text-gray-400 dark:text-text-muted">
                  {preview.rows.length} of {preview.totalRows} rows ready
                  {preview.invalidRows > 0 && ` · ${preview.invalidRows} skipped`}
                </p>
              </div>
            </div>
            <Button
              variant="ghost" size="sm"
              onClick={() => { setPreview(null); setFileName(null); setImportError(null); }}
            >
              Clear
            </Button>
          </div>

          {/* Preview table */}
          <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-100 dark:border-white/[0.06]">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 border-b border-gray-100 bg-gray-50 dark:border-white/[0.06] dark:bg-surface">
                <tr>
                  {['Date', 'Description', 'Amount'].map((h, i) => (
                    <th
                      key={h}
                      className={cn(
                        'px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-text-muted',
                        i === 2 && 'text-right',
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {preview.rows.map((row, i) => (
                  <tr key={i} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 text-gray-500 dark:text-text-secondary">{formatDate(row.occurredAt)}</td>
                    <td className="max-w-[180px] truncate px-4 py-2.5 text-gray-900 dark:text-text-primary">{row.description}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-gray-900 dark:text-text-primary">
                      {formatCurrency(row.amount, DEFAULT_CURRENCY)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Import options */}
          <div className="mt-5 flex flex-col gap-4 border-t border-gray-50 pt-5 dark:border-white/[0.04] sm:flex-row sm:items-end">
            {/* Type toggle */}
            <div className="shrink-0">
              <span className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                Import as
              </span>
              <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-white/8">
                {(['income', 'expense'] as CategoryType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setImportType(t); setCategoryId(''); }}
                    className={cn(
                      'rounded-md px-4 py-1.5 text-sm font-semibold capitalize transition-all duration-150',
                      importType === t
                        ? 'bg-white text-gray-900 shadow-btn dark:bg-surface-elevated dark:text-text-primary'
                        : 'text-gray-500 hover:text-gray-700 dark:text-text-muted dark:hover:text-text-secondary',
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Category select */}
            <div className="flex-1">
              <label htmlFor="import-cat" className="block text-sm font-medium text-gray-700 dark:text-text-secondary mb-1.5">
                Category for all rows
              </label>
              <select
                id="import-cat"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={selectCls}
              >
                <option value="" disabled>Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {importError && (
            <p className="mt-2 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {importError}
            </p>
          )}

          {/* Actions */}
          <div className="mt-4 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => { setPreview(null); setFileName(null); setImportError(null); }}
            >
              Cancel
            </Button>
            <Button variant="primary" isLoading={isImporting} onClick={() => void handleConfirm()}>
              Confirm Import
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
