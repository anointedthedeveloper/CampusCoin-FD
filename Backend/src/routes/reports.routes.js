const router = require('express').Router();
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');

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
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ message: 'month must be in YYYY-MM format' });

    const { start, end } = getMonthRange(month);

    const filter = { userId: req.user._id, occurredAt: { $gte: start, $lt: end } };
    if (req.query.categoryId) filter.categoryId = req.query.categoryId;
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

    const [categoryBreakdown, dailySpend, weeklySpend] = await Promise.all([
      buildCategoryBreakdown(expenseTxs, totalExpense),
      Promise.resolve(buildDailySpend(expenseTxs)),
      Promise.resolve(buildWeeklySpend(expenseTxs)),
    ]);

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
        dailySpend,
        weeklySpend,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ── GET /api/v1/reports/monthly/pdf?month=YYYY-MM ─────────────────────
router.get('/monthly/pdf', async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'month must be in YYYY-MM format' });
    }

    const { start, end } = getMonthRange(month);

    const transactions = await Transaction.find({
      userId: req.user._id,
      occurredAt: { $gte: start, $lt: end },
    }).sort({ occurredAt: 1 });

    const totalIncome = transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const expenseTxs = transactions.filter((t) => t.type === 'expense');

    const categoryBreakdown = await buildCategoryBreakdown(expenseTxs, totalExpense);
    const dailySpend = buildDailySpend(expenseTxs);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const filename = `CampusCoin-Monthly-Report-${month}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    doc.pipe(res);

    // Header
    doc.fontSize(22).font('Helvetica-Bold').text('CampusCoin');
    doc.fontSize(16).font('Helvetica-Bold').text('Monthly Financial Report');
    doc.fontSize(11).font('Helvetica').text(`Report Month: ${month}`);
    doc.moveDown();

    // Summary
    doc.fontSize(14).font('Helvetica-Bold').text('Monthly Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).font('Helvetica')
      .text(`Total Income: ${totalIncome.toLocaleString()} NGN`)
      .text(`Total Expense: ${totalExpense.toLocaleString()} NGN`)
      .text(`Net Savings: ${(totalIncome - totalExpense).toLocaleString()} NGN`);
    doc.moveDown();

    // Category Breakdown
    doc.fontSize(14).font('Helvetica-Bold').text('Expense by Category');
    doc.moveDown(0.5);
    if (categoryBreakdown.length === 0) {
      doc.fontSize(11).font('Helvetica').text('No expense transactions for this month.');
    } else {
      categoryBreakdown.forEach((c) => {
        doc.fontSize(11).font('Helvetica')
          .text(`${c.categoryName}: ${c.amount.toLocaleString()} NGN (${c.percentage}%)`);
      });
    }
    doc.moveDown();

    // Daily Spending
    doc.fontSize(14).font('Helvetica-Bold').text('Daily Spending');
    doc.moveDown(0.5);
    if (dailySpend.length === 0) {
      doc.fontSize(11).font('Helvetica').text('No expense transactions for this month.');
    } else {
      dailySpend.forEach((d) => {
        doc.fontSize(10).font('Helvetica').text(`${d.date} — ${d.amount.toLocaleString()} NGN`);
      });
    }
    doc.moveDown();

    // Footer
    doc.fontSize(9).font('Helvetica').text('Generated by CampusCoin', { align: 'center' });
    doc.end();
  } catch (err) {
    console.error(err);
    if (!res.headersSent) return res.status(500).json({ message: 'Unable to generate report' });
    res.end();
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
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
