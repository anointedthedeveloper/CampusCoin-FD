import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { CATEGORY_CHART_COLORS } from '@/constants/chartColors';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency } from '@/utils/format';
import { useTheme } from '@/hooks/useTheme';
import type { CategoryBreakdownItem } from '@/types/report';

interface CategoryDonutChartProps {
  data: CategoryBreakdownItem[];
  total: number;
  totalLabel?: string;
}

export function CategoryDonutChart({ data, total, totalLabel = 'Total' }: CategoryDonutChartProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="categoryName"
              innerRadius="65%"
              outerRadius="100%"
              paddingAngle={2}
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={entry.categoryId} fill={CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, _name, item) => [
                formatCurrency(value, DEFAULT_CURRENCY),
                item.payload.categoryName,
              ]}
              contentStyle={{
                borderRadius: 8,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb',
                backgroundColor: isDark ? '#123526' : '#ffffff',
                color: isDark ? '#f1f7f3' : '#111827',
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs text-gray-500 dark:text-text-muted">{totalLabel}</span>
          <span className="text-sm font-bold text-gray-900 dark:text-text-primary">{formatCurrency(total, DEFAULT_CURRENCY)}</span>
        </div>
      </div>

      <ul className="flex-1 space-y-2">
        {data.map((item, index) => (
          <li key={item.categoryId} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-gray-700 dark:text-text-secondary">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: CATEGORY_CHART_COLORS[index % CATEGORY_CHART_COLORS.length] }}
              />
              {item.categoryName}
            </span>
            <span className="font-medium text-gray-900 dark:text-text-primary">{item.percentage}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
