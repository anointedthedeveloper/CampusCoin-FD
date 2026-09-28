/**
 * financialData.service.js
 *
 * All financial calculations for the Campus Coin AI feature.
 *
 * Design rules:
 *  - Every function takes a plain `userId` (Mongoose ObjectId or string).
 *  - Every function returns a plain object — no Mongoose documents escape.
 *  - No Gemini calls here; this layer is purely data and maths.
 *  - Insufficient-data signals are explicit flags, never invented numbers.
 *
 * Field names match the existing models exactly:
 *   Transaction : userId, categoryId, type ('income'|'expense'), amount, occurredAt, source
 *   Budget      : userId, categoryId, month (YYYY-MM string), limitAmount
 *   Category    : _id, name, type, userId, isDefault
 *   RecurringTransaction : user, category, amount, type, isActive, frequency, interval
 *   User        : savingsGoalAmount, monthlyAllowanceBaseline, settings.currency
 */

const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const RecurringTransaction = require('../models/RecurringTransaction');

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Return the YYYY-MM string for the current UTC month.
 * @returns {string}
 */
function currentMonth() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Return the YYYY-MM string for N months before the given month.
 * @param {string} month  YYYY-MM
 * @param {number} n
 * @returns {string}
 */
function monthMinus(month, n) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Convert a YYYY-MM string to a UTC date range [start, end).
 * @param {string} month
 * @returns {{ start: Date, end: Date }}
 */
function monthRange(month) {
  const [y, m] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(y, m - 1, 1)),
    end: new Date(Date.UTC(y, m, 1)),
  };
}

/**
 * Ensure userId is a Mongoose ObjectId for use in queries.
 * @param {*} userId
 * @returns {mongoose.Types.ObjectId}
 */
function toObjectId(userId) {
  if (userId instanceof mongoose.Types.ObjectId) return userId;
  return new mongoose.Types.ObjectId(String(userId));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. getMonthlySummary(userId, currency, month?)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full financial snapshot for a single calendar month.
 *
 * Returns:
 * {
 *   month,
 *   currency,
 *   hasData,          — false when there are no transactions at all
 *   hasIncome,        — false when no income transactions exist
 *   totalIncome,
 *   totalExpenses,
 *   netCashFlow,
 *   savingsRate,      — percentage of income saved; null when hasIncome is false
 *   topCategories,    — [{name, amount, percentage}] sorted desc, expenses only
 *   allCategories,    — same shape, all expense categories
 *   budgets,          — [{category, limit, spent, remaining, usedPct}]
 *   recentTransactions — last 10 transactions [{type,amount,category,occurredAt,description}]
 * }
 *
 * @param {*}      userId
 * @param {string} currency
 * @param {string} [month]  defaults to current month
 */
async function getMonthlySummary(userId, currency, month = currentMonth()) {
  const uid = toObjectId(userId);
  const { start, end } = monthRange(month);

  const [transactions, budgets] = await Promise.all([
    Transaction.find({ userId: uid, occurredAt: { $gte: start, $lt: end } })
      .select('type amount categoryId occurredAt description merchant')
      .populate('categoryId', 'name')
      .sort({ occurredAt: -1 })
      .lean(),
    Budget.find({ userId: uid, month })
      .populate('categoryId', 'name')
      .lean(),
  ]);

  // ── Totals ────────────────────────────────────────────────────────────────
  let totalIncome = 0;
  let totalExpenses = 0;
  const expenseByCat = new Map(); // categoryName → amount

  for (const tx of transactions) {
    const catName = tx.categoryId?.name || 'Uncategorized';
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpenses += tx.amount;
      expenseByCat.set(catName, (expenseByCat.get(catName) || 0) + tx.amount);
    }
  }

  const netCashFlow = totalIncome - totalExpenses;
  const hasData = transactions.length > 0;
  const hasIncome = totalIncome > 0;
  const savingsRate = hasIncome ? (netCashFlow / totalIncome) * 100 : null;

  // ── Category breakdown ────────────────────────────────────────────────────
  const allCategories = [...expenseByCat.entries()]
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: totalExpenses > 0 ? parseFloat(((amount / totalExpenses) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const topCategories = allCategories.slice(0, 5);

  // ── Budget status ─────────────────────────────────────────────────────────
  const budgetList = budgets.map((b) => {
    const catName = b.categoryId?.name || 'Uncategorized';
    const spent = expenseByCat.get(catName) || 0;
    const remaining = b.limitAmount - spent;
    const usedPct = b.limitAmount > 0 ? parseFloat(((spent / b.limitAmount) * 100).toFixed(1)) : 0;
    return {
      category: catName,
      limit: b.limitAmount,
      spent,
      remaining,
      usedPct,
    };
  });

  // ── Recent transactions (last 10) ─────────────────────────────────────────
  const recentTransactions = transactions.slice(0, 10).map((tx) => ({
    type: tx.type,
    amount: tx.amount,
    category: tx.categoryId?.name || 'Uncategorized',
    occurredAt: tx.occurredAt,
    description: tx.description || tx.merchant || null,
  }));

  return {
    month,
    currency,
    hasData,
    hasIncome,
    totalIncome,
    totalExpenses,
    netCashFlow,
    savingsRate,
    topCategories,
    allCategories,
    budgets: budgetList,
    recentTransactions,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. getMonthComparison(userId, currency, month?)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare this month's expenses against last month's.
 *
 * Returns:
 * {
 *   month,
 *   previousMonth,
 *   hasPreviousData,
 *   currentExpenses,
 *   previousExpenses,
 *   changeAmount,
 *   changePercent,          — null when previousExpenses is 0
 *   increasedCategories,    — [{name, current, previous, change}] where current > previous
 *   decreasedCategories,    — same shape where current < previous
 * }
 *
 * @param {*}      userId
 * @param {string} currency
 * @param {string} [month]
 */
async function getMonthComparison(userId, currency, month = currentMonth()) {
  const uid = toObjectId(userId);
  const prevMonth = monthMinus(month, 1);

  const [current, previous] = await Promise.all([
    getMonthlySummary(uid, currency, month),
    getMonthlySummary(uid, currency, prevMonth),
  ]);

  const hasPreviousData = previous.hasData;
  const changeAmount = current.totalExpenses - previous.totalExpenses;
  const changePercent =
    previous.totalExpenses > 0
      ? parseFloat(((changeAmount / previous.totalExpenses) * 100).toFixed(1))
      : null;

  // ── Per-category delta ────────────────────────────────────────────────────
  const prevMap = new Map(previous.allCategories.map((c) => [c.name, c.amount]));
  const currMap = new Map(current.allCategories.map((c) => [c.name, c.amount]));
  const allCatNames = new Set([...prevMap.keys(), ...currMap.keys()]);

  const increasedCategories = [];
  const decreasedCategories = [];

  for (const name of allCatNames) {
    const curr = currMap.get(name) || 0;
    const prev = prevMap.get(name) || 0;
    const change = curr - prev;
    if (change > 0) increasedCategories.push({ name, current: curr, previous: prev, change });
    if (change < 0) decreasedCategories.push({ name, current: curr, previous: prev, change });
  }

  increasedCategories.sort((a, b) => b.change - a.change);
  decreasedCategories.sort((a, b) => a.change - b.change);

  return {
    month,
    previousMonth: prevMonth,
    currency,
    hasPreviousData,
    currentExpenses: current.totalExpenses,
    previousExpenses: previous.totalExpenses,
    currentIncome: current.totalIncome,
    previousIncome: previous.totalIncome,
    changeAmount,
    changePercent,
    increasedCategories,
    decreasedCategories,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. getSpendingTrend(userId, currency, months?)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate spending and income across the last N months (default 6).
 * Useful for trend questions like "why did I spend more this month?"
 *
 * Returns:
 * {
 *   currency,
 *   months,          — [{month, income, expenses, netCashFlow}] oldest first
 *   hasEnoughData,   — true when at least 2 months have transactions
 *   averageExpenses, — across months that have data
 *   averageIncome,
 * }
 *
 * @param {*}      userId
 * @param {string} currency
 * @param {number} [numMonths=6]
 */
async function getSpendingTrend(userId, currency, numMonths = 6) {
  const uid = toObjectId(userId);
  const now = new Date();
  const endMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  // Build date range spanning all requested months
  const oldestMonth = monthMinus(endMonth, numMonths - 1);
  const { start } = monthRange(oldestMonth);
  const { end } = monthRange(endMonth);

  const transactions = await Transaction.find({
    userId: uid,
    occurredAt: { $gte: start, $lt: end },
  })
    .select('type amount occurredAt')
    .lean();

  // Bucket by month string
  const buckets = {};
  for (let i = 0; i < numMonths; i++) {
    const m = monthMinus(endMonth, numMonths - 1 - i);
    buckets[m] = { month: m, income: 0, expenses: 0 };
  }

  for (const tx of transactions) {
    const m = tx.occurredAt.toISOString().slice(0, 7);
    if (!buckets[m]) continue;
    if (tx.type === 'income') buckets[m].income += tx.amount;
    else buckets[m].expenses += tx.amount;
  }

  const months = Object.values(buckets).map((b) => ({
    ...b,
    netCashFlow: b.income - b.expenses,
  }));

  const monthsWithData = months.filter((m) => m.income > 0 || m.expenses > 0);
  const hasEnoughData = monthsWithData.length >= 2;

  const averageExpenses =
    monthsWithData.length > 0
      ? parseFloat((monthsWithData.reduce((s, m) => s + m.expenses, 0) / monthsWithData.length).toFixed(2))
      : 0;
  const averageIncome =
    monthsWithData.length > 0
      ? parseFloat((monthsWithData.reduce((s, m) => s + m.income, 0) / monthsWithData.length).toFixed(2))
      : 0;

  return {
    currency,
    months,
    hasEnoughData,
    averageExpenses,
    averageIncome,
    monthsWithData: monthsWithData.length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. getBudgetStatus(userId, month?)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Current month's budgets with actual vs limit.
 *
 * Returns:
 * {
 *   month,
 *   hasBudgets,
 *   budgets: [{category, limit, spent, remaining, usedPct, status}]
 *     status: 'exceeded' | 'warning' | 'on-track'
 *   exceededBudgets,     — count
 *   warningBudgets,      — count (≥ alert threshold but < 100%)
 *   totalBudgeted,
 *   totalSpent,
 * }
 *
 * @param {*}      userId
 * @param {number} alertThreshold  percentage at which to warn (default 80)
 * @param {string} [month]
 */
async function getBudgetStatus(userId, alertThreshold = 80, month = currentMonth()) {
  const uid = toObjectId(userId);
  const { start, end } = monthRange(month);

  const [budgets, expenses] = await Promise.all([
    Budget.find({ userId: uid, month }).populate('categoryId', 'name').lean(),
    Transaction.aggregate([
      {
        $match: {
          userId: uid,
          type: 'expense',
          occurredAt: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
    ]),
  ]);

  const spentMap = new Map(expenses.map((e) => [e._id.toString(), e.total]));

  let totalBudgeted = 0;
  let totalSpent = 0;
  let exceededBudgets = 0;
  let warningBudgets = 0;

  const budgetList = budgets.map((b) => {
    const catName = b.categoryId?.name || 'Uncategorized';
    const spent = spentMap.get(b.categoryId?._id?.toString() || b.categoryId?.toString()) || 0;
    const remaining = b.limitAmount - spent;
    const usedPct = b.limitAmount > 0 ? parseFloat(((spent / b.limitAmount) * 100).toFixed(1)) : 0;

    let status = 'on-track';
    if (usedPct >= 100) { status = 'exceeded'; exceededBudgets++; }
    else if (usedPct >= alertThreshold) { status = 'warning'; warningBudgets++; }

    totalBudgeted += b.limitAmount;
    totalSpent += spent;

    return { category: catName, limit: b.limitAmount, spent, remaining, usedPct, status };
  });

  budgetList.sort((a, b) => b.usedPct - a.usedPct);

  return {
    month,
    hasBudgets: budgets.length > 0,
    budgets: budgetList,
    exceededBudgets,
    warningBudgets,
    totalBudgeted,
    totalSpent,
    totalRemaining: totalBudgeted - totalSpent,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. getSavingsProgress(userId)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Savings goal status based on the User model's savingsGoalAmount field
 * and the current month's net cash flow.
 *
 * Returns:
 * {
 *   hasGoal,
 *   goalAmount,
 *   currentMonthSurplus,   — net cash flow this month (can be negative)
 *   monthsToGoal,          — estimated at current surplus; null if surplus ≤ 0 or no goal
 *   progressNote,          — short human-readable note for the AI context
 * }
 *
 * @param {*}      userId
 * @param {object} user     Full Mongoose user doc (already available on req.user)
 * @param {string} currency
 */
async function getSavingsProgress(userId, user, currency) {
  const summary = await getMonthlySummary(userId, currency);

  const goalAmount = user.savingsGoalAmount || null;
  const hasGoal = goalAmount !== null && goalAmount > 0;
  const currentMonthSurplus = summary.netCashFlow;

  let monthsToGoal = null;
  if (hasGoal && currentMonthSurplus > 0) {
    monthsToGoal = parseFloat((goalAmount / currentMonthSurplus).toFixed(1));
  }

  let progressNote = '';
  if (!hasGoal) {
    progressNote = 'No savings goal has been set.';
  } else if (currentMonthSurplus <= 0) {
    progressNote = `Savings goal of ${goalAmount.toLocaleString()} ${currency} set, but this month's surplus is ${currentMonthSurplus.toLocaleString()} ${currency} — goal progress not calculable.`;
  } else {
    progressNote = `Savings goal: ${goalAmount.toLocaleString()} ${currency}. At the current monthly surplus of ${currentMonthSurplus.toLocaleString()} ${currency}, estimated ${monthsToGoal} month(s) to reach the goal.`;
  }

  return {
    hasGoal,
    goalAmount,
    currentMonthSurplus,
    monthsToGoal,
    progressNote,
    currency,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. getRecurringSummary(userId, currency)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Active recurring transactions — useful for affordability analysis
 * (they represent committed future cash flows).
 *
 * Returns:
 * {
 *   hasRecurring,
 *   items: [{description, amount, type, frequency, estimatedMonthlyAmount}]
 *   estimatedMonthlyExpenses,
 *   estimatedMonthlyIncome,
 * }
 *
 * @param {*}      userId
 * @param {string} currency
 */
async function getRecurringSummary(userId, currency) {
  const uid = toObjectId(userId);

  const items = await RecurringTransaction.find({ user: uid, isActive: true })
    .populate('category', 'name')
    .lean();

  // Approximate monthly equivalent for each frequency
  function toMonthlyAmount(amount, frequency, interval) {
    const n = interval || 1;
    switch (frequency) {
      case 'daily':   return (amount / n) * 30.44;
      case 'weekly':  return (amount / n) * 4.33;
      case 'monthly': return amount / n;
      case 'yearly':  return (amount / n) / 12;
      default:        return amount;
    }
  }

  let estimatedMonthlyExpenses = 0;
  let estimatedMonthlyIncome = 0;

  const formatted = items.map((item) => {
    const monthly = parseFloat(toMonthlyAmount(item.amount, item.frequency, item.interval).toFixed(2));
    if (item.type === 'expense') estimatedMonthlyExpenses += monthly;
    else estimatedMonthlyIncome += monthly;
    return {
      description: item.description || item.category?.name || 'Recurring',
      amount: item.amount,
      type: item.type,
      frequency: item.frequency,
      estimatedMonthlyAmount: monthly,
    };
  });

  return {
    currency,
    hasRecurring: formatted.length > 0,
    items: formatted,
    estimatedMonthlyExpenses: parseFloat(estimatedMonthlyExpenses.toFixed(2)),
    estimatedMonthlyIncome: parseFloat(estimatedMonthlyIncome.toFixed(2)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. getAffordabilityAnalysis(userId, user, currency, targetAmount, targetMonths?)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pure mathematical affordability projection.
 *
 * Uses the average monthly surplus across the last 3 months (or fewer if
 * unavailable) as the estimated saving capacity.
 *
 * Returns:
 * {
 *   targetAmount,
 *   targetMonths,         — null means "how long would it take?"
 *   currency,
 *   estimatedMonthlySurplus,  — average of last 1-3 months; 0 if no data
 *   hasEnoughHistory,         — true when ≥ 2 months of data available
 *   requiredMonthlySaving,    — targetAmount / targetMonths (null if no targetMonths)
 *   monthlyGap,               — requiredMonthlySaving - surplus (null if no targetMonths)
 *   feasible,                 — surplus >= requiredMonthlySaving (null if no targetMonths)
 *   estimatedMonthsAtCurrentRate, — targetAmount / surplus; null if surplus ≤ 0
 *   savingsGoalAmount,        — from user profile
 *   note,                     — human-readable assumptions string for the AI
 * }
 *
 * @param {*}      userId
 * @param {object} user           req.user
 * @param {string} currency
 * @param {number} targetAmount
 * @param {number|null} [targetMonths]
 */
async function getAffordabilityAnalysis(
  userId,
  user,
  currency,
  targetAmount,
  targetMonths = null,
) {
  const trend = await getSpendingTrend(userId, currency, 3);

  // Average surplus across months that actually have income or expenses
  const activeSurpluses = trend.months
    .filter((m) => m.income > 0 || m.expenses > 0)
    .map((m) => m.netCashFlow);

  const estimatedMonthlySurplus =
    activeSurpluses.length > 0
      ? parseFloat((activeSurpluses.reduce((s, v) => s + v, 0) / activeSurpluses.length).toFixed(2))
      : 0;

  const hasEnoughHistory = trend.monthsWithData >= 2;

  // Required monthly saving to hit targetMonths
  const requiredMonthlySaving =
    targetMonths != null && targetMonths > 0
      ? parseFloat((targetAmount / targetMonths).toFixed(2))
      : null;

  const monthlyGap =
    requiredMonthlySaving != null
      ? parseFloat((requiredMonthlySaving - estimatedMonthlySurplus).toFixed(2))
      : null;

  const feasible =
    requiredMonthlySaving != null
      ? estimatedMonthlySurplus >= requiredMonthlySaving
      : null;

  const estimatedMonthsAtCurrentRate =
    estimatedMonthlySurplus > 0
      ? parseFloat((targetAmount / estimatedMonthlySurplus).toFixed(1))
      : null;

  // Build a concise note the AI can reference
  const parts = [
    `Target: ${currency} ${targetAmount.toLocaleString()}.`,
    hasEnoughHistory
      ? `Average monthly surplus (last ${trend.monthsWithData} months): ${currency} ${estimatedMonthlySurplus.toLocaleString()}.`
      : `Insufficient history — surplus estimated from ${trend.monthsWithData} month(s) of data.`,
  ];
  if (requiredMonthlySaving != null) {
    parts.push(`To reach goal in ${targetMonths} month(s) requires saving ${currency} ${requiredMonthlySaving.toLocaleString()} per month.`);
    if (monthlyGap > 0) parts.push(`Monthly gap: ${currency} ${monthlyGap.toLocaleString()} — the surplus falls short.`);
    else parts.push(`The current surplus covers the required monthly saving.`);
  }
  if (estimatedMonthsAtCurrentRate != null) {
    parts.push(`At the current surplus rate this would take approximately ${estimatedMonthsAtCurrentRate} month(s).`);
  } else {
    parts.push(`The current monthly surplus is zero or negative — the timeline cannot be estimated.`);
  }

  return {
    targetAmount,
    targetMonths,
    currency,
    estimatedMonthlySurplus,
    hasEnoughHistory,
    requiredMonthlySaving,
    monthlyGap,
    feasible,
    estimatedMonthsAtCurrentRate,
    savingsGoalAmount: user.savingsGoalAmount || null,
    note: parts.join(' '),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. getSavingsScenario(userId, currency, categoryName, reductionType, reductionValue, projectionMonths?)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * "What if I spend X% / X less on category Y?"
 *
 * Returns:
 * {
 *   category,
 *   currentMonthlySpend,
 *   reductionAmount,
 *   newMonthlySpend,
 *   monthlySaving,
 *   projectionMonths,
 *   totalSaving,          — monthlySaving * projectionMonths
 *   hasData,
 * }
 *
 * @param {*}      userId
 * @param {string} currency
 * @param {string} categoryName   plain text name, matched case-insensitively
 * @param {'percent'|'amount'} reductionType
 * @param {number} reductionValue percentage (0-100) or absolute amount
 * @param {number} [projectionMonths=6]
 */
async function getSavingsScenario(
  userId,
  currency,
  categoryName,
  reductionType,
  reductionValue,
  projectionMonths = 6,
) {
  const summary = await getMonthlySummary(userId, currency);

  const cat = summary.allCategories.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase(),
  );

  const currentMonthlySpend = cat?.amount || 0;
  const hasData = currentMonthlySpend > 0;

  let reductionAmount = 0;
  if (reductionType === 'percent') {
    reductionAmount = parseFloat(((currentMonthlySpend * Math.min(reductionValue, 100)) / 100).toFixed(2));
  } else {
    reductionAmount = Math.min(reductionValue, currentMonthlySpend);
  }

  const newMonthlySpend = parseFloat((currentMonthlySpend - reductionAmount).toFixed(2));
  const monthlySaving = reductionAmount;
  const totalSaving = parseFloat((monthlySaving * projectionMonths).toFixed(2));

  return {
    currency,
    category: categoryName,
    currentMonthlySpend,
    reductionAmount,
    newMonthlySpend,
    monthlySaving,
    projectionMonths,
    totalSaving,
    hasData,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. buildAiContext(userId, user, month?)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assemble the complete structured context object that gets injected into
 * every chat Gemini call.  Nothing is invented — missing data is represented
 * as null / empty arrays / hasData:false.
 *
 * This is intentionally a single aggregated call so chat endpoints make ONE
 * round-trip to the database per message, not several.
 *
 * @param {*}      userId
 * @param {object} user      req.user document
 * @param {string} [month]
 * @returns {Promise<object>}
 */
async function buildAiContext(userId, user, month = currentMonth()) {
  const currency = user.settings?.currency || 'NGN';
  const alertThreshold = user.settings?.budgetAlertThreshold || 80;

  const [summary, comparison, budgetStatus, recurring] = await Promise.all([
    getMonthlySummary(userId, currency, month),
    getMonthComparison(userId, currency, month),
    getBudgetStatus(userId, alertThreshold, month),
    getRecurringSummary(userId, currency),
  ]);

  return {
    period: month,
    currency,
    studentProfile: {
      savingsGoal: user.savingsGoalAmount || null,
      monthlyIncomeGoal: user.settings?.monthlyIncomeGoal || null,
      monthlyAllowanceBaseline: user.monthlyAllowanceBaseline || null,
    },
    income: {
      currentMonth: summary.totalIncome,
      previousMonth: comparison.previousIncome,
      hasIncome: summary.hasIncome,
    },
    expenses: {
      currentMonth: summary.totalExpenses,
      previousMonth: comparison.previousExpenses,
      changeAmount: comparison.changeAmount,
      changePercent: comparison.changePercent,
    },
    netCashFlow: summary.netCashFlow,
    savingsRate: summary.savingsRate,
    topCategories: summary.topCategories,
    allCategories: summary.allCategories,
    monthComparison: {
      hasPreviousData: comparison.hasPreviousData,
      increasedCategories: comparison.increasedCategories.slice(0, 5),
      decreasedCategories: comparison.decreasedCategories.slice(0, 5),
    },
    budgets: budgetStatus.budgets,
    budgetSummary: {
      hasBudgets: budgetStatus.hasBudgets,
      exceededCount: budgetStatus.exceededBudgets,
      warningCount: budgetStatus.warningBudgets,
      totalBudgeted: budgetStatus.totalBudgeted,
      totalSpent: budgetStatus.totalSpent,
    },
    recurring: {
      hasRecurring: recurring.hasRecurring,
      estimatedMonthlyExpenses: recurring.estimatedMonthlyExpenses,
      estimatedMonthlyIncome: recurring.estimatedMonthlyIncome,
      items: recurring.items,
    },
    recentTransactions: summary.recentTransactions,
    dataQuality: {
      hasData: summary.hasData,
      hasIncome: summary.hasIncome,
      hasBudgets: budgetStatus.hasBudgets,
      hasPreviousData: comparison.hasPreviousData,
      hasRecurring: recurring.hasRecurring,
    },
  };
}

module.exports = {
  // Exported calculation functions
  getMonthlySummary,
  getMonthComparison,
  getSpendingTrend,
  getBudgetStatus,
  getSavingsProgress,
  getRecurringSummary,
  getAffordabilityAnalysis,
  getSavingsScenario,
  buildAiContext,
  // Exported helpers (used by tests)
  currentMonth,
  monthMinus,
  monthRange,
};
