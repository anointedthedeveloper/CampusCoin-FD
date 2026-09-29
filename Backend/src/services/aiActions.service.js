/**
 * AI Assistant actions: turns "add ₦1,500 for lunch" into a proposed change
 * the student approves before anything is saved.
 *
 * Flow: the model (or, without AI, the rule-based parser below) returns raw
 * actions → resolveActions() validates them against the student's own data
 * and produces human-readable proposals → the student approves one →
 * applyAction() re-checks and performs it with the same rules as the app.
 */
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const SavingsGoal = require('../models/SavingsGoal');
const User = require('../models/User');
const { keywordCategory } = require('./categorizer.service');
const { checkBudgetAfterTransaction, checkMonthlyLimits } = require('./budgetAlert.service');
const { recordRevision } = require('./revision.service');

const MAX_ACTIONS = 10;
const MAX_AMOUNT = 1e12;
const KINDS = ['add_transaction', 'update_transaction', 'delete_transaction', 'set_budget', 'add_savings_goal', 'contribute_goal', 'add_category', 'update_profile'];
const GOAL_ICONS = ['piggy-bank', 'home', 'plane', 'car', 'graduation-cap', 'laptop', 'heart', 'star', 'shield', 'zap'];

/** Appended to the system prompt so the model knows how to propose changes. */
const ACTIONS_INSTRUCTION = [
  'You CAN help the student change their own Campus Coin records.',
  'When — and only when — the student clearly asks you to add, log, record, edit, delete or set something, reply with one short sentence saying what you prepared,',
  'then append exactly one fenced block tagged campuscoin-actions containing a JSON array of actions. The app shows each action with Approve / Reject buttons; nothing is saved until they approve, so never say it is already done.',
  'Allowed actions (use category and goal NAMES from the context; dates as YYYY-MM-DD; amounts as plain positive numbers):',
  '{"action":"add_transaction","type":"expense|income","amount":1500,"category":"Food","description":"Lunch","date":"2025-09-29"}',
  '{"action":"update_transaction","id":"<recentTransactions id>","amount":2000,"category":"Transport","description":"…","date":"…"}',
  '{"action":"delete_transaction","id":"<recentTransactions id>"}',
  '{"action":"set_budget","category":"Food","amount":20000,"month":"2025-09"}',
  '{"action":"add_savings_goal","name":"Laptop","targetAmount":300000,"targetDate":"2026-01-31"}',
  '{"action":"contribute_goal","goal":"Laptop","amount":5000}  (negative amount = withdraw)',
  '{"action":"add_category","name":"Gym","type":"expense"}',
  '{"action":"update_profile","monthlyAllowanceBaseline":50000,"savingsGoalAmount":10000}',
  `At most ${MAX_ACTIONS} actions. If an amount or what to change is unclear, ask a question instead of guessing. Never include actions for questions or analysis requests.`,
].join('\n');

/* ── Parsing helpers ─────────────────────────────────────────────────── */

/** Pulls the actions block out of a model reply. Returns { text, actions }. */
function extractActions(reply) {
  const re = /```(?:campuscoin-actions|json)?\s*(\[[\s\S]*?\])\s*```/i;
  const match = re.exec(reply || '');
  if (!match) return { text: reply, actions: [] };
  let parsed = [];
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    return { text: reply, actions: [] };
  }
  if (!Array.isArray(parsed) || !parsed.some((a) => a && typeof a === 'object' && typeof a.action === 'string')) {
    return { text: reply, actions: [] };
  }
  const text = (reply.slice(0, match.index) + reply.slice(match.index + match[0].length)).trim();
  return { text: text || 'Here is what I prepared — approve it to save:', actions: parsed.slice(0, MAX_ACTIONS) };
}

/** "₦1,500", "1.5k", "2,000.50", "20k" → number. */
function parseAmount(text) {
  const m = /(?:₦|ngn|n|\$|£|€)?\s*(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(k|m|thousand|million)?\b/i.exec(text);
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ''));
  const unit = (m[2] || '').toLowerCase();
  if (unit === 'k' || unit === 'thousand') n *= 1e3;
  if (unit === 'm' || unit === 'million') n *= 1e6;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function isoDay(d) {
  return d.toISOString().slice(0, 10);
}

/** "yesterday", "today", "on 2025-09-12", "12/09/2025" → YYYY-MM-DD (default today). */
function parseDateWords(text) {
  const now = new Date();
  if (/\byesterday\b/i.test(text)) return isoDay(new Date(now.getTime() - 864e5));
  if (/\b(day before yesterday)\b/i.test(text)) return isoDay(new Date(now.getTime() - 2 * 864e5));
  const iso = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/.exec(text);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;
  const dmy = /\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/.exec(text);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return isoDay(now);
}

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/**
 * Understands the most common requests without an AI provider, so the
 * assistant can still add data when every key is down (or none is set).
 */
function ruleBasedActions(message, ctx) {
  const text = clean(message);
  const lower = text.toLowerCase();
  const amount = parseAmount(text);
  const actions = [];

  // Budgets: "set my food budget to 20k", "budget 15000 for transport"
  let m = /\bset (?:a |my |the )?([a-z][a-z &/-]{1,30}?) budget (?:to|at|of|for)?\s*(.+)$/i.exec(text)
    || /\bbudget (?:of )?(.+?) (?:for|on) ([a-z][a-z &/-]{1,30})/i.exec(text);
  if (m && amount) {
    const category = /budget (?:of )?/i.test(m[0]) && !/^set/i.test(m[0]) ? m[2] : m[1];
    actions.push({ action: 'set_budget', category: clean(category), amount });
    return actions;
  }

  // New goal: "create a savings goal for a laptop of 300k"
  m = /\b(?:create|add|start|make|set up|new)\b.*?\bgoal\b(?: (?:called|named|for))?(?: an?| my)? ([a-z][\w &'-]{1,40}?)(?:\s+(?:of|for|worth|target|to)\b|\s*[—:-]|\s+₦|\s+\d|$)/i.exec(text);
  if (m && amount) {
    actions.push({ action: 'add_savings_goal', name: clean(m[1]).replace(/^(a|an|the|my)\s+/i, ''), targetAmount: amount });
    return actions;
  }

  // Goal contribution: "save 5000 to my laptop goal", "put 2k into trip"
  m = /\b(?:save|put|add|move|deposit)\b.+?\b(?:to|into|towards|toward|for)\b (?:my |the )?([a-z][\w &'-]{1,40}?)(?: goal| savings)?$/i.exec(text);
  if (m && amount && ctx.goals.length) {
    const goal = ctx.goals.find((g) => g.name.toLowerCase() === clean(m[1]).toLowerCase()) || ctx.goals.find((g) => clean(m[1]).toLowerCase().includes(g.name.toLowerCase()) || g.name.toLowerCase().includes(clean(m[1]).toLowerCase()));
    if (goal) {
      actions.push({ action: 'contribute_goal', goal: goal.name, amount });
      return actions;
    }
  }

  // New category: "add a category called Gym"
  m = /\b(?:add|create|make|new)\b (?:a |an )?(?:new )?(income |expense )?category (?:called |named |for )?["']?([a-z][\w &/'-]{1,38})["']?$/i.exec(text);
  if (m) {
    actions.push({ action: 'add_category', name: clean(m[2]), type: /income/i.test(m[1] || '') ? 'income' : 'expense' });
    return actions;
  }

  // Delete latest: "delete my last transaction"
  if (/\b(delete|remove|undo)\b.*\b(last|latest|previous|most recent)\b.*\b(transaction|expense|income|entry)\b/i.test(text) && ctx.recent[0]) {
    actions.push({ action: 'delete_transaction', id: ctx.recent[0].id });
    return actions;
  }

  // Allowance / savings target
  m = /\b(?:set|change|update|make)\b (?:my )?(monthly )?(allowance|income baseline|savings (?:goal|target))\b.*?(?:to|at|of)?/i.exec(text);
  if (m && amount) {
    actions.push(/allowance|income/i.test(m[2]) ? { action: 'update_profile', monthlyAllowanceBaseline: amount } : { action: 'update_profile', savingsGoalAmount: amount });
    return actions;
  }

  // Transactions: "I spent 1500 on lunch yesterday", "add income 50k allowance"
  const incomeWords = /\b(income|received|receive|got paid|earned|earn|allowance|salary|scholarship|gift(?:ed)?|was paid|sent me)\b/i;
  const spendWords = /\b(spent|spend|paid|pay|bought|buy|expense|cost|used)\b/i;
  const logWords = /\b(add|log|record|enter|save|track|note)\b/i;
  const receivedWords = /\b(received|receive|got paid|earned|was paid|sent me|got)\b/i;
  if (amount && (spendWords.test(lower) || receivedWords.test(lower) || (logWords.test(lower) && (incomeWords.test(lower) || /\b(for|on)\b/.test(lower))))) {
    const paidToMe = /\b(got|was|been|get) paid\b/i.test(lower);
    const type = paidToMe || ((incomeWords.test(lower) || receivedWords.test(lower)) && !spendWords.test(lower)) ? 'income' : 'expense';
    // Drop the amount (with its currency/unit) before picking out the words.
    const withoutAmount = text.replace(/(?:₦|ngn|\$|£|€)?\s*\d[\d,.]*\s*(?:k|m|thousand|million)?\b/gi, ' ');
    const forPart = /\b(?:for|on|at)\s+(.+?)(?:\s+(?:yesterday|today|on \d|last)\b|$)/i.exec(withoutAmount);
    let description = forPart ? forPart[1] : withoutAmount.replace(/[^a-z ]/gi, ' ');
    description = clean(description
      .replace(/\b(i|just|add|log|record|an?|the|my|expense|income|of|spent|paid|bought|received|earned|got|was|naira|ngn|yesterday|today|please|to|for|on|as)\b/gi, ' ')
      .replace(/\d[\d,.]*\s*(k|m)?/gi, ' '));
    actions.push({ action: 'add_transaction', type, amount, description: description.slice(0, 120) || (type === 'income' ? 'Income' : 'Expense'), date: parseDateWords(text) });
  }
  return actions;
}

/* ── Resolution (validate + describe) ────────────────────────────────── */

const SYMBOLS = { NGN: '₦', USD: '$', GBP: '£', EUR: '€', GHS: 'GH₵', KES: 'KSh ' };
function money(n, currency) {
  const sym = SYMBOLS[currency] ?? `${currency} `;
  return `${n < 0 ? '−' : ''}${sym}${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function validAmount(v) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT ? Math.round(n * 100) / 100 : null;
}

function validDay(v) {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T12:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() < 1970 || d.getTime() > Date.now() + 366 * 864e5) return null;
  return d;
}

function findCategory(categories, name, type) {
  const n = clean(name).toLowerCase();
  const pool = type ? categories.filter((c) => c.type === type) : categories;
  if (!n) return null;
  return pool.find((c) => c.name.toLowerCase() === n)
    || pool.find((c) => c.name.toLowerCase().includes(n) || n.includes(c.name.toLowerCase()))
    || null;
}

async function loadContext(user) {
  const [categories, goals, recent] = await Promise.all([
    Category.find({ userId: user._id }).select('name type icon').lean(),
    SavingsGoal.find({ userId: user._id }).select('name targetAmount savedAmount').lean(),
    Transaction.find({ userId: user._id }).sort({ occurredAt: -1, createdAt: -1 }).limit(25).select('type amount description categoryId occurredAt').lean(),
  ]);
  return { categories, goals, recent: recent.map((t) => ({ ...t, id: String(t._id) })) };
}

/**
 * Validates raw actions against the student's data and returns proposals
 * ({ kind, summary, payload }) — invalid ones are dropped, with reasons.
 */
async function resolveActions(user, rawActions, ctxIn) {
  const ctx = ctxIn || (await loadContext(user));
  const currency = user.settings?.currency || 'NGN';
  const proposals = [];
  const problems = [];

  for (const raw of (Array.isArray(rawActions) ? rawActions : []).slice(0, MAX_ACTIONS)) {
    if (!raw || typeof raw !== 'object' || !KINDS.includes(raw.action)) continue;
    const kind = raw.action;
    try {
      if (kind === 'add_transaction') {
        const type = raw.type === 'income' ? 'income' : 'expense';
        const amount = validAmount(raw.amount);
        if (!amount) { problems.push('an amount was missing'); continue; }
        const description = clean(raw.description).slice(0, 200);
        let category = findCategory(ctx.categories, raw.category, type) || keywordCategory(`${raw.category || ''} ${description}`, ctx.categories, type);
        if (!category) { problems.push(`there is no ${type} category to use`); continue; }
        const date = validDay(raw.date) || new Date();
        proposals.push({
          kind,
          summary: `Add ${type} ${money(amount, currency)} · ${category.name}${description ? ` · “${description}”` : ''} · ${isoDay(date)}`,
          payload: { type, amount, categoryId: String(category._id), categoryName: category.name, description, occurredAt: date.toISOString() },
        });
      } else if (kind === 'update_transaction' || kind === 'delete_transaction') {
        const tx = ctx.recent.find((t) => t.id === String(raw.id));
        if (!tx) { problems.push('that transaction could not be found'); continue; }
        const cat = ctx.categories.find((c) => String(c._id) === String(tx.categoryId));
        const label = `${tx.type} ${money(tx.amount, currency)} · ${cat?.name ?? 'Uncategorised'}${tx.description ? ` · “${tx.description}”` : ''} (${isoDay(new Date(tx.occurredAt))})`;
        if (kind === 'delete_transaction') {
          proposals.push({ kind, summary: `Delete ${label}`, payload: { transactionId: tx.id } });
          continue;
        }
        const changes = {};
        const parts = [];
        if (raw.amount !== undefined) { const a = validAmount(raw.amount); if (a) { changes.amount = a; parts.push(`amount → ${money(a, currency)}`); } }
        if (raw.category) {
          const c = findCategory(ctx.categories, raw.category, tx.type);
          if (c) { changes.categoryId = String(c._id); parts.push(`category → ${c.name}`); }
        }
        if (typeof raw.description === 'string') { changes.description = clean(raw.description).slice(0, 200); parts.push(`description → “${changes.description}”`); }
        if (raw.date) { const d = validDay(raw.date); if (d) { changes.occurredAt = d.toISOString(); parts.push(`date → ${isoDay(d)}`); } }
        if (!parts.length) { problems.push('nothing to change was given'); continue; }
        proposals.push({ kind, summary: `Edit ${label}: ${parts.join(', ')}`, payload: { transactionId: tx.id, changes } });
      } else if (kind === 'set_budget') {
        const amount = validAmount(raw.amount);
        const category = findCategory(ctx.categories, raw.category, 'expense');
        if (!amount || !category) { problems.push(category ? 'the budget amount was missing' : `no expense category matches “${clean(raw.category)}”`); continue; }
        const month = typeof raw.month === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(raw.month) ? raw.month : new Date().toISOString().slice(0, 7);
        proposals.push({ kind, summary: `Set the ${category.name} budget for ${month} to ${money(amount, currency)}`, payload: { categoryId: String(category._id), categoryName: category.name, month, limitAmount: amount } });
      } else if (kind === 'add_savings_goal') {
        const rawName = clean(raw.name).slice(0, 80);
        const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        const target = validAmount(raw.targetAmount ?? raw.amount);
        if (!name || !target) { problems.push('the goal needs a name and target'); continue; }
        const date = raw.targetDate ? validDay(raw.targetDate) : null;
        const icon = /laptop|phone|computer|tech/i.test(name) ? 'laptop' : /trip|travel|flight|holiday/i.test(name) ? 'plane' : /car|bike/i.test(name) ? 'car' : /school|fee|tuition|course/i.test(name) ? 'graduation-cap' : /rent|hostel|house/i.test(name) ? 'home' : /emergency|rainy/i.test(name) ? 'shield' : 'piggy-bank';
        proposals.push({ kind, summary: `Create savings goal “${name}” for ${money(target, currency)}${date ? ` by ${isoDay(date)}` : ''}`, payload: { name, targetAmount: target, targetDate: date ? isoDay(date) : null, icon: GOAL_ICONS.includes(icon) ? icon : 'piggy-bank', color: 'teal' } });
      } else if (kind === 'contribute_goal') {
        const goal = ctx.goals.find((g) => g.name.toLowerCase() === clean(raw.goal).toLowerCase()) || ctx.goals.find((g) => g.name.toLowerCase().includes(clean(raw.goal).toLowerCase()));
        const n = Number(raw.amount);
        if (!goal || !Number.isFinite(n) || n === 0 || Math.abs(n) > MAX_AMOUNT) { problems.push(goal ? 'the amount was missing' : `no savings goal matches “${clean(raw.goal)}”`); continue; }
        proposals.push({ kind, summary: `${n > 0 ? 'Add' : 'Withdraw'} ${money(Math.abs(n), currency)} ${n > 0 ? 'to' : 'from'} “${goal.name}” (now ${money(goal.savedAmount, currency)} of ${money(goal.targetAmount, currency)})`, payload: { goalId: String(goal._id), goalName: goal.name, amount: Math.round(n * 100) / 100 } });
      } else if (kind === 'add_category') {
        const rawName = clean(raw.name).slice(0, 40);
        const name = rawName.charAt(0).toUpperCase() + rawName.slice(1);
        const type = raw.type === 'income' ? 'income' : 'expense';
        if (!name) { problems.push('the category needs a name'); continue; }
        if (ctx.categories.some((c) => c.type === type && c.name.toLowerCase() === name.toLowerCase())) { problems.push(`you already have a “${name}” category`); continue; }
        proposals.push({ kind, summary: `Add ${type} category “${name}”`, payload: { name, type } });
      } else if (kind === 'update_profile') {
        const payload = {};
        const parts = [];
        if (raw.monthlyAllowanceBaseline !== undefined) { const a = validAmount(raw.monthlyAllowanceBaseline); if (a) { payload.monthlyAllowanceBaseline = a; parts.push(`monthly allowance → ${money(a, currency)}`); } }
        if (raw.savingsGoalAmount !== undefined) { const a = validAmount(raw.savingsGoalAmount); if (a) { payload.savingsGoalAmount = a; parts.push(`monthly savings goal → ${money(a, currency)}`); } }
        if (!parts.length) continue;
        proposals.push({ kind, summary: `Update profile: ${parts.join(', ')}`, payload });
      }
    } catch (err) {
      console.warn('Could not resolve AI action:', err.message);
    }
  }
  return { proposals, problems };
}

/* ── Applying an approved action ─────────────────────────────────────── */

const fail = (message) => Object.assign(new Error(message), { status: 400 });

async function applyAction(user, action) {
  const p = action.payload || {};
  const userId = user._id;
  switch (action.kind) {
    case 'add_transaction': {
      const cat = await Category.findOne({ _id: p.categoryId, userId });
      if (!cat) throw fail('That category no longer exists.');
      if (cat.type !== p.type) throw fail(`"${cat.name}" is an ${cat.type} category.`);
      const tx = await Transaction.create({ userId, categoryId: cat._id, type: p.type, amount: p.amount, description: p.description || undefined, occurredAt: new Date(p.occurredAt), source: 'ai-suggested' });
      await recordRevision(userId, tx._id, 'created', { after: tx, via: 'ai' });
      if (tx.type === 'expense') await checkBudgetAfterTransaction(userId, tx.categoryId, tx.occurredAt);
      await checkMonthlyLimits(userId, tx.occurredAt);
      return { transactionId: String(tx._id), message: `Added ${tx.type} ${tx.amount.toLocaleString('en-US')} in ${cat.name}.` };
    }
    case 'update_transaction': {
      const tx = await Transaction.findOne({ _id: p.transactionId, userId });
      if (!tx) throw fail('That transaction no longer exists.');
      const before = tx.toObject();
      const changes = p.changes || {};
      if (changes.categoryId) {
        const cat = await Category.findOne({ _id: changes.categoryId, userId });
        if (!cat || cat.type !== tx.type) throw fail('That category can’t be used for this transaction.');
        tx.categoryId = cat._id;
      }
      if (changes.amount) tx.amount = changes.amount;
      if (typeof changes.description === 'string') tx.description = changes.description;
      if (changes.occurredAt) tx.occurredAt = new Date(changes.occurredAt);
      await tx.save();
      await recordRevision(userId, tx._id, 'updated', { before, after: tx, via: 'ai' });
      if (tx.type === 'expense') await checkBudgetAfterTransaction(userId, tx.categoryId, tx.occurredAt);
      await checkMonthlyLimits(userId, tx.occurredAt);
      return { transactionId: String(tx._id), message: 'Transaction updated.' };
    }
    case 'delete_transaction': {
      const tx = await Transaction.findOneAndDelete({ _id: p.transactionId, userId });
      if (!tx) throw fail('That transaction was already deleted.');
      await recordRevision(userId, tx._id, 'deleted', { before: tx, via: 'ai' });
      return { message: 'Transaction deleted — you can restore it from Transactions → Recently deleted.' };
    }
    case 'set_budget': {
      const cat = await Category.findOne({ _id: p.categoryId, userId, type: 'expense' });
      if (!cat) throw fail('That category no longer exists.');
      const budget = await Budget.findOneAndUpdate(
        { userId, categoryId: cat._id, month: p.month },
        { $set: { limitAmount: p.limitAmount } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      return { budgetId: String(budget._id), message: `${cat.name} budget set for ${p.month}.` };
    }
    case 'add_savings_goal': {
      if ((await SavingsGoal.countDocuments({ userId })) >= 50) throw fail('You already have 50 goals.');
      const goal = await SavingsGoal.create({ userId, name: p.name, targetAmount: p.targetAmount, targetDate: p.targetDate ? new Date(p.targetDate) : null, icon: p.icon, color: p.color || 'teal' });
      return { goalId: String(goal._id), message: `Goal “${goal.name}” created.` };
    }
    case 'contribute_goal': {
      const goal = await SavingsGoal.findOne({ _id: p.goalId, userId });
      if (!goal) throw fail('That goal no longer exists.');
      goal.savedAmount = Math.max(0, Math.round((goal.savedAmount + p.amount) * 100) / 100);
      await goal.save();
      return { goalId: String(goal._id), message: `“${goal.name}” now has ${goal.savedAmount.toLocaleString('en-US')} saved.` };
    }
    case 'add_category': {
      try {
        const cat = await Category.create({ userId, name: p.name, type: p.type, isDefault: false });
        return { categoryId: String(cat._id), message: `Category “${cat.name}” added.` };
      } catch (err) {
        if (err.code === 11000) throw fail('You already have a category with that name.');
        throw err;
      }
    }
    case 'update_profile': {
      const $set = {};
      if (p.monthlyAllowanceBaseline) $set.monthlyAllowanceBaseline = p.monthlyAllowanceBaseline;
      if (p.savingsGoalAmount) $set.savingsGoalAmount = p.savingsGoalAmount;
      await User.updateOne({ _id: userId }, { $set });
      return { message: 'Profile updated.' };
    }
    default:
      throw fail('Unknown action.');
  }
}

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v));

module.exports = { ACTIONS_INSTRUCTION, extractActions, ruleBasedActions, resolveActions, applyAction, loadContext, isId };
