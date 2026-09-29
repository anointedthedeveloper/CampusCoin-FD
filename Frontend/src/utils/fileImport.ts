/**
 * Reads a transaction file in the browser and turns it into a table of
 * cells. Spreadsheet formats are handled by SheetJS and Word documents by
 * reading their tables with JSZip — both loaded only when needed.
 */

export type Cell = string | number | Date | boolean | null;
export type Table = Cell[][];

export const ACCEPTED_EXTENSIONS = ['.csv', '.tsv', '.txt', '.xlsx', '.xls', '.ods', '.docx', '.json'] as const;
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',');
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_ROWS = 2000;

function extensionOf(name: string) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

async function readSpreadsheet(file: File, asText: boolean): Promise<Table> {
  const XLSX = await import('xlsx');
  const workbook = asText
    ? XLSX.read(await file.text(), { type: 'string', raw: true, cellDates: true })
    : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  // Use the first sheet that actually has rows.
  for (const name of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<Cell[]>(workbook.Sheets[name], { header: 1, raw: true, defval: '', blankrows: false });
    if (rows.some((r) => r.some((c) => c !== '' && c !== null))) return rows;
  }
  return [];
}

/** The largest table in a .docx (bank statements pasted into Word, etc.). */
async function readDocx(file: File): Promise<Table> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('That Word file has no readable content.');
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const textOf = (el: Element) => Array.from(el.getElementsByTagNameNS(W, 't')).map((t) => t.textContent ?? '').join('').trim();

  const tables = Array.from(doc.getElementsByTagNameNS(W, 'tbl')).map((tbl) =>
    Array.from(tbl.getElementsByTagNameNS(W, 'tr')).map((tr) =>
      Array.from(tr.getElementsByTagNameNS(W, 'tc')).map((tc) => textOf(tc)),
    ),
  );
  const best = tables.sort((a, b) => b.length - a.length)[0];
  if (best && best.length > 1) return best;

  // No table: treat each paragraph as a CSV-style line ("2025-01-03, Lunch, 1500").
  const lines = Array.from(doc.getElementsByTagNameNS(W, 'p')).map(textOf).filter(Boolean);
  const delimiter = lines.some((l) => l.includes('\t')) ? '\t' : lines.some((l) => l.includes(';')) ? ';' : ',';
  return lines.map((l) => l.split(delimiter).map((c) => c.trim()));
}

async function readJson(file: File): Promise<Table> {
  const parsed: unknown = JSON.parse(await file.text());
  const list = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { transactions?: unknown[] }).transactions)
      ? (parsed as { transactions: unknown[] }).transactions
      : parsed && typeof parsed === 'object' && Array.isArray((parsed as { data?: unknown[] }).data)
        ? (parsed as { data: unknown[] }).data
        : null;
  if (!list) throw new Error('The JSON file should contain a list of transactions.');
  const objects = list.filter((x): x is Record<string, unknown> => Boolean(x) && typeof x === 'object' && !Array.isArray(x));
  const headers = Array.from(new Set(objects.flatMap((o) => Object.keys(o))));
  const toCell = (v: unknown): Cell => (v === undefined ? '' : typeof v === 'object' && v !== null ? JSON.stringify(v) : (v as Cell));
  return [headers, ...objects.map((o) => headers.map((h) => toCell(o[h])))];
}

/** Reads any supported file into rows of cells (first row is usually headers). */
export async function readTransactionFile(file: File): Promise<Table> {
  const ext = extensionOf(file.name);
  if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) {
    throw new Error(`"${ext || file.name}" files aren't supported. Use CSV, Excel (.xlsx/.xls), OpenDocument (.ods), Word (.docx) or JSON.`);
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('That file is larger than 10 MB. Split it into smaller files.');
  if (file.size === 0) throw new Error('That file is empty.');
  let table: Table;
  if (ext === '.docx') table = await readDocx(file);
  else if (ext === '.json') table = await readJson(file);
  else table = await readSpreadsheet(file, ext === '.csv' || ext === '.tsv' || ext === '.txt');
  // Trim fully blank rows and trailing blank cells.
  return table
    .map((r) => r.map((c) => (typeof c === 'string' ? c.trim() : c)))
    .filter((r) => r.some((c) => c !== '' && c !== null && c !== undefined));
}

/* ── Column detection ─────────────────────────────────────────────────── */

export type ColumnRole = 'date' | 'description' | 'amount' | 'debit' | 'credit' | 'type' | 'category';

const ROLE_WORDS: Record<ColumnRole, string[]> = {
  date: ['date', 'transaction date', 'trans date', 'txn date', 'value date', 'posting date', 'posted', 'occurredat', 'occurred_at', 'when', 'day', 'time'],
  description: ['description', 'desc', 'narration', 'details', 'detail', 'memo', 'remarks', 'remark', 'note', 'notes', 'particulars', 'item', 'name', 'title', 'merchant', 'payee', 'reference'],
  amount: ['amount', 'value', 'amt', 'sum', 'total', 'price', 'cost', 'naira', 'ngn'],
  debit: ['debit', 'debits', 'withdrawal', 'withdrawals', 'money out', 'paid out', 'out', 'dr', 'expense', 'spent'],
  credit: ['credit', 'credits', 'deposit', 'deposits', 'money in', 'paid in', 'in', 'cr', 'income', 'received'],
  type: ['type', 'kind', 'direction', 'transaction type', 'txn type', 'dr/cr', 'cr/dr'],
  category: ['category', 'categories', 'group', 'tag', 'class'],
};

export type ColumnMap = Partial<Record<ColumnRole, number>>;

const norm = (v: Cell) => String(v ?? '').trim().toLowerCase().replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ');

/** Does the first row look like headers (mostly words, not dates/numbers)? */
export function hasHeaderRow(table: Table): boolean {
  const first = table[0] ?? [];
  const known = Object.values(ROLE_WORDS).flat();
  return first.some((c) => known.includes(norm(c)));
}

/** Guesses which column holds what, from header names or the data itself. */
export function detectColumns(table: Table): ColumnMap {
  const map: ColumnMap = {};
  const header = hasHeaderRow(table) ? table[0].map(norm) : [];
  const taken = new Set<number>();
  const order: ColumnRole[] = ['date', 'debit', 'credit', 'type', 'category', 'amount', 'description'];
  for (const role of order) {
    const idx = header.findIndex((h, i) => !taken.has(i) && ROLE_WORDS[role].includes(h));
    const loose = idx >= 0 ? idx : header.findIndex((h, i) => !taken.has(i) && h.length > 2 && ROLE_WORDS[role].some((w) => w.length > 3 && h.includes(w)));
    if (loose >= 0) { map[role] = loose; taken.add(loose); }
  }
  if (map.amount !== undefined && (map.debit !== undefined || map.credit !== undefined)) {
    // A plain "amount" next to debit/credit is usually a running balance.
    if (/balance/.test(header[map.amount] ?? '')) delete map.amount;
  }

  // No headers: infer from the data in the first rows.
  if (!header.length) {
    const sample = table.slice(0, 20);
    const width = Math.max(...sample.map((r) => r.length));
    for (let i = 0; i < width; i++) {
      const values = sample.map((r) => r[i]).filter((c) => c !== '' && c !== null && c !== undefined);
      if (!values.length) continue;
      if (map.date === undefined && values.every((v) => parseDate(v, 'auto') !== null && !(typeof v === 'number' && v < 20000))) { map.date = i; continue; }
      if (map.amount === undefined && values.every((v) => parseAmount(v) !== null)) { map.amount = i; continue; }
      if (map.description === undefined && values.some((v) => typeof v === 'string' && /[a-z]/i.test(v))) map.description = i;
    }
  }
  return map;
}

/* ── Value parsing ────────────────────────────────────────────────────── */

export type DateOrder = 'auto' | 'dmy' | 'mdy' | 'ymd';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function validDate(y: number, m: number, d: number): Date | null {
  if (y < 100) y += y < 70 ? 2000 : 1900;
  const date = new Date(Date.UTC(y, m - 1, d, 12));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  if (y < 1970 || date.getTime() > Date.now() + 5 * 365 * 864e5) return null;
  return date;
}

/**
 * Parses dates as students actually write them: 2025-01-31, 31/01/2025
 * (day first by default, as in Nigeria), 01/31/2025, 31-Jan-2025,
 * "Jan 31, 2025", Excel serial numbers and real Date cells.
 */
export function parseDate(value: Cell, order: DateOrder): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : validDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  if (typeof value === 'number') {
    if (value > 20000 && value < 80000) {
      // Excel serial date (days since 1899-12-30).
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 864e5);
      return validDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    return null;
  }
  const s = String(value ?? '').trim();
  if (!s) return null;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return validDate(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
  if (m) {
    const a = +m[1], b = +m[2], y = +m[3];
    if (order === 'mdy') return validDate(y, a, b);
    if (order === 'dmy') return validDate(y, b, a);
    // auto: day first unless that's impossible.
    return a > 12 ? validDate(y, b, a) : b > 12 ? validDate(y, a, b) : validDate(y, b, a);
  }
  m = /^(\d{1,2})[\s\-/.]*([a-z]{3,})[a-z]*[\s\-/.,]*(\d{2,4})/i.exec(s);
  if (m && MONTHS.includes(m[2].slice(0, 3).toLowerCase())) return validDate(+m[3], MONTHS.indexOf(m[2].slice(0, 3).toLowerCase()) + 1, +m[1]);
  m = /^([a-z]{3,})[a-z]*[\s\-/.]+(\d{1,2})(?:st|nd|rd|th)?[\s,\-/.]+(\d{2,4})/i.exec(s);
  if (m && MONTHS.includes(m[1].slice(0, 3).toLowerCase())) return validDate(+m[3], MONTHS.indexOf(m[1].slice(0, 3).toLowerCase()) + 1, +m[2]);
  return null;
}

/** "₦1,500.00", "(2,000)", "-300", "1.5k", "NGN 2 000" → number (negative for debits). */
export function parseAmount(value: Cell): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let s = String(value ?? '').trim().toLowerCase();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) { negative = true; s = s.slice(1, -1); }
  if (/\b(dr|debit)\b/.test(s)) negative = true;
  if (s.includes('-')) negative = negative || /^[^\d]*-/.test(s) || /-$/.test(s);
  let multiplier = 1;
  const suffix = /(\d)\s*(k|m)\b/.exec(s);
  if (suffix) multiplier = suffix[2] === 'k' ? 1e3 : 1e6;
  const digits = s.replace(/[^0-9.]/g, '');
  if (!digits || !/\d/.test(digits) || (digits.match(/\./g) ?? []).length > 1) return null;
  const n = Number(digits) * multiplier;
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

export type AmountMode = 'auto' | 'expense' | 'income' | 'signed';

export interface ParsedRow {
  line: number;
  occurredAt: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryName?: string;
}

export interface ParseResult {
  rows: ParsedRow[];
  skipped: { line: number; reason: string }[];
  totalRows: number;
}

const INCOME_WORDS = /^(income|credit|cr|in|deposit|received|inflow|money in|\+)$/i;
const EXPENSE_WORDS = /^(expense|debit|dr|out|withdrawal|spent|outflow|money out|-)$/i;

/** Applies a column map to the table and returns clean rows ready to review. */
export function buildRows(table: Table, map: ColumnMap, opts: { dateOrder: DateOrder; amountMode: AmountMode; hasHeader: boolean }): ParseResult {
  const body = opts.hasHeader ? table.slice(1) : table;
  const firstLine = opts.hasHeader ? 2 : 1;
  const rows: ParsedRow[] = [];
  const skipped: ParseResult['skipped'] = [];
  const signedData = map.amount !== undefined && body.some((r) => (parseAmount(r[map.amount!]) ?? 0) < 0);

  body.slice(0, MAX_ROWS).forEach((r, i) => {
    const line = firstLine + i;
    const date = map.date !== undefined ? parseDate(r[map.date], opts.dateOrder) : null;
    if (!date) { skipped.push({ line, reason: 'No valid date' }); return; }

    let amount: number | null = null;
    let type: 'income' | 'expense' | null = null;
    const debit = map.debit !== undefined ? parseAmount(r[map.debit]) : null;
    const credit = map.credit !== undefined ? parseAmount(r[map.credit]) : null;
    if (debit) { amount = Math.abs(debit); type = 'expense'; }
    else if (credit) { amount = Math.abs(credit); type = 'income'; }
    else if (map.amount !== undefined) {
      const a = parseAmount(r[map.amount]);
      if (a !== null && a !== 0) {
        amount = Math.abs(a);
        const typeCell = map.type !== undefined ? String(r[map.type] ?? '').trim() : '';
        if (opts.amountMode === 'expense') type = 'expense';
        else if (opts.amountMode === 'income') type = 'income';
        else if (typeCell && INCOME_WORDS.test(typeCell)) type = 'income';
        else if (typeCell && EXPENSE_WORDS.test(typeCell)) type = 'expense';
        else if (opts.amountMode === 'signed' || signedData) type = a < 0 ? 'expense' : 'income';
        else type = 'expense';
      }
    }
    if (!amount || !type) { skipped.push({ line, reason: 'No amount' }); return; }
    if (amount > 1e12) { skipped.push({ line, reason: 'Amount too large' }); return; }

    const description = map.description !== undefined ? String(r[map.description] ?? '').trim().slice(0, 300) : '';
    const categoryName = map.category !== undefined ? String(r[map.category] ?? '').trim() : undefined;
    rows.push({ line, occurredAt: date.toISOString(), description, amount: Math.round(amount * 100) / 100, type, categoryName: categoryName || undefined });
  });
  if (body.length > MAX_ROWS) skipped.push({ line: firstLine + MAX_ROWS, reason: `Only the first ${MAX_ROWS} rows are imported at a time` });
  return { rows, skipped, totalRows: body.length };
}

/** A sample file in the chosen format so students know what works. */
export async function downloadTemplate(format: 'csv' | 'xlsx') {
  const rows = [
    ['Date', 'Description', 'Amount', 'Type', 'Category'],
    ['2025-09-01', 'Monthly allowance from Mum', 50000, 'income', 'Allowance'],
    ['2025-09-02', 'Jollof rice at the canteen', 1500, 'expense', 'Food'],
    ['2025-09-03', 'Bolt to campus', 1200, 'expense', 'Transport'],
    ['2025-09-05', 'MTN data bundle', 2000, 'expense', 'Subscriptions'],
    ['2025-09-10', 'Tutoring (2 sessions)', 8000, 'income', 'Part-time Job'],
  ];
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
  XLSX.writeFile(wb, `campus-coin-import-template.${format}`, { bookType: format });
}
