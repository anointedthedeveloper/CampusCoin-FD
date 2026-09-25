import { budgetsApi } from '@/api/budgets.api';
import { DEFAULT_BUDGET_ALERT_THRESHOLD } from '@/constants/config';
import type { Budget, BudgetPayload, BudgetSummary } from '@/types/budget';

export type BudgetStatus = 'on-track' | 'warning' | 'exceeded';

export function getBudgetUtilization(budget: Budget): number {
  if (budget.limitAmount <= 0) return 0;
  return Math.round((budget.spentAmount / budget.limitAmount) * 100);
}

export function getBudgetStatus(
  budget: Budget,
  warningThreshold: number = DEFAULT_BUDGET_ALERT_THRESHOLD,
): BudgetStatus {
  const utilization = getBudgetUtilization(budget);
  if (utilization >= 100) return 'exceeded';
  if (utilization >= warningThreshold) return 'warning';
  return 'on-track';
}

export const budgetService = {
  async list(_userId?: string, month?: string): Promise<Budget[]> {
    const summary = await budgetsApi.getSummary(month ?? new Date().toISOString().slice(0, 7));
    return summary.budgets;
  },

  async getById(_userId: string, id: string): Promise<Budget | undefined> {
    const month = new Date().toISOString().slice(0, 7);
    const summary = await budgetsApi.getSummary(month);
    return summary.budgets.find((b) => b.id === id);
  },

  async create(_userId: string, payload: BudgetPayload): Promise<Budget> {
    return budgetsApi.create(payload);
  },

  async update(_userId: string, id: string, limitAmount: number): Promise<Budget> {
    return budgetsApi.update(id, { limitAmount });
  },

  async remove(_userId: string, id: string): Promise<void> {
    return budgetsApi.remove(id);
  },

  async summary(_userId: string, month: string): Promise<BudgetSummary> {
    return budgetsApi.getSummary(month);
  },

  // Budget alerts are handled server-side — no-op on the client.
  checkAndNotify(_userId: string, _month?: string): void {
    return;
  },

  deleteAllForUser(_userId: string): void {
    return;
  },

  getBudgetUtilization,
  getBudgetStatus,
};
