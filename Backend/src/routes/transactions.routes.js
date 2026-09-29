const router = require('express').Router();
const { serverError } = require('../utils/httpErrors');
const multer = require('multer');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const { protect } = require('../middleware/auth');
const { ensureRecurringProcessed } = require('./recurring.routes');
const { checkBudgetAfterTransaction, checkMonthlyLimits } = require('../services/budgetAlert.service');
const { validateIdParam, isValidObjectId } = require('../utils/objectId');
const ImportBatch = require('../models/ImportBatch');
const TransactionRevision = require('../models/TransactionRevision');
const { recordRevision, recordCreatedMany } = require('../services/revision.service');
const { suggestCategoriesForRows } = require('../services/categorizer.service');

const TRANSACTION_TYPES = ['income', 'expense'];

const MAX_AMOUNT = 1e12;
const MIN_DATE = new Date('1970-01-01T00:00:00Z');

function validateTransactionFields({ categoryId, type, amount, occurredAt, description, merchant }) {
  if (categoryId !== undefined && (typeof categoryId !== 'string' || !isValidObjectId(categoryId))) return 'Invalid categoryId';
  if (type !== undefined && !TRANSACTION_TYPES.includes(type)) return "type must be 'income' or 'expense'";
  if (amount !== undefined && (typeof amount !== 'number' && typeof amount !== 'string')) return 'amount must be a number';
  if (amount !== undefined && !(Number(amount) > 0)) return 'amount must be a positive number';
  if (amount !== undefined && Number(amount) > MAX_AMOUNT) return 'amount is too large';
  if (occurredAt !== undefined) {
    if (typeof occurredAt !== 'string' && typeof occurredAt !== 'number') return 'occurredAt must be a valid date';
    const d = new Date(occurredAt);
    if (isNaN(d.getTime())) return 'occurredAt must be a valid date';
    if (d < MIN_DATE || d.getTime() > Date.now() + 5 * 365 * 24 * 60 * 60 * 1000) return 'occurredAt is out of range';
  }
  if (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 300)) return 'description must be text under 300 characters';
  if (merchant !== undefined && merchant !== null && (typeof merchant !== 'string' || merchant.length > 120)) return 'merchant must be text under 120 characters';
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

/** Builds the Mongo filter shared by the list and export routes. */
function buildFilter(userId, query) {
  const { categoryId, type, startDate, endDate, search } = query;
  if (categoryId && (typeof categoryId !== 'string' || !isValidObjectId(categoryId))) return { error: 'Invalid categoryId' };
  if (type && !['income', 'expense'].includes(type)) return { error: 'Invalid type' };
  const filter = { userId };
  if (categoryId) filter.categoryId = categoryId;
  if (type) filter.type = type;
  if (startDate || endDate) {
    if ((startDate && typeof startDate !== 'string') || (endDate && typeof endDate !== 'string')) return { error: 'Invalid startDate or endDate' };
    const start = startDate ? new Date(startDate) : null;
    // A bare YYYY-MM-DD end date means "through the end of that day".
    const end = endDate ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(endDate) ? `${endDate}T23:59:59.999Z` : endDate) : null;
    if ((start && Number.isNaN(start.getTime())) || (end && Number.isNaN(end.getTime()))) return { error: 'Invalid startDate or endDate' };
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
  return { filter };
}

const EXPORT_LIMIT = 5000;

// GET /api/v1/transactions/export?format=json|pdf&type&categoryId&startDate&endDate&search
// Every matching transaction (up to 5,000) with its category name, for the
// CSV / Excel / JSON / image downloads (built in the browser) or as a PDF.
router.get('/export', async (req, res) => {
  try {
    const built = buildFilter(req.user._id, req.query);
    if (built.error) return res.status(400).json({ message: built.error });
    const [items, categories] = await Promise.all([
      Transaction.find(built.filter).sort({ occurredAt: -1 }).limit(EXPORT_LIMIT).lean(),
      Category.find({ userId: req.user._id }).select('name').lean(),
    ]);
    const names = new Map(categories.map((c) => [String(c._id), c.name]));
    const rows = items.map((t) => ({
      id: String(t._id),
      date: t.occurredAt.toISOString().slice(0, 10),
      type: t.type,
      category: names.get(String(t.categoryId)) || 'Uncategorised',
      description: t.description || '',
      merchant: t.merchant || '',
      amount: t.amount,
      source: t.source,
    }));

    if (req.query.format !== 'pdf') return res.json({ data: rows, meta: { truncated: items.length === EXPORT_LIMIT } });

    const PDFDocument = require('pdfkit');
    const currency = req.user.settings?.currency || 'NGN';
    const money = (n) => `${currency} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    const done = new Promise((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });

    const income = rows.filter((r) => r.type === 'income').reduce((a, r) => a + r.amount, 0);
    const expense = rows.filter((r) => r.type === 'expense').reduce((a, r) => a + r.amount, 0);
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#1c8f53').text('Campus Coin');
    doc.fontSize(13).fillColor('#111827').text('Transactions');
    doc.fontSize(9).font('Helvetica').fillColor('#4b5563')
      .text(`${req.user.fullName} · exported ${new Date().toISOString().slice(0, 10)} · ${rows.length} transaction${rows.length === 1 ? '' : 's'}`)
      .text(`Income ${money(income)}   Expenses ${money(expense)}   Net ${money(income - expense)}`);
    doc.moveDown(0.8);
    const cols = [40, 105, 160, 260, 435];
    const row = (v, bold) => {
      if (doc.y > 780) doc.addPage();
      const y = doc.y;
      doc.fontSize(8.5).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor('#111827');
      doc.text(v[0], cols[0], y, { width: 62 });
      doc.text(v[1], cols[1], y, { width: 52 });
      doc.text(v[2], cols[2], y, { width: 96, ellipsis: true, height: 11 });
      doc.text(v[3], cols[3], y, { width: 170, ellipsis: true, height: 11 });
      doc.text(v[4], cols[4], y, { width: 120, align: 'right' });
      doc.x = 40;
      doc.y = y + 13;
    };
    row(['Date', 'Type', 'Category', 'Description', 'Amount'], true);
    rows.forEach((r) => row([r.date, r.type, r.category, r.description || '—', `${r.type === 'income' ? '+' : '-'}${money(r.amount)}`]));
    if (!rows.length) doc.fontSize(10).text('No transactions match these filters.');
    doc.end();
    const pdf = await done;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="CampusCoin-Transactions-${new Date().toISOString().slice(0, 10)}.pdf"`);
    res.send(pdf);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ message: 'Unable to export transactions' });
  }
});

// GET /api/v1/transactions
router.get('/', async (req, res) => {
  try {
    await ensureRecurringProcessed(req.user._id);
    const { page = 1, pageSize = 20 } = req.query;
    const built = buildFilter(req.user._id, req.query);
    if (built.error) return res.status(400).json({ message: built.error });
    const { filter } = built;

    const pageNum = Math.min(100000, Math.max(1, parseInt(page) || 1));
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
    return serverError(res, err);
  }
});

function formatRevision(r, names) {
  const withName = (snap) => (snap ? { ...snap, categoryName: snap.categoryId ? names.get(String(snap.categoryId)) ?? 'Deleted category' : undefined } : null);
  return { id: String(r._id), transactionId: String(r.transactionId), action: r.action, via: r.via, before: withName(r.before), after: withName(r.after), at: r.createdAt, restoredAt: r.restoredAt };
}

async function categoryNames(userId) {
  const cats = await Category.find({ userId }).select('name').lean();
  return new Map(cats.map((c) => [String(c._id), c.name]));
}

// GET /api/v1/transactions/activity — the latest changes (any device).
router.get('/activity', async (req, res) => {
  try {
    const [revs, names] = await Promise.all([
      TransactionRevision.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(20).lean(),
      categoryNames(req.user._id),
    ]);
    res.json({ data: revs.map((r) => formatRevision(r, names)) });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/v1/transactions/deleted — deleted in the last 30 days, not yet restored.
router.get('/deleted', async (req, res) => {
  try {
    const since = new Date(Date.now() - 30 * 864e5);
    const [revs, names] = await Promise.all([
      TransactionRevision.find({ userId: req.user._id, action: 'deleted', restoredAt: null, createdAt: { $gt: since } }).sort({ createdAt: -1 }).limit(50).lean(),
      categoryNames(req.user._id),
    ]);
    res.json({ data: revs.map((r) => formatRevision(r, names)) });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/transactions/deleted/:revisionId/restore
router.post('/deleted/:revisionId/restore', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.revisionId)) return res.status(400).json({ message: 'Invalid id' });
    const rev = await TransactionRevision.findOne({ _id: req.params.revisionId, userId: req.user._id, action: 'deleted' });
    if (!rev) return res.status(404).json({ message: 'Deleted transaction not found' });
    if (rev.restoredAt) return res.status(409).json({ message: 'This transaction was already restored.' });
    if (await Transaction.exists({ _id: rev.transactionId })) return res.status(409).json({ message: 'This transaction already exists.' });
    const snap = rev.before || {};
    // Its category may have been deleted since — fall back like a delete does.
    let cat = snap.categoryId && isValidObjectId(String(snap.categoryId)) ? await Category.findOne({ _id: snap.categoryId, userId: req.user._id }) : null;
    if (!cat) cat = await Category.findOne({ userId: req.user._id, type: snap.type, name: { $in: snap.type === 'income' ? ['Other Income', 'Other'] : ['Miscellaneous', 'Other'] } });
    if (!cat) return res.status(400).json({ message: 'Its category no longer exists. Add a category first.' });
    const tx = await Transaction.create({
      _id: rev.transactionId,
      userId: req.user._id,
      categoryId: cat._id,
      type: snap.type,
      amount: snap.amount,
      description: snap.description,
      merchant: snap.merchant,
      occurredAt: new Date(snap.occurredAt),
      source: snap.source || 'manual',
    });
    rev.restoredAt = new Date();
    await rev.save();
    await recordRevision(req.user._id, tx._id, 'restored', { after: tx, via: 'restore' });
    res.json({ data: formatTx(tx), message: 'Transaction restored' });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/v1/transactions/:id/history — every change to one transaction.
router.get('/:id/history', async (req, res) => {
  try {
    const [revs, names] = await Promise.all([
      TransactionRevision.find({ userId: req.user._id, transactionId: req.params.id }).sort({ createdAt: -1 }).limit(100).lean(),
      categoryNames(req.user._id),
    ]);
    res.json({ data: revs.map((r) => formatRevision(r, names)) });
  } catch (err) {
    return serverError(res, err);
  }
});

// GET /api/v1/transactions/:id
router.get('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    res.json({ data: formatTx(tx) });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/transactions
router.post('/', async (req, res) => {
  try {
    const { categoryId, type, amount, description, merchant, occurredAt } = req.body;
    if (!categoryId || !type || amount === undefined || !occurredAt) {
      return res.status(400).json({ message: 'categoryId, type, amount and occurredAt are required' });
    }
    const validationError = validateTransactionFields({ categoryId, type, amount, occurredAt, description, merchant });
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
    await recordRevision(req.user._id, tx._id, 'created', { after: tx });

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
    return serverError(res, err);
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

    const before = tx.toObject();
    const allowed = ['categoryId', 'type', 'amount', 'description', 'merchant', 'occurredAt'];
    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        if (key === 'amount') tx.amount = Number(req.body[key]);
        else if (key === 'occurredAt') tx.occurredAt = new Date(req.body[key]);
        else tx[key] = req.body[key];
      }
    });
    await tx.save();
    await recordRevision(req.user._id, tx._id, 'updated', { before, after: tx });

    if (tx.type === 'expense') {
      await checkBudgetAfterTransaction(req.user._id, tx.categoryId, tx.occurredAt);
    }
    await checkMonthlyLimits(req.user._id, tx.occurredAt);

    res.json({ data: formatTx(tx) });
  } catch (err) {
    return serverError(res, err);
  }
});

// DELETE /api/v1/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id });
    if (!tx) return res.status(404).json({ message: 'Transaction not found' });
    await tx.deleteOne();
    // Kept in history, so it can be restored from "Recently deleted".
    await recordRevision(req.user._id, tx._id, 'deleted', { before: tx });
    res.json({ data: null, message: 'Transaction deleted' });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/transactions/import/preview
// Legacy server-side CSV preview (the app now reads CSV, Excel, Word and
// JSON files in the browser). Kept for older clients.
router.post('/import/preview', upload.single('file'), async (req, res) => {
  try {
    let raw = '';
    if (req.file) raw = req.file.buffer.toString('utf-8');
    else if (typeof req.body.csv === 'string') raw = req.body.csv;
    if (!raw.trim()) return res.status(400).json({ message: 'No CSV data provided. Upload a CSV file.' });

    const lines = raw.trim().split(/\r?\n/).filter(Boolean).slice(0, 5001);
    const dataLines = lines[0]?.toLowerCase().includes('date') ? lines.slice(1) : lines;
    const rows = [];
    let invalidRows = 0;
    for (const line of dataLines) {
      const parts = line.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
      const [occurredAt, description, amountStr] = parts;
      const amount = parseFloat(amountStr);
      if (!occurredAt || isNaN(amount)) { invalidRows++; continue; }
      rows.push({ occurredAt, description: (description || '').slice(0, 300), amount });
    }
    res.json({ data: { rows, totalRows: rows.length + invalidRows, invalidRows } });
  } catch (err) {
    if (err.message === 'Only CSV files are accepted') return res.status(400).json({ message: err.message });
    return serverError(res, err);
  }
});

const MAX_IMPORT_ROWS = 2000;

// POST /api/v1/transactions/import/categorize  { rows: [{ description, type }] }
// Batch category suggestions for an import: the student's own history
// first, then AI (if switched on), then keyword rules.
router.post('/import/categorize', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows || !rows.length) return res.status(400).json({ message: 'rows array is required' });
    if (rows.length > MAX_IMPORT_ROWS) return res.status(400).json({ message: `You can import up to ${MAX_IMPORT_ROWS} rows at a time.` });
    const clean = rows.map((r) => ({
      description: typeof r?.description === 'string' ? r.description.slice(0, 300) : '',
      type: TRANSACTION_TYPES.includes(r?.type) ? r.type : undefined,
    }));
    const suggestions = await suggestCategoriesForRows(req.user, clean);
    res.json({ data: suggestions });
  } catch (err) {
    return serverError(res, err);
  }
});

// POST /api/v1/transactions/import/confirm
// { rows: [{ occurredAt, description, amount, type, categoryId }], skipDuplicates?, fileName? }
// Every row is validated and must use one of the student's own categories
// of the matching type. Rows that exactly match an existing transaction
// (same day, type, amount and description) are skipped unless
// skipDuplicates is false.
router.post('/import/confirm', async (req, res) => {
  try {
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : null;
    if (!rows || rows.length === 0) return res.status(400).json({ message: 'rows array is required' });
    if (rows.length > MAX_IMPORT_ROWS) return res.status(400).json({ message: `You can import up to ${MAX_IMPORT_ROWS} rows at a time.` });
    const skipDuplicates = req.body.skipDuplicates !== false;

    const categories = await Category.find({ userId: req.user._id }).lean();
    const catById = new Map(categories.map((c) => [String(c._id), c]));
    const fallback = {
      expense: categories.find((c) => c.type === 'expense' && /misc|other/i.test(c.name)),
      income: categories.find((c) => c.type === 'income' && /other/i.test(c.name)),
    };

    const errors = [];
    const docs = [];
    rows.forEach((r, index) => {
      const raw = r && typeof r === 'object' ? r : {};
      // Older clients sent signed amounts and "suggestedCategoryId".
      let amount = Number(raw.amount);
      let type = TRANSACTION_TYPES.includes(raw.type) ? raw.type : amount < 0 ? 'expense' : 'income';
      amount = Math.abs(amount);
      const categoryId = typeof raw.categoryId === 'string' ? raw.categoryId : typeof raw.suggestedCategoryId === 'string' ? raw.suggestedCategoryId : undefined;
      const description = typeof raw.description === 'string' ? raw.description.trim().slice(0, 300) : '';
      const invalid = validateTransactionFields({ type, amount, occurredAt: raw.occurredAt });
      if (invalid || !(amount > 0)) { errors.push({ row: index + 1, message: invalid || 'amount must be a positive number' }); return; }
      let cat = categoryId && catById.get(categoryId);
      if (cat && cat.type !== type) { errors.push({ row: index + 1, message: `"${cat.name}" is an ${cat.type} category` }); return; }
      if (!cat) cat = fallback[type];
      if (!cat) { errors.push({ row: index + 1, message: 'Choose a category' }); return; }
      docs.push({
        userId: req.user._id,
        categoryId: cat._id,
        type,
        amount: Math.round(amount * 100) / 100,
        description: description || (type === 'income' ? 'Imported income' : 'Imported expense'),
        occurredAt: new Date(raw.occurredAt),
        source: 'csv-import',
      });
    });

    let toInsert = docs;
    let duplicates = 0;
    if (skipDuplicates && docs.length) {
      const times = docs.map((d) => d.occurredAt.getTime());
      const existing = await Transaction.find({
        userId: req.user._id,
        occurredAt: { $gte: new Date(Math.min(...times) - 864e5), $lte: new Date(Math.max(...times) + 864e5) },
      }).select('type amount description occurredAt').lean();
      const key = (t) => `${t.type}|${t.amount}|${String(t.description || '').trim().toLowerCase()}|${new Date(t.occurredAt).toISOString().slice(0, 10)}`;
      const seen = new Set(existing.map(key));
      toInsert = docs.filter((d) => {
        const k = key(d);
        if (seen.has(k)) { duplicates += 1; return false; }
        seen.add(k);
        return true;
      });
    }

    const created = toInsert.length ? await Transaction.insertMany(toInsert) : [];
    await recordCreatedMany(req.user._id, created, 'import');

    await ImportBatch.create({
      user: req.user._id,
      filename: typeof req.body.fileName === 'string' ? req.body.fileName.slice(0, 200) : undefined,
      totalRows: rows.length,
      importedRows: created.length,
      failedRows: errors.length,
      duplicateRows: duplicates,
      status: created.length ? 'imported' : 'failed',
      errors: errors.slice(0, 100),
    }).catch(() => undefined);

    // Budget and monthly-limit alerts, once per affected month/category.
    const months = new Map();
    for (const t of created) {
      const m = t.occurredAt.toISOString().slice(0, 7);
      if (!months.has(m)) months.set(m, { at: t.occurredAt, cats: new Set() });
      if (t.type === 'expense') months.get(m).cats.add(String(t.categoryId));
    }
    for (const { at, cats } of months.values()) {
      for (const c of cats) await checkBudgetAfterTransaction(req.user._id, c, at);
      await checkMonthlyLimits(req.user._id, at);
    }

    res.status(201).json({
      data: created.map(formatTx),
      meta: { imported: created.length, duplicates, invalid: errors.length, errors: errors.slice(0, 20) },
    });
  } catch (err) {
    return serverError(res, err);
  }
});

module.exports = router;
