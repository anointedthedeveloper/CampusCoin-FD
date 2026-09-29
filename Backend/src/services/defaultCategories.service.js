const Category = require('../models/Category');

// The SRS default categories. These seed the admin-managed system templates
// (Category documents with userId: null) the first time they're needed;
// after that, whatever the admin keeps in Admin → Categories is the source of
// truth for every new student's starting categories.
const SRS_DEFAULT_CATEGORIES = [
  { name: 'Allowance', type: 'income', icon: 'wallet', color: '#8b5cf6' },
  { name: 'Part-time Job', type: 'income', icon: 'briefcase', color: '#3b82f6' },
  { name: 'Scholarship', type: 'income', icon: 'graduation-cap', color: '#16a34a' },
  { name: 'Gift', type: 'income', icon: 'gift', color: '#ec4899' },
  { name: 'Other Income', type: 'income', icon: 'more-horizontal', color: '#94a3b8' },
  { name: 'Food', type: 'expense', icon: 'utensils', color: '#ef4444' },
  { name: 'Transport', type: 'expense', icon: 'bus', color: '#3b82f6' },
  { name: 'Hostel/Rent', type: 'expense', icon: 'home', color: '#8b5cf6' },
  { name: 'Academics', type: 'expense', icon: 'book', color: '#6366f1' },
  { name: 'Subscriptions', type: 'expense', icon: 'repeat', color: '#14b8a6' },
  { name: 'Entertainment', type: 'expense', icon: 'film', color: '#ec4899' },
  { name: 'Miscellaneous', type: 'expense', icon: 'more-horizontal', color: '#94a3b8' },
];

let ensured = false;

/** Creates the system templates from the SRS list if none exist yet. */
async function ensureSystemTemplates() {
  if (ensured) return;
  const count = await Category.countDocuments({ userId: null });
  if (count === 0) {
    await Category.insertMany(
      SRS_DEFAULT_CATEGORIES.map((c) => ({ ...c, userId: null, isDefault: true })),
      { ordered: false },
    ).catch((err) => {
      // A concurrent request may have inserted them first (duplicate key).
      if (err.code !== 11000 && !err.writeErrors) throw err;
    });
  }
  ensured = true;
}

async function getSystemTemplates() {
  await ensureSystemTemplates();
  return Category.find({ userId: null, isDefault: true }).sort({ type: 1, name: 1 });
}

/** Gives a student personal copies of the current system templates. */
async function seedDefaultCategories(userId) {
  const templates = await getSystemTemplates();
  const source = templates.length ? templates : SRS_DEFAULT_CATEGORIES;
  await Category.insertMany(
    source.map((c) => ({ name: c.name, type: c.type, icon: c.icon, color: c.color, userId, isDefault: true })),
    { ordered: false },
  ).catch((err) => {
    if (err.code !== 11000 && !err.writeErrors) throw err;
  });
}

module.exports = { SRS_DEFAULT_CATEGORIES, ensureSystemTemplates, getSystemTemplates, seedDefaultCategories };
