import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, FileSpreadsheet, Upload } from 'lucide-react';
import { Button, Card } from '@/components/common';
import { STUDENT_ROUTES } from '@/constants/routes';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { categoryService, transactionService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { CategoryType } from '@/types/category';
import type { CsvImportRow } from '@/types/transaction';

function splitCsvLine(line: string): string[] {
  return line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

function parseCsv(text: string): { rows: CsvImportRow[]; invalidRows: number; totalRows: number } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return { rows: [], invalidRows: 0, totalRows: 0 };

  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const dateIndex = header.findIndex((cell) => ['date', 'occurredat', 'occurred_at'].includes(cell));
  const descriptionIndex = header.findIndex((cell) => ['description', 'desc', 'memo'].includes(cell));
  const amountIndex = header.findIndex((cell) => ['amount', 'value'].includes(cell));

  const dataLines = lines.slice(1);
  const rows: CsvImportRow[] = [];
  let invalidRows = 0;

  for (const line of dataLines) {
    const cells = splitCsvLine(line);
    const rawDate = dateIndex >= 0 ? cells[dateIndex] : undefined;
    const rawAmount = amountIndex >= 0 ? cells[amountIndex] : undefined;
    const description = descriptionIndex >= 0 ? cells[descriptionIndex] : '';

    const parsedDate = rawDate ? new Date(rawDate) : null;
    const parsedAmount = rawAmount ? Number(rawAmount.replace(/[^0-9.-]/g, '')) : NaN;

    if (!parsedDate || Number.isNaN(parsedDate.getTime()) || Number.isNaN(parsedAmount)) {
      invalidRows += 1;
      continue;
    }

    rows.push({
      occurredAt: parsedDate.toISOString(),
      description: description || 'Imported transaction',
      amount: Math.abs(parsedAmount),
    });
  }

  return { rows, invalidRows, totalRows: dataLines.length };
}

export function ImportPage() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ rows: CsvImportRow[]; invalidRows: number; totalRows: number } | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importType, setImportType] = useState<CategoryType>('expense');
  const [categoryId, setCategoryId] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importedCount, setImportedCount] = useState<number | null>(null);

  const categories = useMemo(() => (user ? categoryService.list(user.id, importType) : []), [user, importType]);

  function handleFile(file: File) {
    setParseError(null);
    setImportError(null);
    setImportedCount(null);
    setFileName(file.name);

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please choose a .csv file.');
      setPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      const result = parseCsv(text);
      if (result.rows.length === 0) {
        setParseError('No valid rows found. Make sure your CSV has "date", "description", and "amount" columns.');
        setPreview(null);
        return;
      }
      setPreview(result);
      setImportType('expense');
      setCategoryId('');
    };
    reader.onerror = () => setParseError('Could not read that file. Please try again.');
    reader.readAsText(file);
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function handleConfirm() {
    if (!preview || !user) return;
    if (!categoryId) {
      setImportError('Choose a category for these transactions.');
      return;
    }
    setImportError(null);
    setIsImporting(true);
    try {
      const created = transactionService.createMany(
        user.id,
        preview.rows.map((row) => ({
          type: importType,
          categoryId,
          amount: row.amount,
          description: row.description,
          occurredAt: row.occurredAt,
        })),
        'csv-import',
      );
      setImportedCount(created.length);
      setPreview(null);
      setFileName(null);
    } finally {
      setIsImporting(false);
    }
  }

  if (importedCount !== null) {
    return (
      <div className="mx-auto max-w-xl">
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h1 className="text-xl font-bold text-gray-900">
            {importedCount} transaction{importedCount === 1 ? '' : 's'} imported
          </h1>
          <p className="max-w-sm text-sm text-gray-500">
            Your transactions have been added. Head to your transaction list to review them.
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setImportedCount(null)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Import another file
            </button>
            <Link to={STUDENT_ROUTES.transactions}>
              <Button variant="primary">View Transactions</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Transactions</h1>
        <p className="mt-1 text-sm text-gray-500">
          Already tracking spend elsewhere? Bring in a CSV instead of retyping months of history.
        </p>
      </div>

      {!preview && (
        <Card
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          className="flex flex-col items-center gap-3 border-2 border-dashed border-gray-300 bg-gray-50/50 p-10 text-center shadow-none hover:border-brand-400"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-700">
            <Upload className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-gray-900">Drag and drop your CSV here</p>
          <p className="text-xs text-gray-500">or</p>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            Choose File
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <p className="mt-2 text-xs text-gray-400">
            Expects columns: <code className="rounded bg-gray-100 px-1 py-0.5">date</code>,{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">description</code>,{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5">amount</code>
          </p>
        </Card>
      )}

      {fileName && parseError && (
        <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-4 shadow-none">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          <p className="text-sm text-red-700">{parseError}</p>
        </Card>
      )}

      {preview && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-brand-600" />
              <p className="text-sm font-semibold text-gray-900">{fileName}</p>
            </div>
            <p className="text-xs text-gray-500">
              {preview.rows.length} of {preview.totalRows} rows ready
              {preview.invalidRows > 0 && ` · ${preview.invalidRows} skipped`}
            </p>
          </div>

          <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-gray-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.rows.map((row, index) => (
                  <tr key={index}>
                    <td className="px-3 py-2 text-gray-600">{formatDate(row.occurredAt)}</td>
                    <td className="px-3 py-2 text-gray-900">{row.description}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      {formatCurrency(row.amount, DEFAULT_CURRENCY)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700">Import as</span>
              <div className="mt-1 inline-flex rounded-lg bg-gray-100 p-1">
                <button
                  type="button"
                  onClick={() => {
                    setImportType('income');
                    setCategoryId('');
                  }}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200',
                    importType === 'income' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  Income
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setImportType('expense');
                    setCategoryId('');
                  }}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-sm font-semibold transition-colors duration-200',
                    importType === 'expense' ? 'bg-brand-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  Expense
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label htmlFor="import-category" className="text-sm font-medium text-gray-700">
                Category for all rows
              </label>
              <select
                id="import-category"
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {importError && <p className="mt-2 text-sm text-red-600">{importError}</p>}

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setFileName(null);
                setImportError(null);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <Button variant="primary" onClick={() => void handleConfirm()} isLoading={isImporting}>
              Confirm Import
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
