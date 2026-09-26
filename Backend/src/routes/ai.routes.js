const router = require('express').Router();
const Category = require('../models/Category');
const Insight = require('../models/Insight');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

router.use(protect);

// POST /api/v1/ai/categorize
// Suggests a category for a transaction based on its description and merchant.
// If OPENAI_API_KEY is set, uses OpenAI; otherwise falls back to keyword
// matching so the frontend never gets a 404.
router.post('/categorize', async (req, res) => {
  try {
    const { description = '', merchant = '' } = req.body;
    if (!description && !merchant) {
      return res.status(400).json({ message: 'description or merchant is required' });
    }

    // Fetch this user's categories (own + system defaults)
    const categories = await Category.find({
      $or: [{ userId: req.user._id }, { userId: null, isDefault: true }],
    });

    // ── OpenAI path ────────────────────────────────────────────────────
    if (process.env.OPENAI_API_KEY) {
      try {
        // Dynamic import keeps the package optional — server starts fine
        // even if openai is not installed yet.
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const categoryList = categories
          .map((c) => `${c._id} (${c.name}, ${c.type})`)
          .join('\n');

        const prompt = [
          'You are a personal finance assistant.',
          'Given the transaction details below, pick the single best matching category from the list.',
          'Reply with ONLY the category ID and nothing else.',
          '',
          `Description: ${description}`,
          `Merchant: ${merchant}`,
          '',
          'Categories:',
          categoryList,
        ].join('\n');

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 64,
          temperature: 0,
        });

        const rawId = completion.choices[0]?.message?.content?.trim();
        const matched = categories.find((c) => c._id.toString() === rawId);

        if (matched) {
          return res.json({
            data: { categoryId: matched._id.toString(), confidence: 0.9 },
          });
        }
      } catch (aiErr) {
        // AI call failed — fall through to keyword matching
        console.warn('OpenAI categorize failed, falling back to keywords:', aiErr.message);
      }
    }

    // ── Keyword fallback ───────────────────────────────────────────────
    const text = `${description} ${merchant}`.toLowerCase();

    const keywordMap = [
      { keywords: ['food', 'eat', 'restaurant', 'cafe', 'drink', 'lunch', 'dinner', 'breakfast', 'snack', 'groceries', 'supermarket'], name: 'Food & Drinks' },
      { keywords: ['uber', 'bolt', 'taxi', 'bus', 'transport', 'fare', 'fuel', 'petrol', 'ride', 'train'], name: 'Transport' },
      { keywords: ['rent', 'house', 'hostel', 'accommodation', 'landlord', 'lodge'], name: 'Housing' },
      { keywords: ['electric', 'water', 'internet', 'data', 'airtime', 'utility', 'bill', 'wifi'], name: 'Utilities' },
      { keywords: ['hospital', 'pharmacy', 'doctor', 'clinic', 'health', 'drug', 'medicine'], name: 'Healthcare' },
      { keywords: ['school', 'tuition', 'book', 'course', 'exam', 'lecture', 'education', 'study'], name: 'Education' },
      { keywords: ['netflix', 'spotify', 'cinema', 'movie', 'game', 'concert', 'entertainment', 'streaming'], name: 'Entertainment' },
      { keywords: ['shop', 'cloth', 'shoe', 'amazon', 'jumia', 'konga', 'fashion', 'buy', 'purchase'], name: 'Shopping' },
      { keywords: ['salary', 'wage', 'payroll', 'income', 'pay'], name: 'Salary' },
      { keywords: ['allowance', 'pocket', 'stipend'], name: 'Allowance' },
      { keywords: ['freelance', 'contract', 'gig', 'project'], name: 'Freelance' },
      { keywords: ['gift', 'present', 'donation'], name: 'Gift' },
      { keywords: ['save', 'savings', 'invest', 'piggy'], name: 'Savings' },
    ];

    let bestCategory = null;
    for (const { keywords, name } of keywordMap) {
      if (keywords.some((kw) => text.includes(kw))) {
        bestCategory = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
        if (bestCategory) break;
      }
    }

    // Last resort: return the first "Other" or just the first category
    if (!bestCategory) {
      bestCategory =
        categories.find((c) => /^other$/i.test(c.name)) || categories[0];
    }

    res.json({
      data: {
        categoryId: bestCategory?._id.toString() ?? null,
        confidence: bestCategory ? 0.4 : 0,
      },
    });
  } catch (err) {
    console.error('AI categorize error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/v1/ai/insights/generate
// Generates a monthly financial insight for the given month.
// If OPENAI_API_KEY is set, uses OpenAI; otherwise creates a rule-based insight
// so the frontend always gets a valid insightId back.
router.post('/insights/generate', async (req, res) => {
  try {
    const { month } = req.body;
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ message: 'month is required in YYYY-MM format' });
    }

    const userId = req.user._id;
    const [year, mon] = month.split('-').map(Number);
    const start = new Date(year, mon - 1, 1);
    const end = new Date(year, mon, 1);

    const transactions = await Transaction.find({
      userId,
      occurredAt: { $gte: start, $lt: end },
    });

    const totalIncome = transactions
      .filter((t) => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    let insightTitle = '';
    let insightBody = '';

    // ── OpenAI path ────────────────────────────────────────────────────
    if (process.env.OPENAI_API_KEY) {
      try {
        const { default: OpenAI } = await import('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const prompt = [
          `Generate a short (2-3 sentence) financial insight for a university student for ${month}.`,
          `Total income: ₦${totalIncome.toLocaleString()}`,
          `Total expenses: ₦${totalExpense.toLocaleString()}`,
          `Net savings: ₦${netSavings.toLocaleString()} (${savingsRate.toFixed(1)}% savings rate)`,
          'Be specific, encouraging, and actionable. Do not use markdown.',
          'Reply with JSON: { "title": "...", "body": "..." }',
        ].join('\n');

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 200,
          temperature: 0.7,
        });

        const raw = completion.choices[0]?.message?.content?.trim() ?? '';
        const parsed = JSON.parse(raw);
        insightTitle = parsed.title;
        insightBody = parsed.body;
      } catch (aiErr) {
        console.warn('OpenAI insight failed, falling back to rule-based:', aiErr.message);
      }
    }

    // ── Rule-based fallback ────────────────────────────────────────────
    if (!insightTitle) {
      if (transactions.length === 0) {
        insightTitle = 'No transactions recorded';
        insightBody = `You have no transactions logged for ${month}. Start tracking your income and expenses to get personalized insights.`;
      } else if (savingsRate >= 20) {
        insightTitle = 'Great savings rate!';
        insightBody = `You saved ${savingsRate.toFixed(0)}% of your income in ${month} — that's ₦${netSavings.toLocaleString()}. Keep it up and consider putting some aside in a dedicated savings account.`;
      } else if (savingsRate > 0) {
        insightTitle = 'Room to save more';
        insightBody = `You saved ${savingsRate.toFixed(0)}% of your income in ${month}. Try reducing your top expense category by 10% next month to boost your savings.`;
      } else if (netSavings < 0) {
        insightTitle = 'Expenses exceeded income';
        insightBody = `You spent ₦${Math.abs(netSavings).toLocaleString()} more than you earned in ${month}. Review your largest expense categories and look for areas to cut back.`;
      } else {
        insightTitle = `Monthly summary for ${month}`;
        insightBody = `Income: ₦${totalIncome.toLocaleString()} · Expenses: ₦${totalExpense.toLocaleString()} · Net: ₦${netSavings.toLocaleString()}.`;
      }
    }

    // Upsert so re-generating the same month overwrites the old insight
    const insight = await Insight.findOneAndUpdate(
      { userId, month, kind: 'monthly-summary' },
      {
        $set: {
          userId,
          month,
          kind: 'monthly-summary',
          title: insightTitle,
          body: insightBody,
          isAiGenerated: !!process.env.OPENAI_API_KEY,
        },
      },
      { upsert: true, new: true },
    );

    res.status(201).json({ data: { insightId: insight._id.toString() } });
  } catch (err) {
    console.error('AI insights/generate error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
