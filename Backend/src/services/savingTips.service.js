const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const SavingTip = require('../models/SavingTip');
const TipState = require('../models/TipState');

const DEFAULT_TEMPLATES = [
  { title: 'Cook at home', body: 'Preparing your own meals can save you up to 60% compared to eating out regularly.', category: 'Food' },
  { title: 'Use student discounts', body: 'Always carry your student ID — many stores, cinemas, and transport services offer significant discounts.', category: 'Entertainment' },
  { title: 'Track every naira', body: 'Logging even small expenses keeps you aware of where your money is going and helps spot patterns.', category: 'General' },
  { title: 'Set a weekly spending limit', body: 'Break your monthly budget into weekly chunks so overspending is caught early.', category: 'General' },
  { title: 'Buy second-hand textbooks', body: 'Second-hand or digital textbooks can cost a fraction of new copies.', category: 'Academics' },
  { title: 'Walk or cycle short distances', body: 'Skipping transport fares for short trips adds up to meaningful savings over a month.', category: 'Transport' },
];

async function ensureTemplates() {
  if ((await SavingTip.countDocuments()) === 0) {
    await SavingTip.insertMany(DEFAULT_TEMPLATES).catch(() => undefined);
  }
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthStart(offset, now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
}

function money(amount, currency) {
  return `${currency} ${Math.round(amount).toLocaleString('en-US')}`;
}

/**
 * Personalised tips computed from the student's own records: this month vs
 * their previous 3-month average, their budgets, income vs spending,
 * subscriptions and frequent small purchases. Each tip carries an
 * estimated monthly `impact` (money it could save) used for ranking.
 */
async function buildPersonalTips(user) {
  const currency = user.settings?.currency || 'NGN';
  const now = new Date();
  const thisMonth = monthKey(now);
  const [thisStart, nextStart, histStart] = [monthStart(0, now), monthStart(1, now), monthStart(-3, now)];

  const [txs, budgets] = await Promise.all([
    Transaction.find({ userId: user._id, occurredAt: { $gte: histStart, $lt: nextStart } }).lean(),
    Budget.find({ userId: user._id, month: thisMonth }).lean(),
  ]);
  const categoryIds = [...new Set([...txs.map((t) => String(t.categoryId)), ...budgets.map((b) => String(b.categoryId))])];
  const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
  const nameOf = new Map(categories.map((c) => [String(c._id), c.name]));

  const current = txs.filter((t) => t.occurredAt >= thisStart);
  const history = txs.filter((t) => t.occurredAt < thisStart);
  const histMonths = new Set(history.map((t) => monthKey(t.occurredAt))).size;

  const sumBy = (list, type) => {
    const map = new Map();
    list.filter((t) => t.type === type).forEach((t) => {
      const k = String(t.categoryId);
      map.set(k, (map.get(k) ?? 0) + t.amount);
    });
    return map;
  };
  const curExp = sumBy(current, 'expense');
  const histExp = sumBy(history, 'expense');
  const income = current.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expenses = current.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const tips = [];
  const add = (key, title, body, category, impact) =>
    tips.push({ id: `personal:${key}:${thisMonth}`, title, body, category, impact: Math.max(0, Math.round(impact)), kind: 'personal' });

  if (txs.length === 0) {
    add('get-started', 'Log a week of spending', 'Record every income and expense for a week. Once Campus Coin has some history, these tips become personal to you.', 'General', 0);
    return tips;
  }

  // 1. Categories running above the student's own 3-month average.
  if (histMonths > 0) {
    for (const [cid, amount] of curExp) {
      const avg = (histExp.get(cid) ?? 0) / histMonths;
      if (avg > 0 && amount > avg * 1.2 && amount - avg >= 500) {
        const name = nameOf.get(cid) ?? 'a category';
        add(`increase:${cid}`, `${name} is above your usual`, `You've spent ${money(amount, currency)} on ${name} this month — ${money(amount - avg, currency)} more than your ${histMonths}-month average of ${money(avg, currency)}. Bringing it back to normal would save that difference.`, name, amount - avg);
      }
    }
  }

  // 2. Budgets exceeded or close to the limit.
  const threshold = (user.settings?.budgetAlertThreshold ?? 80) / 100;
  for (const b of budgets) {
    const cid = String(b.categoryId);
    const spent = curExp.get(cid) ?? 0;
    const name = nameOf.get(cid) ?? 'a category';
    if (b.limitAmount > 0 && spent > b.limitAmount) {
      add(`budget-over:${cid}`, `${name} budget exceeded`, `You're ${money(spent - b.limitAmount, currency)} over your ${name} budget of ${money(b.limitAmount, currency)}. Pause non-essential ${name} spending for the rest of the month.`, name, spent - b.limitAmount);
    } else if (b.limitAmount > 0 && spent >= b.limitAmount * threshold) {
      add(`budget-near:${cid}`, `${name} budget almost used`, `You've used ${Math.round((spent / b.limitAmount) * 100)}% of your ${name} budget. Only ${money(b.limitAmount - spent, currency)} is left for the month.`, name, (b.limitAmount - spent) * 0.5);
    }
  }

  // 3. Spending more than income this month.
  if (income > 0 && expenses > income) {
    add('deficit', 'Spending is ahead of income', `This month you've spent ${money(expenses, currency)} but recorded ${money(income, currency)} in income — a gap of ${money(expenses - income, currency)}. Review your top categories before your next allowance.`, 'General', expenses - income);
  } else if (income > 0 && (income - expenses) / income < 0.1) {
    add('low-savings', 'Aim to save 10% of your income', `You're keeping less than 10% of this month's income. Setting aside ${money(income * 0.1, currency)} as soon as money comes in makes saving automatic.`, 'Savings', income * 0.1 - (income - expenses));
  }

  // 4. One category dominating spending.
  const top = [...curExp.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && expenses > 0 && top[1] / expenses >= 0.4) {
    const name = nameOf.get(top[0]) ?? 'One category';
    add(`top-share:${top[0]}`, `${name} is ${Math.round((top[1] / expenses) * 100)}% of your spending`, `Cutting ${name} by just 10% would save about ${money(top[1] * 0.1, currency)} this month.`, name, top[1] * 0.1);
  }

  // 5. Subscriptions.
  for (const [cid, amount] of curExp) {
    if (/subscription/i.test(nameOf.get(cid) ?? '') && amount > 0) {
      add(`subscriptions:${cid}`, 'Review your subscriptions', `You've paid ${money(amount, currency)} for subscriptions this month. Cancel any you haven't used in the last two weeks, or share a family/student plan.`, 'Subscriptions', amount * 0.5);
    }
  }

  // 6. Many small food purchases.
  for (const [cid] of curExp) {
    const name = nameOf.get(cid) ?? '';
    if (!/food|drink|snack/i.test(name)) continue;
    const small = current.filter((t) => t.type === 'expense' && String(t.categoryId) === cid);
    if (small.length >= 8) {
      const total = small.reduce((s, t) => s + t.amount, 0);
      add(`frequent:${cid}`, 'Lots of small food purchases', `You've made ${small.length} ${name} purchases this month. Cooking or buying in bulk a few times a week could save about ${money(total * 0.2, currency)}.`, name, total * 0.2);
    }
  }

  // 7. Savings goal from the profile.
  if (user.savingsGoalAmount > 0 && income > 0 && income - expenses < user.savingsGoalAmount) {
    add('savings-goal', 'Keep your savings goal on track', `Your savings goal is ${money(user.savingsGoalAmount, currency)}. So far this month you've kept ${money(Math.max(0, income - expenses), currency)}.`, 'Savings', Math.min(user.savingsGoalAmount, Math.max(0, expenses - (income - user.savingsGoalAmount))) * 0.25);
  }

  return tips;
}

/** Personalised tips (ranked by impact) followed by the admin tip templates. */
async function getTipsForUser(user) {
  await ensureTemplates();
  const [personal, templates, states] = await Promise.all([
    buildPersonalTips(user),
    SavingTip.find({ isAiGenerated: { $ne: true } }).sort({ createdAt: -1 }).lean(),
    TipState.find({ userId: user._id }).lean(),
  ]);
  const stateByKey = new Map(states.map((s) => [s.tipKey, s]));

  const general = templates.map((t) => ({
    id: `template:${t._id}`,
    title: t.title,
    body: t.body,
    category: t.category || 'General',
    impact: 0,
    kind: 'general',
    createdAt: t.createdAt,
  }));

  const all = [...personal.sort((a, b) => b.impact - a.impact), ...general]
    .filter((tip) => !stateByKey.get(tip.id)?.dismissed)
    .map((tip, index) => ({ ...tip, rank: index + 1, isPinned: Boolean(stateByKey.get(tip.id)?.pinned), isAiGenerated: false }));

  // Pinned tips from earlier months stay visible from their snapshot.
  const liveKeys = new Set(all.map((t) => t.id));
  const pinnedArchive = states
    .filter((s) => s.pinned && !s.dismissed && !liveKeys.has(s.tipKey) && s.title)
    .map((s) => ({ id: s.tipKey, title: s.title, body: s.body, category: s.category || 'General', impact: 0, kind: s.tipKey.startsWith('personal:') ? 'personal' : 'general', rank: 0, isPinned: true, isAiGenerated: false }));

  const dismissedCount = states.filter((s) => s.dismissed).length;
  return { tips: [...all, ...pinnedArchive], dismissedCount };
}

async function setTipState(user, tipKey, patch) {
  const { tips } = await getTipsForUser(user);
  const tip = tips.find((t) => t.id === tipKey);
  const snapshot = tip ? { title: tip.title, body: tip.body, category: tip.category } : {};
  return TipState.findOneAndUpdate(
    { userId: user._id, tipKey },
    { $set: { ...patch, ...snapshot } },
    { upsert: true, returnDocument: 'after' },
  );
}

module.exports = { getTipsForUser, setTipState, ensureTemplates, DEFAULT_TEMPLATES };
