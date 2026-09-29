import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, FileText, Flame, Image as ImageIcon, Mail, PieChart, Wallet, BarChart2 } from 'lucide-react';
import { EmailReportDialog } from '@/components/reports/EmailReportDialog';
import { reportsApi } from '@/api/reports.api';
import { Card, EmptyState, PageSpinner } from '@/components/common';
import { CategoryDonutChart } from '@/components/dashboard/CategoryDonutChart';
import { IncomeExpenseTrendChart } from '@/components/dashboard/IncomeExpenseTrendChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate, formatMonthLabel } from '@/utils/format';
import { categoryService, reportService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { useMinLoadTime } from '@/hooks/useMinLoadTime';
import { cn } from '@/utils/cn';
import type { Category } from '@/types/category';
import type { MonthlyReport } from '@/types/report';
import type { TrendPoint } from '@/services/report.service';

function monthForOffset(offset: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function lastDayOfMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

interface WeekBucket { label: string; amount: number }

function groupIntoWeeks(dailySpend: { date: string; amount: number }[]): WeekBucket[] {
  const buckets = new Map<number, number>();
  for (const { date, amount } of dailySpend) {
    const day = Number(date.slice(8, 10));
    const weekIndex = Math.floor((day - 1) / 7);
    buckets.set(weekIndex, (buckets.get(weekIndex) ?? 0) + amount);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([i, amount]) => ({ label: `Week ${i + 1}`, amount }));
}

interface HeatmapCell { day: number | null; amount: number }
const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildHeatmapCells(month: string, dailySpend: { date: string; amount: number }[]): HeatmapCell[] {
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth  = new Date(year, monthNum, 0).getDate();
  const firstWeekday = new Date(year, monthNum - 1, 1).getDay();
  const amountByDay  = new Map(dailySpend.map((item) => [Number(item.date.slice(8, 10)), item.amount]));
  const cells: HeatmapCell[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, amount: 0 });
  for (let day = 1; day <= daysInMonth; day++) cells.push({ day, amount: amountByDay.get(day) ?? 0 });
  return cells;
}

function heatmapClass(amount: number, max: number): string {
  if (amount <= 0) return 'bg-gray-100 dark:bg-white/5';
  const ratio = max > 0 ? amount / max : 0;
  if (ratio >= 0.75) return 'bg-brand-700 text-white dark:bg-primary';
  if (ratio >= 0.5)  return 'bg-brand-500 text-white dark:bg-primary-accent dark:text-background';
  if (ratio >= 0.25) return 'bg-brand-200 dark:bg-primary-accent/35';
  return 'bg-brand-100 dark:bg-primary-accent/15';
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { user } = useAuth();
  const [monthOffset, setMonthOffset]   = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter]     = useState<'all' | 'income' | 'expense'>('all');
  const [startDate, setStartDate]       = useState('');
  const [endDate, setEndDate]           = useState('');
  const [exporting, setExporting]       = useState<null | 'pdf' | 'image'>(null);
  const [exportError, setExportError]   = useState<string | null>(null);
  const [emailOpen, setEmailOpen]       = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const currency = user?.settings?.currency ?? DEFAULT_CURRENCY;
  const [report, setReport]             = useState<MonthlyReport | null>(null);
  const [trend, setTrend]               = useState<TrendPoint[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [isLoading, setIsLoading]       = useState(true);

  const month = monthForOffset(monthOffset);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    let cancelled = false;
    async function load() {
      const [cats, rep, trendData] = await Promise.allSettled([
        categoryService.list(user!.id),
        reportService.getMonthlyReport(user!.id, month, {
          categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
          type: typeFilter === 'all' ? undefined : typeFilter,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
        reportService.getSixMonthTrend(user!.id, month),
      ]);
      if (cancelled) return;
      setCategories(cats.status === 'fulfilled' ? cats.value : []);
      setReport(rep.status === 'fulfilled' ? rep.value : null);
      setTrend(trendData.status === 'fulfilled' ? trendData.value : []);
      setIsLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [user, month, categoryFilter, typeFilter, startDate, endDate]);

  // Date filters apply within the selected month; reset them when it changes.
  useEffect(() => { setStartDate(''); setEndDate(''); }, [month]);

  const weeklySpend   = useMemo(() => (report ? groupIntoWeeks(report.dailySpend) : []), [report]);
  const heatmapCells  = useMemo(() => (report ? buildHeatmapCells(month, report.dailySpend) : []), [report, month]);
  const maxDailyAmt   = useMemo(() => Math.max(0, ...(report?.dailySpend.map((i) => i.amount) ?? [])), [report]);

  const showLoader = useMinLoadTime(isLoading);
  if (showLoader) return <PageSpinner label="Loading report…" />;

  // No report data for this month — show a friendly empty state instead of
  // returning null (which renders a blank white screen).
  if (!report) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Reports</h1>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">Your financial overview and insights.</p>
          </div>
        </div>
        {/* Month nav */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setMonthOffset((v) => v - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-btn transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-white/[0.08] dark:bg-surface dark:text-text-secondary dark:hover:bg-white/5"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8rem] text-center text-sm font-semibold text-gray-900 dark:text-text-primary">
            {formatMonthLabel(month)}
          </span>
          <button
            onClick={() => setMonthOffset((v) => v + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-btn transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-white/[0.08] dark:bg-surface dark:text-text-secondary dark:hover:bg-white/5"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <Card className="p-10">
          <EmptyState
            icon={BarChart2}
            title={`No data for ${formatMonthLabel(month)}`}
            description="Log some income or expenses this month and your report will appear here automatically."
          />
        </Card>
      </div>
    );
  }

  async function handleExportPdf() {
    setExporting('pdf');
    setExportError(null);
    try {
      downloadBlob(`CampusCoin-Report-${month}.pdf`, await reportsApi.downloadMonthlyPdf(month));
    } catch {
      setExportError('Could not generate the PDF. Please try again.');
    } finally {
      setExporting(null);
    }
  }

  async function handleExportImage() {
    if (!reportRef.current) return;
    setExporting('image');
    setExportError(null);
    try {
      const { toPng } = await import('html-to-image');
      const isDark = document.documentElement.classList.contains('dark');
      const dataUrl = await toPng(reportRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: isDark ? '#09120d' : '#f9fafb',
        filter: (node) => !(node instanceof HTMLElement && node.dataset.exportIgnore === 'true'),
      });
      const blob = await (await fetch(dataUrl)).blob();
      downloadBlob(`CampusCoin-Report-${month}.png`, blob);
    } catch {
      setExportError('Could not create the image. Please try again.');
    } finally {
      setExporting(null);
    }
  }

  const stats = [
    { label: 'Total Income',   value: formatCurrency(report.totalIncome, currency),  icon: ArrowUpRight,   tone: 'brand' as const },
    { label: 'Total Expenses', value: formatCurrency(report.totalExpense, currency), icon: ArrowDownRight, tone: 'red'   as const },
    { label: 'Net Savings',    value: formatCurrency(report.netSavings, currency),   icon: Wallet,         tone: 'blue'  as const },
  ];

  function handleExport() {
    downloadCsv(`campuscoin-${month}.csv`, [
      ['Campus Coin Report', formatMonthLabel(month)],
      [],
      ['Summary'],
      ['Total Income',   report!.totalIncome],
      ['Total Expenses', report!.totalExpense],
      ['Net Savings',    report!.netSavings],
      [],
      ['Category Breakdown'],
      ['Category', 'Amount', '%'],
      ...report!.categoryBreakdown.map((i) => [i.categoryName, i.amount, `${i.percentage}%`]),
      [],
      ['Daily Spending'],
      ['Date', 'Amount'],
      ...report!.dailySpend.map((i) => [i.date, i.amount]),
      [],
      ['Income by Source'],
      ['Source', 'Amount', '%'],
      ...(report!.incomeBreakdown ?? []).map((i) => [i.categoryName, i.amount, `${i.percentage}%`]),
      [],
      ['Transactions'],
      ['Date', 'Type', 'Description', 'Category', 'Amount'],
      ...(report!.transactions ?? []).map((t) => [t.occurredAt.slice(0, 10), t.type, t.description, t.categoryName, t.amount]),
    ]);
  }

  return (
    <div className="space-y-5" ref={reportRef}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Reports</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">Your financial overview and insights.</p>
        </div>
        <div className="flex flex-wrap gap-2" data-export-ignore="true">
          {[
            { key: 'pdf', label: exporting === 'pdf' ? 'Preparing…' : 'PDF', icon: FileText, onClick: () => void handleExportPdf() },
            { key: 'image', label: exporting === 'image' ? 'Preparing…' : 'Image', icon: ImageIcon, onClick: () => void handleExportImage() },
            { key: 'csv', label: 'CSV', icon: Download, onClick: handleExport },
            { key: 'email', label: 'Email', icon: Mail, onClick: () => setEmailOpen(true) },
          ].map(({ key, label, icon: Icon, onClick }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              disabled={exporting !== null}
              aria-label={key === 'email' ? 'Email this report' : `Export report as ${key.toUpperCase()}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-btn transition-all hover:-translate-y-px hover:border-gray-300 hover:bg-gray-50 disabled:opacity-60 dark:border-white/10 dark:bg-surface dark:text-text-primary dark:hover:bg-white/5"
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      </div>
      {emailOpen && <EmailReportDialog month={month} monthLabel={formatMonthLabel(month)} defaultEmail={user?.email ?? ''} onClose={() => setEmailOpen(false)} />}
      {exportError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">{exportError}</p>}

      {/* Month nav + category filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset((v) => v - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-btn transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-white/[0.08] dark:bg-surface dark:text-text-secondary dark:hover:bg-white/5"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8rem] text-center text-sm font-semibold text-gray-900 dark:text-text-primary">
            {formatMonthLabel(month)}
          </span>
          <button
            onClick={() => setMonthOffset((v) => v + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-btn transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-white/[0.08] dark:bg-surface dark:text-text-secondary dark:hover:bg-white/5"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2" data-export-ignore="true">
          <select
            aria-label="Filter by type"
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setCategoryFilter('all'); }}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-btn focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/[0.08] dark:bg-surface dark:text-text-primary"
          >
            <option value="all">Income &amp; expenses</option>
            <option value="income">Income only</option>
            <option value="expense">Expenses only</option>
          </select>
          <select
            aria-label="Filter by category or income source"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-btn focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/[0.08] dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent/70"
          >
            <option value="all">All categories &amp; sources</option>
            {typeFilter !== 'income' && (
              <optgroup label="Expense categories">
                {categories.filter((c) => c.type === 'expense').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            )}
            {typeFilter !== 'expense' && (
              <optgroup label="Income sources">
                {categories.filter((c) => c.type === 'income').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            )}
          </select>
          <input
            type="date"
            aria-label="From date"
            value={startDate}
            min={`${month}-01`}
            max={endDate || lastDayOfMonth(month)}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 shadow-btn dark:border-white/[0.08] dark:bg-surface dark:text-text-primary dark:[color-scheme:dark]"
          />
          <input
            type="date"
            aria-label="To date"
            value={endDate}
            min={startDate || `${month}-01`}
            max={lastDayOfMonth(month)}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-sm text-gray-900 shadow-btn dark:border-white/[0.08] dark:bg-surface dark:text-text-primary dark:[color-scheme:dark]"
          />
          {(typeFilter !== 'all' || categoryFilter !== 'all' || startDate || endDate) && (
            <button type="button" onClick={() => { setTypeFilter('all'); setCategoryFilter('all'); setStartDate(''); setEndDate(''); }} className="text-xs font-semibold text-brand-700 hover:underline dark:text-primary-accent">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Income vs Expenses (6 months)</h2>
          <div className="mt-4">
            <IncomeExpenseTrendChart data={trend} />
          </div>
        </Card>
        <Card>
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Spending by Category</h2>
          <div className="mt-4">
            {report.categoryBreakdown.length === 0 ? (
              <EmptyState compact icon={PieChart} title="No expenses this month" description="Log expenses to see the breakdown." />
            ) : (
              <CategoryDonutChart data={report.categoryBreakdown} total={report.totalExpense} totalLabel="Total Expenses" />
            )}
          </div>
        </Card>
      </div>

      {/* Weekly spend bars */}
      <Card>
        <h2 className="font-semibold text-gray-900 dark:text-text-primary">Weekly Spending</h2>
        {weeklySpend.length === 0 ? (
          <p className="mt-3 text-sm text-gray-400 dark:text-text-muted">No expenses logged for {formatMonthLabel(month)} yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {weeklySpend.map((week) => {
              const max = Math.max(...weeklySpend.map((w) => w.amount));
              const pct = max > 0 ? Math.round((week.amount / max) * 100) : 0;
              return (
                <div key={week.label} className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-xs font-medium text-gray-500 dark:text-text-secondary">{week.label}</span>
                  <div className="flex-1 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]">
                    <div
                      className="h-full rounded-full bg-brand-500 dark:bg-primary-accent transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-text-primary">
                    {formatCurrency(week.amount, currency)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Spending heatmap */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-400">
            <Flame className="h-4 w-4" />
          </span>
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Spending Heatmap</h2>
        </div>
        {maxDailyAmt === 0 ? (
          <p className="text-sm text-gray-400 dark:text-text-muted">No expenses logged for {formatMonthLabel(month)} yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-2xs font-semibold text-gray-400 dark:text-text-muted mb-1">
              {WEEKDAY_LABELS.map((l, i) => <span key={`${l}-${i}`}>{l}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {heatmapCells.map((cell, i) =>
                cell.day === null ? (
                  <div key={`empty-${i}`} />
                ) : (
                  <div
                    key={cell.day}
                    title={cell.amount > 0
                      ? `${cell.day}: ${formatCurrency(cell.amount, currency)}`
                      : `${cell.day}: no spending`}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-md text-2xs font-medium',
                      'text-gray-500 dark:text-text-secondary',
                      heatmapClass(cell.amount, maxDailyAmt),
                    )}
                  >
                    {cell.day}
                  </div>
                ),
              )}
            </div>
            <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-gray-400 dark:text-text-muted">
              <span>Less</span>
              {['bg-gray-100 dark:bg-white/5', 'bg-brand-100 dark:bg-primary-accent/15', 'bg-brand-200 dark:bg-primary-accent/35', 'bg-brand-500 dark:bg-primary-accent', 'bg-brand-700 dark:bg-primary'].map((cls, i) => (
                <span key={i} className={cn('h-3 w-3 rounded', cls)} />
              ))}
              <span>More</span>
            </div>
          </>
        )}
      </Card>

      {/* Category breakdown table */}
      {report.categoryBreakdown.length > 0 && (
        <Card noPadding>
          <div className="border-b border-gray-50 px-5 py-3.5 dark:border-white/[0.04]">
            <h2 className="font-semibold text-gray-900 dark:text-text-primary">Category Breakdown</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {report.categoryBreakdown.map((item) => (
              <div key={item.categoryId} className="flex items-center gap-4 px-5 py-3">
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-text-primary">{item.categoryName}</span>
                {/* Mini progress bar */}
                <div className="hidden w-24 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08] sm:block">
                  <div
                    className="h-full rounded-full bg-brand-500 dark:bg-primary-accent"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-gray-400 dark:text-text-muted">{item.percentage}%</span>
                <span className="w-28 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-text-primary">
                  {formatCurrency(item.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Daily spending table */}
      {report.dailySpend.length > 0 && (
        <Card noPadding>
          <div className="border-b border-gray-50 px-5 py-3.5 dark:border-white/[0.04]">
            <h2 className="font-semibold text-gray-900 dark:text-text-primary">Daily Spending</h2>
          </div>
          <div className="max-h-72 divide-y divide-gray-50 overflow-y-auto dark:divide-white/[0.04]">
            {[...report.dailySpend].reverse().map((item) => (
              <div key={item.date} className="flex items-center justify-between gap-3 px-5 py-2.5">
                <span className="text-sm text-gray-500 dark:text-text-secondary">{formatDate(item.date)}</span>
                <span className="text-sm font-semibold tabular-nums text-gray-900 dark:text-text-primary">
                  {formatCurrency(item.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Income by source */}
      {(report.incomeBreakdown ?? []).length > 0 && (
        <Card noPadding>
          <div className="border-b border-gray-50 px-5 py-3.5 dark:border-white/[0.04]">
            <h2 className="font-semibold text-gray-900 dark:text-text-primary">Income by Source</h2>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">
            {report.incomeBreakdown!.map((item) => (
              <div key={item.categoryId} className="flex items-center gap-4 px-5 py-3">
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-text-primary">{item.categoryName}</span>
                <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08] sm:block">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${item.percentage}%` }} />
                </div>
                <span className="w-10 text-right text-xs text-gray-400 dark:text-text-muted">{item.percentage}%</span>
                <span className="w-28 text-right text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(item.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Transaction table */}
      <Card noPadding>
        <div className="flex items-center justify-between border-b border-gray-50 px-5 py-3.5 dark:border-white/[0.04]">
          <h2 className="font-semibold text-gray-900 dark:text-text-primary">Transactions</h2>
          <span className="text-xs text-gray-400 dark:text-text-muted">{report.transactionCount ?? report.transactions?.length ?? 0} in this report</span>
        </div>
        {(report.transactions ?? []).length === 0 ? (
          <p className="px-5 py-6 text-sm text-gray-400 dark:text-text-muted">No transactions match these filters.</p>
        ) : (
          <div className="max-h-96 overflow-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="sticky top-0 bg-white text-left text-xs uppercase tracking-wide text-gray-400 dark:bg-surface-elevated dark:text-text-muted">
                <tr>
                  <th className="px-5 py-2 font-semibold">Date</th>
                  <th className="px-3 py-2 font-semibold">Description</th>
                  <th className="px-3 py-2 font-semibold">Category</th>
                  <th className="px-5 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-white/[0.04]">
                {report.transactions!.map((tx) => (
                  <tr key={tx.id}>
                    <td className="whitespace-nowrap px-5 py-2.5 text-gray-500 dark:text-text-secondary">{formatDate(tx.occurredAt)}</td>
                    <td className="max-w-[16rem] truncate px-3 py-2.5 text-gray-900 dark:text-text-primary">{tx.description || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-text-secondary">{tx.categoryName}</td>
                    <td className={cn('whitespace-nowrap px-5 py-2.5 text-right font-semibold tabular-nums', tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-text-primary')}>
                      {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
