import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Download, FileJson, FileSpreadsheet, FileText, Image as ImageIcon, Sheet } from 'lucide-react';
import { transactionsApi, type ExportFilters, type ExportRow } from '@/api/transactions.api';
import { formatCurrency } from '@/utils/format';
import { downloadBlob } from '@/utils/download';
import { cn } from '@/utils/cn';

type Format = 'csv' | 'xlsx' | 'json' | 'pdf' | 'png';

const OPTIONS: { id: Format; label: string; hint: string; icon: typeof FileText }[] = [
  { id: 'csv', label: 'CSV', hint: 'Opens in any spreadsheet', icon: Sheet },
  { id: 'xlsx', label: 'Excel (.xlsx)', hint: 'With totals and formatting', icon: FileSpreadsheet },
  { id: 'pdf', label: 'PDF', hint: 'Printable statement', icon: FileText },
  { id: 'png', label: 'Image (.png)', hint: 'A shareable summary card', icon: ImageIcon },
  { id: 'json', label: 'JSON', hint: 'For developers / re-import', icon: FileJson },
];

const BOM = String.fromCharCode(0xfeff);
const stamp = () => new Date().toISOString().slice(0, 10);

function toCsv(rows: ExportRow[]) {
  const head = ['Date', 'Type', 'Category', 'Description', 'Merchant', 'Amount'];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = [head, ...rows.map((r) => [r.date, r.type, r.category, r.description, r.merchant, r.type === 'income' ? r.amount : -r.amount])];
  // BOM so Excel opens ₦ and other symbols correctly.
  return `${BOM}${lines.map((l) => l.map(esc).join(',')).join('\r\n')}`;
}

/** The card rendered off-screen and captured for the image export. */
function SummaryCard({ rows, currency, owner }: { rows: ExportRow[]; currency: string; owner: string }) {
  const income = rows.filter((r) => r.type === 'income').reduce((a, r) => a + r.amount, 0);
  const expense = rows.filter((r) => r.type === 'expense').reduce((a, r) => a + r.amount, 0);
  const byCat = new Map<string, number>();
  rows.filter((r) => r.type === 'expense').forEach((r) => byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.amount));
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const range = rows.length ? `${rows[rows.length - 1].date} → ${rows[0].date}` : 'No transactions';
  return (
    <div style={{ width: 720, padding: 32, background: 'linear-gradient(135deg,#f0fdf4 0%,#ffffff 60%)', fontFamily: "'Naira','Plus Jakarta Sans',sans-serif", color: '#14301f' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#1c8f53' }}>Campus Coin</div>
          <div style={{ fontSize: 13, color: '#4b5563' }}>{owner} · {range}</div>
        </div>
        <div style={{ fontSize: 12, color: '#6b7280' }}>{rows.length} transactions</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 20 }}>
        {[['Income', income, '#1c8f53'], ['Expenses', expense, '#dc2626'], ['Net', income - expense, income - expense >= 0 ? '#1c8f53' : '#dc2626']].map(([label, value, color]) => (
          <div key={label as string} style={{ background: '#fff', border: '1px solid #e5efe8', borderRadius: 14, padding: 14 }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{label as string}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: color as string }}>{formatCurrency(value as number, currency)}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 18, background: '#fff', border: '1px solid #e5efe8', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Top spending categories</div>
        {top.length ? top.map(([name, amount]) => (
          <div key={name} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{name}</span><strong>{formatCurrency(amount, currency)}</strong></div>
            <div style={{ height: 8, background: '#eef5f0', borderRadius: 99, marginTop: 4 }}>
              <div style={{ width: `${Math.max(4, Math.round((amount / (top[0][1] || 1)) * 100))}%`, height: 8, background: '#1c8f53', borderRadius: 99 }} />
            </div>
          </div>
        )) : <div style={{ fontSize: 13, color: '#6b7280' }}>No expenses in this selection.</div>}
      </div>
      <div style={{ marginTop: 18, background: '#fff', border: '1px solid #e5efe8', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Latest transactions</div>
        {rows.slice(0, 8).map((r) => (
          <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '5px 0', borderTop: '1px solid #f1f5f2' }}>
            <span style={{ color: '#6b7280', width: 90 }}>{r.date}</span>
            <span style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', paddingRight: 8 }}>{r.description || r.category}</span>
            <strong style={{ color: r.type === 'income' ? '#1c8f53' : '#111827' }}>{r.type === 'income' ? '+' : '−'}{formatCurrency(r.amount, currency)}</strong>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 14, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>Made with Campus Coin · by Team Flandek</div>
    </div>
  );
}

/** "Export" dropdown for the transactions list; exports what the filters show. */
export function ExportMenu({ filters, currency, owner }: { filters: ExportFilters; currency: string; owner: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<Format | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [cardRows, setCardRows] = useState<ExportRow[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  useEffect(() => {
    if (!message) return undefined;
    const t = window.setTimeout(() => setMessage(null), 5000);
    return () => window.clearTimeout(t);
  }, [message]);

  async function run(format: Format) {
    setOpen(false);
    setBusy(format);
    setMessage(null);
    try {
      if (format === 'pdf') {
        downloadBlob(await transactionsApi.exportPdf(filters), `CampusCoin-Transactions-${stamp()}.pdf`);
      } else {
        const { rows, truncated } = await transactionsApi.exportRows(filters);
        if (!rows.length) { setMessage({ ok: false, text: 'There are no transactions to export with these filters.' }); return; }
        if (format === 'csv') downloadBlob(new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' }), `CampusCoin-Transactions-${stamp()}.csv`);
        if (format === 'json') downloadBlob(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), currency, transactions: rows }, null, 2)], { type: 'application/json' }), `CampusCoin-Transactions-${stamp()}.json`);
        if (format === 'xlsx') {
          const XLSX = await import('xlsx');
          const income = rows.filter((r) => r.type === 'income').reduce((a, r) => a + r.amount, 0);
          const expense = rows.filter((r) => r.type === 'expense').reduce((a, r) => a + r.amount, 0);
          const sheet = XLSX.utils.aoa_to_sheet([
            ['Date', 'Type', 'Category', 'Description', 'Merchant', `Amount (${currency})`],
            ...rows.map((r) => [r.date, r.type, r.category, r.description, r.merchant, r.type === 'income' ? r.amount : -r.amount]),
            [],
            ['', '', '', '', 'Total income', income],
            ['', '', '', '', 'Total expenses', -expense],
            ['', '', '', '', 'Net', income - expense],
          ]);
          sheet['!cols'] = [{ wch: 12 }, { wch: 9 }, { wch: 18 }, { wch: 36 }, { wch: 18 }, { wch: 16 }];
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, sheet, 'Transactions');
          XLSX.writeFile(wb, `CampusCoin-Transactions-${stamp()}.xlsx`);
        }
        if (format === 'png') {
          setCardRows(rows);
          await new Promise((r) => window.setTimeout(r, 120));
          const node = cardRef.current?.firstElementChild as HTMLElement | null;
          if (!node) throw new Error('render');
          const { toBlob } = await import('html-to-image');
          const blob = await toBlob(node, { pixelRatio: 2, cacheBust: true, backgroundColor: '#ffffff' });
          if (!blob) throw new Error('render');
          downloadBlob(blob, `CampusCoin-Summary-${stamp()}.png`);
        }
        setMessage({ ok: true, text: truncated ? 'Exported the latest 5,000 transactions.' : `Exported ${rows.length} transaction${rows.length === 1 ? '' : 's'}.` });
        return;
      }
      setMessage({ ok: true, text: 'PDF downloaded.' });
    } catch {
      setMessage({ ok: false, text: 'The export failed. Please try again.' });
    } finally {
      setBusy(null);
      setCardRows(null);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy !== null}
        className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-btn transition-all hover:-translate-y-px hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-surface dark:text-text-primary dark:hover:bg-white/5"
      >
        <Download className="h-4 w-4" /> {busy ? 'Exporting…' : 'Export'} <ChevronDown className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl dark:border-white/10 dark:bg-surface-elevated">
          {OPTIONS.map(({ id, label, hint, icon: Icon }) => (
            <button key={id} type="button" role="menuitem" onClick={() => void run(id)} className="flex w-full items-start gap-3 px-3.5 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/5">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-primary-accent" />
              <span>
                <span className="block text-sm font-semibold text-gray-900 dark:text-text-primary">{label}</span>
                <span className="block text-xs text-gray-500 dark:text-text-muted">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={cn('absolute right-0 top-full z-20 mt-2 w-64 rounded-lg px-3 py-2 text-xs shadow-lg', message.ok ? 'bg-brand-50 text-brand-800 dark:bg-primary/15 dark:text-primary-accent' : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300')}>
          {message.text}
        </p>
      )}
      {cardRows && createPortal(
        <div ref={cardRef} aria-hidden="true" style={{ position: 'fixed', left: -10000, top: 0 }}>
          <SummaryCard rows={cardRows} currency={currency} owner={owner} />
        </div>,
        document.body,
      )}
    </div>
  );
}
