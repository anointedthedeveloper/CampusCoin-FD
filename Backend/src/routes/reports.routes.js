const router = require('express').Router();
const { serverError } = require('../utils/httpErrors');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');
const { ensureRecurringProcessed } = require('./recurring.routes');
const { isValidObjectId } = require('../utils/objectId');
const rateLimit = require('express-rate-limit');
const { isEmailConfigured, sendReportEmail } = require('../services/email.service');

const emailReportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'You have emailed a lot of reports — please try again in an hour.' },
});

router.use(protect);

// ── Helpers ───────────────────────────────────────────────────────────

function getMonthRange(month) {
  const [year, mon] = month.split('-').map(Number);
  return { start: new Date(year, mon - 1, 1), end: new Date(year, mon, 1) };
}

async function buildCategoryBreakdown(expenseTxs, totalExpense) {
  const categoryTotals = {};
  expenseTxs.forEach((t) => {
    const cid = t.categoryId.toString();
    categoryTotals[cid] = (categoryTotals[cid] || 0) + t.amount;
  });

  const categoryIds = Object.keys(categoryTotals);
  const categories = await Category.find({ _id: { $in: categoryIds } });
  const catMap = {};
  categories.forEach((c) => { catMap[c._id.toString()] = c.name; });

  return categoryIds
    .map((cid) => ({
      categoryId: cid,
      categoryName: catMap[cid] || 'Unknown',
      amount: categoryTotals[cid],
      percentage: totalExpense > 0 ? Math.round((categoryTotals[cid] / totalExpense) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);
}

function buildDailySpend(expenseTxs) {
  const dailyMap = {};
  expenseTxs.forEach((t) => {
    const date = t.occurredAt.toISOString().slice(0, 10);
    dailyMap[date] = (dailyMap[date] || 0) + t.amount;
  });
  return Object.entries(dailyMap)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Weeks start on Monday
function buildWeeklySpend(expenseTxs) {
  const weeklyMap = {};
  expenseTxs.forEach((t) => {
    const date = new Date(t.occurredAt);
    const day = date.getUTCDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(date);
    weekStart.setUTCDate(date.getUTCDate() - daysFromMonday);
    weekStart.setUTCHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
    const key = weekStart.toISOString().slice(0, 10);
    if (!weeklyMap[key]) {
      weeklyMap[key] = { weekStart: key, weekEnd: weekEnd.toISOString().slice(0, 10), amount: 0 };
    }
    weeklyMap[key].amount += t.amount;
  });
  return Object.values(weeklyMap).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

// ── GET /api/v1/reports/monthly?month=YYYY-MM ─────────────────────────
router.get('/monthly', async (req, res) => {
  try {
    await ensureRecurringProcessed(req.user._id);
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'month must be in YYYY-MM format' });

    const { start, end } = getMonthRange(month);

    const filter = { userId: req.user._id, occurredAt: { $gte: start, $lt: end } };
    if (req.query.categoryId) {
      if (!isValidObjectId(req.query.categoryId)) return res.status(400).json({ message: 'Invalid categoryId' });
      filter.categoryId = req.query.categoryId;
    }
    for (const key of ['startDate', 'endDate']) {
      if (req.query[key] && !/^\d{4}-\d{2}-\d{2}$/.test(req.query[key])) {
        return res.status(400).json({ message: `${key} must be in YYYY-MM-DD format` });
      }
    }
    if (req.query.type && ['income', 'expense'].includes(req.query.type)) filter.type = req.query.type;
    if (req.query.source) filter.source = req.query.source;
    if (req.query.startDate) filter.occurredAt.$gte = new Date(`${req.query.startDate}T00:00:00.000Z`);
    if (req.query.endDate) {
      const endDate = new Date(`${req.query.endDate}T00:00:00.000Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      filter.occurredAt.$lt = endDate;
    }

    const transactions = await Transaction.find(filter).sort({ occurredAt: 1 });

    const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const expenseTxs = transactions.filter((t) => t.type === 'expense');

    const incomeTxs = transactions.filter((t) => t.type === 'income');
    const [categoryBreakdown, incomeBreakdown, dailySpend, weeklySpend, allCategories] = await Promise.all([
      buildCategoryBreakdown(expenseTxs, totalExpense),
      buildCategoryBreakdown(incomeTxs, totalIncome),
      Promise.resolve(buildDailySpend(expenseTxs)),
      Promise.resolve(buildWeeklySpend(expenseTxs)),
      Category.find({ _id: { $in: [...new Set(transactions.map((t) => t.categoryId.toString()))] } }),
    ]);
    const nameById = new Map(allCategories.map((c) => [c._id.toString(), c.name]));

    res.json({
      data: {
        month,
        filters: {
          categoryId: req.query.categoryId || null,
          type: req.query.type || null,
          source: req.query.source || null,
          startDate: req.query.startDate || null,
          endDate: req.query.endDate || null,
        },
        totalIncome,
        totalExpense,
        netSavings: totalIncome - totalExpense,
        categoryBreakdown,
        incomeBreakdown,
        dailySpend,
        weeklySpend,
        transactionCount: transactions.length,
        // Newest first, for the report's transaction table.
        transactions: transactions
          .slice()
          .reverse()
          .slice(0, 500)
          .map((t) => ({
            id: t._id.toString(),
            type: t.type,
            amount: t.amount,
            description: t.description ?? '',
            categoryId: t.categoryId.toString(),
            categoryName: nameById.get(t.categoryId.toString()) ?? 'Uncategorized',
            occurredAt: t.occurredAt,
          })),
      },
    });
  } catch (err) {
    return serverError(res, err);
  }
});

/**
 * Builds the monthly report PDF for `user` and resolves with its bytes.
 * Shared by the download route and "email me this report".
 */
async function buildMonthlyPdf(user, month) {
  const PDFDocument = require('pdfkit');
  const { start, end } = getMonthRange(month);

  const transactions = await Transaction.find({
    userId: user._id,
    occurredAt: { $gte: start, $lt: end },
  }).sort({ occurredAt: 1 });

  const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const expenseTxs = transactions.filter((t) => t.type === 'expense');

  const incomeTxs = transactions.filter((t) => t.type === 'income');
  const [categoryBreakdown, incomeBreakdown, categories] = await Promise.all([
    buildCategoryBreakdown(expenseTxs, totalExpense),
    buildCategoryBreakdown(incomeTxs, totalIncome),
    Category.find({ _id: { $in: [...new Set(transactions.map((t) => t.categoryId.toString()))] } }),
  ]);
  const nameById = new Map(categories.map((c) => [c._id.toString(), c.name]));
  const dailySpend = buildDailySpend(expenseTxs);
  const weeklySpend = buildWeeklySpend(expenseTxs);
  const currency = user.settings?.currency || 'NGN';
  const money = (n) => `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const brand = '#1c8f53';
  const heading = (text) => {
    doc.moveDown(0.8);
    doc.fontSize(13).font('Helvetica-Bold').fillColor(brand).text(text);
    doc.moveDown(0.3);
    doc.fillColor('#111827');
  };

  // Header
  doc.fontSize(22).font('Helvetica-Bold').fillColor(brand).text('Campus Coin');
  doc.fontSize(15).fillColor('#111827').text('Monthly Financial Report');
  doc.fontSize(10).font('Helvetica').fillColor('#4b5563')
    .text(`Student: ${user.fullName}`)
    .text(`Report month: ${month}`)
    .text(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  doc.fillColor('#111827');

  heading('Summary');
  doc.fontSize(11).font('Helvetica')
    .text(`Total income: ${money(totalIncome)}`)
    .text(`Total expenses: ${money(totalExpense)}`)
    .text(`Net savings: ${money(totalIncome - totalExpense)}`)
    .text(`Transactions: ${transactions.length}`);

  heading('Income by source');
  if (incomeBreakdown.length === 0) doc.fontSize(11).font('Helvetica').text('No income recorded this month.');
  else incomeBreakdown.forEach((c) => doc.fontSize(11).font('Helvetica').text(`${c.categoryName}: ${money(c.amount)} (${c.percentage}%)`));

  heading('Spending by category');
  if (categoryBreakdown.length === 0) doc.fontSize(11).font('Helvetica').text('No expenses recorded this month.');
  else categoryBreakdown.forEach((c) => doc.fontSize(11).font('Helvetica').text(`${c.categoryName}: ${money(c.amount)} (${c.percentage}%)`));

  heading('Weekly spending');
  if (weeklySpend.length === 0) doc.fontSize(11).font('Helvetica').text('No expenses recorded this month.');
  else weeklySpend.forEach((w) => doc.fontSize(10).font('Helvetica').text(`${w.weekStart} to ${w.weekEnd}: ${money(w.amount)}`));

  heading('Daily spending');
  if (dailySpend.length === 0) doc.fontSize(11).font('Helvetica').text('No expenses recorded this month.');
  else dailySpend.forEach((d) => doc.fontSize(10).font('Helvetica').text(`${d.date}: ${money(d.amount)}`));

  heading('Transactions');
  if (transactions.length === 0) {
    doc.fontSize(11).font('Helvetica').text('No transactions this month.');
  } else {
    const cols = [50, 125, 300, 420];
    const row = (values, bold) => {
      if (doc.y > 760) doc.addPage();
      const y = doc.y;
      doc.fontSize(9).font(bold ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(values[0], cols[0], y, { width: 70 });
      doc.text(values[1], cols[1], y, { width: 170, ellipsis: true, height: 12 });
      doc.text(values[2], cols[2], y, { width: 115, ellipsis: true, height: 12 });
      doc.text(values[3], cols[3], y, { width: 125, align: 'right' });
      doc.x = 50;
      doc.y = y + 14;
    };
    row(['Date', 'Description', 'Category', 'Amount'], true);
    transactions.slice(0, 300).forEach((t) => {
      row([
        t.occurredAt.toISOString().slice(0, 10),
        t.description || (t.type === 'income' ? 'Income' : 'Expense'),
        nameById.get(t.categoryId.toString()) ?? 'Uncategorized',
        `${t.type === 'income' ? '+' : '-'}${money(t.amount)}`,
      ]);
    });
    if (transactions.length > 300) doc.fontSize(9).text(`…and ${transactions.length - 300} more.`);
  }

  doc.moveDown(2);
  doc.fontSize(8).font('Helvetica').fillColor('#6b7280')
    .text('Generated by Campus Coin. Figures are based on entries you recorded; this is not financial advice.', 50, doc.y, { align: 'center', width: 495 });
  doc.end();
  return done;
}

const MONTH_RE = /^\d{4}-\d{2}$/;

// ── GET /api/v1/reports/monthly/pdf?month=YYYY-MM ─────────────────────
router.get('/monthly/pdf', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (typeof month !== 'string' || !MONTH_RE.test(month)) {
      return res.status(400).json({ message: 'month must be in YYYY-MM format' });
    }
    const pdf = await buildMonthlyPdf(req.user, month);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CampusCoin-Monthly-Report-${month}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) return res.status(500).json({ message: 'Unable to generate report' });
    res.end();
  }
});

// ── POST /api/v1/reports/monthly/email  { month, to? } ────────────────
// Emails the monthly PDF to the student (or to an address they choose,
// e.g. a parent or sponsor).
router.post('/monthly/email', emailReportLimiter, async (req, res) => {
  try {
    const month = typeof req.body?.month === 'string' ? req.body.month : new Date().toISOString().slice(0, 7);
    if (!MONTH_RE.test(month)) return res.status(400).json({ message: 'month must be in YYYY-MM format' });
    const to = typeof req.body?.to === 'string' && req.body.to.trim() ? req.body.to.trim().toLowerCase() : req.user.email;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || to.length > 200) {
      return res.status(400).json({ message: 'Enter a valid email address', fieldErrors: { to: 'Invalid email' } });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({ message: 'Email is not set up on the server yet, so the report cannot be sent. Download the PDF instead.', code: 'EMAIL_NOT_CONFIGURED' });
    }
    const pdf = await buildMonthlyPdf(req.user, month);
    try {
      await sendReportEmail({ to, fromName: req.user.fullName, month, pdf, toSelf: to === req.user.email });
    } catch (err) {
      console.error('Report email failed:', err.message);
      return res.status(502).json({ message: 'The email could not be sent right now. Please try again later.', code: 'EMAIL_SEND_FAILED' });
    }
    res.json({ data: { to }, message: `Report for ${month} sent to ${to}.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Unable to send report' });
  }
});

// ── GET /api/v1/reports/six-months ───────────────────────────────────
router.get('/six-months', async (req, res) => {
  try {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const transactions = await Transaction.find({
      userId: req.user._id,
      occurredAt: { $gte: start, $lt: end },
    }).sort({ occurredAt: 1 });

    // Build a map pre-seeded with all 6 months so months with no
    // transactions still appear in the response
    const monthMap = {};
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = date.toISOString().slice(0, 7);
      monthMap[key] = { month: key, income: 0, expense: 0, netSavings: 0 };
    }

    transactions.forEach((t) => {
      const key = t.occurredAt.toISOString().slice(0, 7);
      if (!monthMap[key]) return;
      if (t.type === 'income') monthMap[key].income += t.amount;
      if (t.type === 'expense') monthMap[key].expense += t.amount;
    });

    const data = Object.values(monthMap).map((item) => ({
      ...item,
      netSavings: item.income - item.expense,
    }));

    res.json({ data });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
