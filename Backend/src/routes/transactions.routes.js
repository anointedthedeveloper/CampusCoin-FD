const router = require('express').Router();
const multer = require('multer');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');
const { ensureRecurringProcessed } = require('./recurring.routes');
const { checkBudgetAfterTransaction, checkMonthlyLimits } = require('../services/budgetAlert.service');
const { validateIdParam, isValidObjectId } = require('../utils/objectId');

const TRANSACTION_TYPES = ['income', 'expense'];

function validateTransactionFields({ categoryId, type, amount, occurredAt }) {
  if (categoryId !== undefined && !isValidObjectId(categoryId)) return 'Invalid categoryId';
  if (type !== undefined && !TRANSACTION_TYPES.includes(type)) return "type must be 'income' or 'expense'";
  if (amount !== undefined && (typeof amount !== 'number' && typeof amount !== 'string')) return 'amount must be a number';
  if (amount !== undefined && !(Number(amount) > 0)) return 'amount must be a positive number';
  if (occurredAt !== undefined && isNaN(new Date(occurredAt).getTime())) return 'occurredAt must be a valid date';
  return null;
}

// Store CSV uploads in memory (we only need the text content, not a file on disk)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB cap
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are accepted'));
    }
  },
});

router.use(protect);
router.param('id', validateIdParam);

function formatTx(t) {
  return {
    id: t._id.toString(),
    userId: t.userId.toString(),
    categoryId: t.categoryId.toString(),
    type: t.type,
    amount: t.amount,
    description: t.description,
    merchant: t.merchant,
    occurredAt: t.occurredAt,
    source: t.source,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

// GET /api/v1/transactions
router.get('/', async (req, res) => {
  try {
    await ensureRecurringProcessed(req.user._id);
    const { categoryId, type, startDate, endDate, search, page = 1, pageSize = 20 } = req.query;
    if (categoryId && !isValidObjectId(categoryId)) return res.status(400).json({ message: 'Invalid categoryId' });

    const filter = { userId: req.user._id };
    if (categoryId) filter.categoryId = categoryId;
    if (type) filter.type = type;
    if (type && !['income', 'expense'].includes(type)) return res.status(400).json({ message: 'Invalid type' });
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : null;
      // A bare YYYY-MM-DD end date means "through the end of that day".
      const end = endDate
        ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(endDate) ? `${endDate}T23:59:59.999Z` : endDate)
        : null;
      if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) {
        return res.status(400).json({ message: 'Invalid startDate or endDate' });
      }
      filter.occurredAt = {};
      if (start) filter.occurredAt.$gte = start;
      if (end) filter.occurredAt.$lte = end;
    }
    if (typeof search === 'string' && search.trim()) {
      // Escape regex metacharacters: raw user input like "(" used to 500.
      const pattern = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { description: { $regex: pattern, $options: 'i' } },
        { merchant: { $regex: pattern, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 20));
    const skip = (pageNum - 1) * pageSizeNum;

    const [items, totalItems] = await Promise.all([
      Transaction.find(filter).sort({ occurredAt: -1 }).skip(skip).limit(pageSizeNum),
      Transaction.countDocuments(filter),
    ]);

    res.json({
      data: {
        items: items.map(formatTx),
        page: pageNum,
        pageSize: pageSizeNum,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSizeNum),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/v1/transactions/:id
router.get('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ data: formatTx(tx) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/v1/transactions
router.post('/', async (req, res) => {
  try {
    const { categoryId, type, amount, description, merchant, occurredAt } = req.body;
    if (!categoryId || !type || amount === undefined || !occurredAt) {
      return res.status(400).json({ message: 'categoryId, type, amount and occurredAt are required' });
    }
    const validationError = validateTransactionFields({ categoryId, type, amount, occurredAt });
    if (validationError) return res.status(400).json({ message: validationError });

    // Verify the category belongs to this user or is a default
    const cat = await Category.findOne({ _id: categoryId, $or: [{ userId: req.user._id }, { userId: null }] });
    if (!cat) return res.status(400).json({ message: 'Invalid category' });
    if (cat.type !== type) return res.status(400).json({ message: `"${cat.name}" is an ${cat.type} category` });

    // Possible duplicate: same type, amount and category on the same day.
    // The client can resend with confirmDuplicate: true to save it anyway.
    if (req.body.confirmDuplicate !== true) {
      const day = new Date(occurredAt);
      const dayStart = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()));
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const duplicate = await Transaction.findOne({
        userId: req.user._id,
        categoryId,
        type,
        amount: Number(amount),
        occurredAt: { $gte: dayStart, $lt: dayEnd },
      });
      if (duplicate) {
        return res.status(409).json({
          message: `You already logged ${type === 'income' ? 'income' : 'an expense'} of ${Number(amount).toLocaleString('en-US')} in ${cat.name} on this day. Save it again anyway?`,
          code: 'POSSIBLE_DUPLICATE',
        });
      }
    }

    const tx = await Transaction.create({
      userId: req.user._id,
      categoryId,
      type,
      amount: Number(amount),
      description,
      merchant,
      occurredAt: new Date(occurredAt),
      source: 'manual',
    });

    if (tx.type === 'expense') {
      await checkBudgetAfterTransaction(
        req.user._id,
        tx.categoryId,
        tx.occurredAt
      );
    }

    await checkMonthlyLimits(req.user._id, tx.occurredAt);

    res.status(201).json({ data: formatTx(tx) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/v1/transactions/:id
router.patch('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });

    const validationError = validateTransactionFields(req.body);
    if (validationError) return res.status(400).json({ message: validationError });

    if (req.body.categoryId !== undefined) {
      const cat = await Category.findOne({ _id: req.body.categoryId, $or: [{ userId: req.user._id }, { userId: null }] });
      if (!cat) return res.status(400).json({ message: 'Invalid category' });
    }

    const allowed = ['categoryId', 'type', 'amount', 'description', 'merchant', 'occurredAt'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        if (key === 'amount') tx.amount = Number(req.body[key]);
        else if (key === 'occurredAt') tx.occurredAt = new Date(req.body[key]);
        else tx[key] = req.body[key];
      }
    });
    await tx.save();

    if (tx.type === 'expense') {
      await checkBudgetAfterTransaction(req.user._id, tx.categoryId, tx.occurredAt);
    }
    await checkMonthlyLimits(req.user._id, tx.occurredAt);

    res.json({ data: formatTx(tx) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/v1/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    await tx.deleteOne();
    res.json({ data: null, message: 'Transaction deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/v1/transactions/import/preview
// Accepts multipart/form-data with a CSV file in the "file" field (sent by
// the frontend) OR a JSON body { csv: "<csv string>" } for backwards compat.
router.post('/import/preview', upload.single('file'), async (req, res) => {
  try {
    // Prefer the uploaded file buffer; fall back to a raw csv string in body
    let raw = '';
    if (req.file) {
      raw = req.file.buffer.toString('utf-8');
    } else if (req.body.csv) {
      raw = req.body.csv;
    }

    if (!raw.trim()) {
      return res.status(400).json({ message: 'No CSV data provided. Upload a CSV file.' });
    }

    const lines = raw.trim().split('\n').filter(Boolean);
    const dataLines = lines[0]?.toLowerCase().includes('date') ? lines.slice(1) : lines;

    const rows = [];
    let invalidRows = 0;

    for (const line of dataLines) {
      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      const [occurredAt, description, amountStr] = parts;
      const amount = parseFloat(amountStr);
      if (!occurredAt || isNaN(amount)) { invalidRows++; continue; }
      rows.push({ occurredAt, description: description || '', amount });
    }

    res.json({ data: { rows, totalRows: rows.length + invalidRows, invalidRows } });
  } catch (err) {
    // multer file-filter errors come through here
    if (err.message === 'Only CSV files are accepted') {
      return res.status(400).json({ message: err.message });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/v1/transactions/import/confirm
router.post('/import/confirm', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ message: 'rows array is required' });
    }

    // Find a fallback "Other" category for this user
    const fallback = await Category.findOne({
      $or: [{ userId: req.user._id }, { userId: null }],
      name: { $regex: /^other$/i },
    });

    const docs = rows
      .filter((r) => r.occurredAt && r.amount != null)
      .map((r) => ({
        userId: req.user._id,
        categoryId: r.suggestedCategoryId || fallback?._id,
        type: r.amount >= 0 ? 'income' : 'expense',
        amount: Math.abs(r.amount),
        description: r.description,
        occurredAt: new Date(r.occurredAt),
        source: 'csv-import',
      }))
      .filter((d) => d.categoryId);

    const created = await Transaction.insertMany(docs);
    res.status(201).json({ data: created.map(formatTx) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
