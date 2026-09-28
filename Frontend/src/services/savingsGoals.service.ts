import type { SavingsGoal } from '@/types/savingsGoal';

// Goals are stored per student. The original version kept one shared list
// for the whole browser, so a second student signing in on the same device
// saw (and could edit) the first student's goals.
const LEGACY_STORAGE_KEY = 'campus-coin.savingsGoals';
const storageKey = (userId: string) => `${LEGACY_STORAGE_KEY}.${userId}`;

// Set by list()/create(), which every page calls with the signed-in user
// before using the id-only methods below.
let activeUserId: string | null = null;

function setActiveUser(userId: string): void {
  activeUserId = userId;
  try {
    // One-time migration: hand the old shared list to the first student
    // who opens Savings Goals on this device.
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy && !localStorage.getItem(storageKey(userId))) {
      localStorage.setItem(storageKey(userId), legacy);
    }
    if (legacy) localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

function readAll(): SavingsGoal[] {
  if (!activeUserId) return [];
  try {
    const raw = localStorage.getItem(storageKey(activeUserId));
    const parsed = raw ? (JSON.parse(raw) as SavingsGoal[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(goals: SavingsGoal[]): void {
  if (!activeUserId) return;
  try {
    localStorage.setItem(storageKey(activeUserId), JSON.stringify(goals));
  } catch {
    // Storage full or unavailable.
  }
}

function uid(): string {
  return `sg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const savingsGoalsService = {
  /** List all goals for a user (userId scoped via key prefix if needed) */
  list(userId: string): SavingsGoal[] {
    setActiveUser(userId);
    return readAll();
  },

  create(
    userId: string,
    payload: Omit<SavingsGoal, 'id' | 'createdAt' | 'celebratedMilestones'>,
  ): SavingsGoal {
    setActiveUser(userId);
    const goal: SavingsGoal = {
      ...payload,
      id: uid(),
      createdAt: new Date().toISOString(),
      celebratedMilestones: [],
    };
    const all = readAll();
    writeAll([...all, goal]);
    return goal;
  },

  update(id: string, patch: Partial<Omit<SavingsGoal, 'id' | 'createdAt'>>): SavingsGoal {
    const all = readAll();
    const idx = all.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`Goal ${id} not found`);
    const updated = { ...all[idx], ...patch };
    all[idx] = updated;
    writeAll(all);
    return updated;
  },

  delete(id: string): void {
    writeAll(readAll().filter((g) => g.id !== id));
  },

  /** Record that a milestone percentage has been celebrated so it fires only once */
  markMilestoneCelebrated(id: string, milestone: number): void {
    const all = readAll();
    const idx = all.findIndex((g) => g.id === id);
    if (idx === -1) return;
    const existing = all[idx].celebratedMilestones ?? [];
    if (!existing.includes(milestone)) {
      all[idx] = { ...all[idx], celebratedMilestones: [...existing, milestone] };
      writeAll(all);
    }
  },

  /** Deposit or withdraw from a goal's savedAmount */
  adjustAmount(id: string, delta: number): SavingsGoal {
    const all = readAll();
    const idx = all.findIndex((g) => g.id === id);
    if (idx === -1) throw new Error(`Goal ${id} not found`);
    const newAmount = Math.max(0, all[idx].savedAmount + delta);
    const updated = { ...all[idx], savedAmount: newAmount };
    all[idx] = updated;
    writeAll(all);
    return updated;
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
