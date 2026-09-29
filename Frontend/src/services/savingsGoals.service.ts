import { httpClient } from '@/api/httpClient';
import type { ApiSuccess } from '@/types/api';
import type { SavingsGoal } from '@/types/savingsGoal';

// Goals live on the server so they follow the student to any device and are
// included in backups. Older versions kept them only in this browser; those
// are uploaded once (see migrateLocalGoals) and then removed locally.
const LEGACY_STORAGE_KEY = 'campus-coin.savingsGoals';
const legacyKey = (userId: string) => `${LEGACY_STORAGE_KEY}.${userId}`;

type GoalInput = Omit<SavingsGoal, 'id' | 'createdAt' | 'celebratedMilestones'>;

function readLegacy(userId: string): SavingsGoal[] {
  try {
    const raw = localStorage.getItem(legacyKey(userId)) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as SavingsGoal[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clearLegacy(userId: string) {
  try {
    localStorage.removeItem(legacyKey(userId));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function migrateLocalGoals(userId: string): Promise<SavingsGoal[] | null> {
  const local = readLegacy(userId);
  if (!local.length) return null;
  const { data } = await httpClient.post<ApiSuccess<SavingsGoal[]>>('/savings-goals/import', { goals: local });
  clearLegacy(userId);
  return data.data;
}

export const savingsGoalsService = {
  /** All of the signed-in student's goals (uploading any browser-only ones first). */
  async list(userId: string): Promise<SavingsGoal[]> {
    const migrated = await migrateLocalGoals(userId).catch(() => null);
    if (migrated) return migrated;
    const { data } = await httpClient.get<ApiSuccess<SavingsGoal[]>>('/savings-goals');
    return data.data ?? [];
  },

  async create(payload: GoalInput): Promise<SavingsGoal> {
    const { data } = await httpClient.post<ApiSuccess<SavingsGoal>>('/savings-goals', payload);
    return data.data;
  },

  async update(id: string, patch: Partial<GoalInput>): Promise<SavingsGoal> {
    const { data } = await httpClient.patch<ApiSuccess<SavingsGoal>>(`/savings-goals/${id}`, {
      ...patch,
      targetDate: patch.targetDate ? patch.targetDate : null,
    });
    return data.data;
  },

  async delete(id: string): Promise<void> {
    await httpClient.delete(`/savings-goals/${id}`);
  },

  /** Record that a milestone percentage has been celebrated so it fires only once */
  async markMilestoneCelebrated(id: string, milestone: number): Promise<void> {
    await httpClient.post(`/savings-goals/${id}/milestones`, { milestone });
  },

  /** Deposit (+) or withdraw (−) from a goal's savedAmount */
  async adjustAmount(id: string, delta: number): Promise<SavingsGoal> {
    const { data } = await httpClient.post<ApiSuccess<SavingsGoal>>(`/savings-goals/${id}/adjust`, { delta });
    return data.data;
  },
};

// ─── Derived calculation helpers (pure, no side-effects) ─────────────────────

export interface GoalProjection {
  pct: number;           // 0-100 progress percentage
  daysRemaining: number | null;  // null if no targetDate
  dailyRequired: number | null;
  weeklyRequired: number | null;
  monthlyRequired: number | null;
  isOnTrack: boolean | null;     // null if no targetDate
  isComplete: boolean;
}

export function computeProjection(goal: SavingsGoal): GoalProjection {
  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);
  const pct = goal.targetAmount > 0
    ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100))
    : 0;
  const isComplete = pct >= 100;

  if (!goal.targetDate) {
    return { pct, daysRemaining: null, dailyRequired: null, weeklyRequired: null, monthlyRequired: null, isOnTrack: null, isComplete };
  }

  const now = new Date();
  const deadline = new Date(goal.targetDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysRemaining = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / msPerDay));

  if (isComplete || daysRemaining === 0) {
    return { pct, daysRemaining, dailyRequired: 0, weeklyRequired: 0, monthlyRequired: 0, isOnTrack: isComplete, isComplete };
  }

  const dailyRequired = remaining / daysRemaining;
  const weeklyRequired = dailyRequired * 7;
  const monthlyRequired = dailyRequired * 30;

  // "On track" heuristic: elapsed time fraction vs saved fraction
  const start = new Date(goal.createdAt);
  const totalDays = Math.max(1, Math.ceil((deadline.getTime() - start.getTime()) / msPerDay));
  const elapsed = totalDays - daysRemaining;
  const expectedPct = (elapsed / totalDays) * 100;
  const isOnTrack = pct >= expectedPct - 5; // 5% tolerance

  return { pct, daysRemaining, dailyRequired, weeklyRequired, monthlyRequired, isOnTrack, isComplete };
}

/** Return the next uncelebrated milestone (25, 50, 75, 100) or null */
export function getNewMilestone(goal: SavingsGoal): number | null {
  const pct = goal.targetAmount > 0 ? (goal.savedAmount / goal.targetAmount) * 100 : 0;
  const celebrated = goal.celebratedMilestones ?? [];
  for (const m of [25, 50, 75, 100]) {
    if (pct >= m && !celebrated.includes(m)) return m;
  }
  return null;
}
