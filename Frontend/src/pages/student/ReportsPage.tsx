import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, Flame, PieChart, Wallet } from 'lucide-react';
import { Card, EmptyState, PageSpinner } from '@/components/common';
import { CategoryDonutChart } from '@/components/dashboard/CategoryDonutChart';
import { IncomeExpenseTrendChart } from '@/components/dashboard/IncomeExpenseTrendChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate, formatMonthLabel } from '@/utils/format';
import { categoryService, reportService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import type { Category } from '@/types/category';
import type { MonthlyReport } from '@/types/report';
import type { TrendPoint } from '@/services/report.service';

function monthForOffset(offset: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7);
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
  const [report, setReport]             = useState<MonthlyReport | null>(null);
  const [trend, setTrend]               = useState<TrendPoint[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [isLoading, setIsLoading]       = useState(true);

  const month = monthForOffset(monthOffset);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    async function load() {
      const [cats, rep, trendData] = await Promise.all([
        categoryService.list(user!.id, 'expense'),
        reportService.getMonthlyReport(user!.id, month, { categoryId: categoryFilter === 'all' ? undefined : categoryFilter }),
        reportService.getSixMonthTrend(user!.id, month),
      ]);
      setCategories(cats);
      setReport(rep);
      setTrend(trendData);
      setIsLoading(false);
    }
    void load();
  }, [user, month, categoryFilter]);

  const weeklySpend   = useMemo(() => (report ? groupIntoWeeks(report.dailySpend) : []), [report]);
  const heatmapCells  = useMemo(() => (report ? buildHeatmapCells(month, report.dailySpend) : []), [report, month]);
  const maxDailyAmt   = useMemo(() => Math.max(0, ...(report?.dailySpend.map((i) => i.amount) ?? [])), [report]);

  if (isLoading) return <PageSpinner />;
  if (!report)   return null;

  const stats = [
    { label: 'Total Income',   value: formatCurrency(report.totalIncome, DEFAULT_CURRENCY),  icon: ArrowUpRight,   tone: 'brand' as const },
    { label: 'Total Expenses', value: formatCurrency(report.totalExpense, DEFAULT_CURRENCY), icon: ArrowDownRight, tone: 'red'   as const },
    { label: 'Net Savings',    value: formatCurrency(report.netSavings, DEFAULT_CURRENCY),   icon: Wallet,         tone: 'blue'  as const },
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
    ]);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Reports</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">Your financial overview and insights.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 shadow-btn transition-all hover:bg-gray-50 hover:border-gray-300 hover:-translate-y-px dark:border-white/10 dark:bg-surface dark:text-text-primary dark:hover:bg-white/5"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Month nav + category filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset((v) => v - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-btn transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-white/8 dark:bg-surface dark:text-text-secondary dark:hover:bg-white/5"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[8rem] text-center text-sm font-semibold text-gray-900 dark:text-text-primary">
            {formatMonthLabel(month)}
          </span>
          <button
            onClick={() => setMonthOffset((v) => v + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-btn transition-all hover:bg-gray-50 hover:text-gray-900 dark:border-white/8 dark:bg-surface dark:text-text-secondary dark:hover:bg-white/5"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-btn focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-white/8 dark:bg-surface dark:text-text-primary dark:focus:border-primary-accent/70"
        >
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
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
                  <div className="flex-1 h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/8">
                    <div
                      className="h-full rounded-full bg-brand-500 dark:bg-primary-accent transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-text-primary">
                    {formatCurrency(week.amount, DEFAULT_CURRENCY)}
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
                      ? `${cell.day}: ${formatCurrency(cell.amount, DEFAULT_CURRENCY)}`
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
                <div className="hidden w-24 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-white/8 sm:block">
                  <div
                    className="h-full rounded-full bg-brand-500 dark:bg-primary-accent"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <span className="w-10 text-right text-xs text-gray-400 dark:text-text-muted">{item.percentage}%</span>
                <span className="w-28 text-right text-sm font-semibold tabular-nums text-gray-900 dark:text-text-primary">
                  {formatCurrency(item.amount, DEFAULT_CURRENCY)}
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
                  {formatCurrency(item.amount, DEFAULT_CURRENCY)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
