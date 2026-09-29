const TransactionRevision = require('../models/TransactionRevision');

const FIELDS = ['type', 'amount', 'categoryId', 'description', 'merchant', 'occurredAt', 'source'];

/** The parts of a transaction worth remembering, as plain data. */
function snapshot(tx) {
  if (!tx) return null;
  const out = {};
  for (const f of FIELDS) {
    const v = tx[f];
    if (v === undefined || v === null) continue;
    out[f] = f === 'categoryId' ? String(v) : v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

/**
 * Records one change. Never throws — history must not block the change
 * itself — but failures are logged.
 */
async function recordRevision(userId, transactionId, action, { before = null, after = null, via = 'app' } = {}) {
  try {
    await TransactionRevision.create({ userId, transactionId, action, via, before: snapshot(before), after: snapshot(after) });
  } catch (err) {
    console.error('Recording transaction history failed:', err.message);
  }
}

/** Bulk "created" entries for imports. */
async function recordCreatedMany(userId, txs, via = 'import') {
  if (!txs.length) return;
  try {
    await TransactionRevision.insertMany(txs.map((tx) => ({ userId, transactionId: tx._id, action: 'created', via, after: snapshot(tx) })), { ordered: false });
  } catch (err) {
    console.error('Recording import history failed:', err.message);
  }
}

module.exports = { recordRevision, recordCreatedMany, snapshot };
