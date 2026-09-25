import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight, Download, Flame, PieChart, Wallet } from 'lucide-react';
import { Card, EmptyState } from '@/components/common';
import { CategoryDonutChart } from '@/components/dashboard/CategoryDonutChart';
import { IncomeExpenseTrendChart } from '@/components/dashboard/IncomeExpenseTrendChart';
import { StatCard } from '@/components/dashboard/StatCard';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate, formatMonthLabel } from '@/utils/format';
import { categoryService, reportService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

function monthForOffset(offset: number): string {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + offset);
  return date.toISOString().slice(0, 7);
}

interface WeekBucket {
  label: string;
  amount: number;
}

function groupIntoWeeks(dailySpend: { date: string; amount: number }[]): WeekBucket[] {
  const buckets = new Map<number, number>();
  for (const { date, amount } of dailySpend) {
    const day = Number(date.slice(8, 10));
    const weekIndex = Math.floor((day - 1) / 7);
    buckets.set(weekIndex, (buckets.get(weekIndex) ?? 0) + amount);
  }
  return Array.from(buckets.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([weekIndex, amount]) => ({ label: `Week ${weekIndex + 1}`, amount }));
}

interface HeatmapCell {
  day: number | null;
  amount: number;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildHeatmapCells(month: string, dailySpend: { date: string; amount: number }[]): HeatmapCell[] {
  const [year, monthNumber] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
  const amountByDay = new Map(dailySpend.map((item) => [Number(item.date.slice(8, 10)), item.amount]));

  const cells: HeatmapCell[] = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push({ day: null, amount: 0 });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, amount: amountByDay.get(day) ?? 0 });
  }
  return cells;
}

function heatmapIntensityClass(amount: number, maxAmount: number): string {
  if (amount <= 0) return 'bg-gray-100';
  const ratio = maxAmount > 0 ? amount / maxAmount : 0;
  if (ratio >= 0.75) return 'bg-brand-700 text-white';
  if (ratio >= 0.5) return 'bg-brand-500 text-white';
  if (ratio >= 0.25) return 'bg-brand-300';
  return 'bg-brand-100';
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ReportsPage() {
  const { user } = useAuth();
  const [monthOffset, setMonthOffset] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const month = monthForOffset(monthOffset);
  const expenseCategories = useMemo(() => (user ? categoryService.list(user.id, 'expense') : []), [user]);

  const report = useMemo(
    () =>
      user
        ? reportService.getMonthlyReport(user.id, month, {
            categoryId: categoryFilter === 'all' ? undefined : categoryFilter,
          })
        : null,
    [user, month, categoryFilter],
  );
  const trend = useMemo(() => (user ? reportService.getSixMonthTrend(user.id, month) : []), [user, month]);
  const weeklySpend = useMemo(() => (report ? groupIntoWeeks(report.dailySpend) : []), [report]);
  const heatmapCells = useMemo(() => (report ? buildHeatmapCells(month, report.dailySpend) : []), [report, month]);
  const maxDailyAmount = useMemo(() => Math.max(0, ...(report?.dailySpend.map((item) => item.amount) ?? [])), [report]);

  if (!user || !report) return null;

  const reportStats = [
    { label: 'Total Income', value: formatCurrency(report.totalIncome, DEFAULT_CURRENCY), icon: ArrowUpRight, tone: 'brand' as const },
    { label: 'Total Expenses', value: formatCurrency(report.totalExpense, DEFAULT_CURRENCY), icon: ArrowDownRight, tone: 'red' as const },
    { label: 'Net Savings', value: formatCurrency(report.netSavings, DEFAULT_CURRENCY), icon: Wallet, tone: 'blue' as const },
  ];

  function handleExport() {
    const rows: (string | number)[][] = [
      ['Campus Coin report', formatMonthLabel(month)],
      [],
      ['Summary'],
      ['Total Income', report!.totalIncome],
      ['Total Expenses', report!.totalExpense],
      ['Net Savings', report!.netSavings],
      [],
      ['Category Breakdown'],
      ['Category', 'Amount', 'Percentage'],
      ...report!.categoryBreakdown.map((item) => [item.categoryName, item.amount, `${item.percentage}%`]),
      [],
      ['Daily Spending'],
      ['Date', 'Amount'],
      ...report!.dailySpend.map((item) => [item.date, item.amount]),
    ];
    downloadCsv(`campus-coin-report-${month}.csv`, rows);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Your financial overview and insights.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:text-brand-700"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset((v) => v - 1)}
            className="rounded-full p-1.5 text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-semibold text-gray-900">{formatMonthLabel(month)}</span>
          <button
            onClick={() => setMonthOffset((v) => v + 1)}
            className="rounded-full p-1.5 text-gray-500 transition-colors duration-200 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">All expense categories</option>
          {expenseCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {reportStats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="font-semibold text-gray-900">Income vs Expenses (6 months)</h2>
          <div className="mt-4">
            <IncomeExpenseTrendChart data={trend} />
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-gray-900">Spending by Category</h2>
          <div className="mt-6">
            {report.categoryBreakdown.length === 0 ? (
              <EmptyState icon={PieChart} title="No expenses this month" description="Once you log expenses, they'll be broken down here." />
            ) : (
              <CategoryDonutChart data={report.categoryBreakdown} total={report.totalExpense} totalLabel="Total Expenses" />
            )}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="font-semibold text-gray-900">Weekly Spending</h2>
        {weeklySpend.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No expenses logged for {formatMonthLabel(month)} yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {weeklySpend.map((week) => {
              const maxAmount = Math.max(...weeklySpend.map((w) => w.amount));
              const widthPercent = maxAmount > 0 ? Math.round((week.amount / maxAmount) * 100) : 0;
              return (
                <div key={week.label} className="flex items-center gap-3">
                  <span className="w-16 shrink-0 text-xs font-medium text-gray-500">{week.label}</span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                    <div className={cn('h-full rounded-full bg-brand-500')} style={{ width: `${widthPercent}%` }} />
                  </div>
                  <span className="w-24 shrink-0 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(week.amount, DEFAULT_CURRENCY)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 text-gray-500">
          <Flame className="h-4 w-4" />
          <h2 className="font-semibold text-gray-900">Spending Heatmap</h2>
        </div>
        {maxDailyAmount === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No expenses logged for {formatMonthLabel(month)} yet.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-gray-400">
              {WEEKDAY_LABELS.map((label, index) => (
                <span key={`${label}-${index}`}>{label}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1.5">
              {heatmapCells.map((cell, index) =>
                cell.day === null ? (
                  <div key={`empty-${index}`} />
                ) : (
                  <div
                    key={cell.day}
                    title={cell.amount > 0 ? `${cell.day}: ${formatCurrency(cell.amount, DEFAULT_CURRENCY)}` : `${cell.day}: no spending`}
                    className={cn(
                      'flex aspect-square items-center justify-center rounded-md text-[11px] font-medium text-gray-600',
                      heatmapIntensityClass(cell.amount, maxDailyAmount),
                    )}
                  >
                    {cell.day}
                  </div>
                ),
              )}
            </div>
            <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-gray-400">
              Less
              <span className="h-3 w-3 rounded bg-gray-100" />
              <span className="h-3 w-3 rounded bg-brand-100" />
              <span className="h-3 w-3 rounded bg-brand-300" />
              <span className="h-3 w-3 rounded bg-brand-500" />
              <span className="h-3 w-3 rounded bg-brand-700" />
              More
            </div>
          </>
        )}
      </Card>

      {report.categoryBreakdown.length > 0 && (
        <Card className="p-0">
          <div className="border-b border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900">Category Breakdown</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {report.categoryBreakdown.map((item) => (
              <div key={item.categoryId} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <span className="font-medium text-gray-900">{item.categoryName}</span>
                <span className="text-gray-500">{item.percentage}%</span>
                <span className="font-semibold text-gray-900">{formatCurrency(item.amount, DEFAULT_CURRENCY)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {report.dailySpend.length > 0 && (
        <Card className="p-0">
          <div className="border-b border-gray-100 p-5">
            <h2 className="font-semibold text-gray-900">Daily Spending</h2>
          </div>
          <div className="max-h-72 divide-y divide-gray-100 overflow-y-auto">
            {[...report.dailySpend].reverse().map((item) => (
              <div key={item.date} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="text-gray-600">{formatDate(item.date)}</span>
                <span className="font-semibold text-gray-900">{formatCurrency(item.amount, DEFAULT_CURRENCY)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
