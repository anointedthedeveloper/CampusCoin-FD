import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
  GraduationCap,
  Heart,
  Home,
  Laptop,
  PiggyBank,
  Plane,
  Plus,
  Shield,
  Star,
  Target,
  Trash2,
  TrendingUp,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Card } from '@/components/common';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import {
  computeProjection,
  getNewMilestone,
  savingsGoalsService,
} from '@/services/savingsGoals.service';
import type { GoalColor, GoalIcon, SavingsGoal } from '@/types/savingsGoal';

// ─── Constants ────────────────────────────────────────────────────────────────

const COLORS: { key: GoalColor; label: string; bar: string; badge: string; ring: string }[] = [
  { key: 'teal',   label: 'Teal',   bar: 'bg-teal-500',   badge: 'bg-teal-100 text-teal-700 dark:bg-teal-400/15 dark:text-teal-400',   ring: 'ring-teal-400'   },
  { key: 'brand',  label: 'Green',  bar: 'bg-brand-500',  badge: 'bg-brand-100 text-brand-700 dark:bg-brand-400/15 dark:text-brand-400', ring: 'ring-brand-400'  },
  { key: 'purple', label: 'Purple', bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-400/15 dark:text-purple-400', ring: 'ring-purple-400' },
  { key: 'amber',  label: 'Amber',  bar: 'bg-amber-500',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-400',   ring: 'ring-amber-400'  },
  { key: 'rose',   label: 'Rose',   bar: 'bg-rose-500',   badge: 'bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-400',       ring: 'ring-rose-400'   },
  { key: 'blue',   label: 'Blue',   bar: 'bg-blue-500',   badge: 'bg-blue-100 text-blue-700 dark:bg-blue-400/15 dark:text-blue-400',       ring: 'ring-blue-400'   },
  { key: 'orange', label: 'Orange', bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-400', ring: 'ring-orange-400' },
  { key: 'indigo', label: 'Indigo', bar: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-400', ring: 'ring-indigo-400' },
];

const ICONS: { key: GoalIcon; Icon: LucideIcon; label: string }[] = [
  { key: 'piggy-bank',     Icon: PiggyBank,      label: 'Savings'    },
  { key: 'home',           Icon: Home,           label: 'Home'       },
  { key: 'plane',          Icon: Plane,          label: 'Travel'     },
  { key: 'car',            Icon: Car,            label: 'Vehicle'    },
  { key: 'graduation-cap', Icon: GraduationCap,  label: 'Education'  },
  { key: 'laptop',         Icon: Laptop,         label: 'Tech'       },
  { key: 'heart',          Icon: Heart,          label: 'Health'     },
  { key: 'star',           Icon: Star,           label: 'Dream'      },
  { key: 'shield',         Icon: Shield,         label: 'Emergency'  },
  { key: 'zap',            Icon: Zap,            label: 'Quick'      },
];

const MILESTONE_MESSAGES: Record<number, { emoji: string; text: string }> = {
  25:  { emoji: '🌱', text: "You're a quarter of the way there — great start!" },
  50:  { emoji: '🎯', text: "Halfway! You're absolutely crushing it."           },
  75:  { emoji: '🚀', text: "75% done — the finish line is in sight!"           },
  100: { emoji: '🎉', text: "Goal complete! You did it — incredible work!"      },
};

const MILESTONE_BADGES: Record<number, string> = {
  25:  '🌱 Seedling',
  50:  '⭐ Halfway Hero',
  75:  '🚀 Almost There',
  100: '🏆 Goal Crusher',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtDecimal(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

function getColorConfig(key: GoalColor) {
  return COLORS.find((c) => c.key === key) ?? COLORS[0];
}

function getIconConfig(key: GoalIcon) {
  return ICONS.find((i) => i.key === key) ?? ICONS[0];
}

// ─── Confetti burst component ─────────────────────────────────────────────────

const CONFETTI_COLORS = ['#22d3ee', '#a855f7', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6'];

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const particles = Array.from({ length: 56 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * -60 - 20,
    rot: Math.random() * 360,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + Math.random() * 8,
    delay: Math.random() * 0.4,
  }));

  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: `${p.x}vw`, y: '50vh', opacity: 1, rotate: p.rot, scale: 1 }}
          animate={{ y: `${p.y}vh`, opacity: 0, rotate: p.rot + 720, scale: 0.3 }}
          transition={{ duration: 2.4 + Math.random() * 0.6, delay: p.delay, ease: 'easeOut' }}
          style={{ position: 'absolute', width: p.size, height: p.size, borderRadius: 2, background: p.color }}
        />
      ))}
    </div>
  );
}

// ─── Milestone toast ──────────────────────────────────────────────────────────

function MilestoneToast({
  milestone,
  goalName,
  onClose,
}: {
  milestone: number;
  goalName: string;
  onClose: () => void;
}) {
  const msg = MILESTONE_MESSAGES[milestone];
  const badge = MILESTONE_BADGES[milestone];

  useEffect(() => {
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 80, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 260, damping: 20 }}
      className="fixed bottom-6 left-1/2 z-[90] w-[min(22rem,90vw)] -translate-x-1/2"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-200 dark:bg-surface-elevated dark:ring-white/10 p-5">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-md p-1 text-gray-400 hover:text-gray-600 dark:hover:text-text-primary"
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="text-3xl mb-2">{msg.emoji}</div>
        <p className="font-bold text-gray-900 dark:text-text-primary text-sm">
          {milestone === 100 ? 'Goal Complete!' : `${milestone}% Milestone!`}
        </p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-text-secondary">{goalName}</p>
        <p className="mt-1.5 text-sm text-gray-700 dark:text-text-primary leading-snug">{msg.text}</p>
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-400/20">
          {badge}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Goal Form Modal ──────────────────────────────────────────────────────────

type FormMode = 'create' | 'edit';

interface GoalFormProps {
  mode: FormMode;
  initial?: SavingsGoal;
  onSubmit: (data: Omit<SavingsGoal, 'id' | 'createdAt' | 'celebratedMilestones'>) => void;
  onClose: () => void;
}

const EMPTY_FORM = {
  name: '',
  description: '',
  targetAmount: '',
  savedAmount: '',
  targetDate: '',
  color: 'teal' as GoalColor,
  icon: 'piggy-bank' as GoalIcon,
};

function GoalFormModal({ mode, initial, onSubmit, onClose }: GoalFormProps) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name,
          description: initial.description ?? '',
          targetAmount: String(initial.targetAmount),
          savedAmount: String(initial.savedAmount),
          targetDate: initial.targetDate ? initial.targetDate.slice(0, 10) : '',
          color: initial.color,
          icon: initial.icon,
        }
      : { ...EMPTY_FORM },
  );
  const [errors, setErrors] = useState<Partial<Record<keyof typeof EMPTY_FORM, string>>>({});

  function validate() {
    const e: typeof errors = {};
    if (!form.name.trim()) e.name = 'Name is required';
    const target = parseFloat(form.targetAmount);
    if (!form.targetAmount || isNaN(target) || target <= 0) e.targetAmount = 'Enter a valid target amount';
    const saved = parseFloat(form.savedAmount);
    if (form.savedAmount !== '' && (isNaN(saved) || saved < 0)) e.savedAmount = 'Enter a valid amount';
    if (!isNaN(target) && !isNaN(saved) && saved > target) e.savedAmount = "Can't exceed target";
    if (form.targetDate) {
      const d = new Date(form.targetDate);
      if (isNaN(d.getTime())) e.targetDate = 'Invalid date';
      else if (mode === 'create' && d < new Date()) e.targetDate = 'Date must be in the future';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      targetAmount: parseFloat(form.targetAmount),
      savedAmount: parseFloat(form.savedAmount) || 0,
      targetDate: form.targetDate || undefined,
      color: form.color,
      icon: form.icon,
    });
  }

  const selectedColor = getColorConfig(form.color);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-surface-elevated shadow-2xl ring-1 ring-gray-200 dark:ring-white/10"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/[0.06]">
          <h2 className="text-base font-bold text-gray-900 dark:text-text-primary">
            {mode === 'create' ? 'Create New Goal' : 'Edit Goal'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.08] dark:hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5" noValidate>
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-text-secondary mb-1.5">
              Goal name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Emergency Fund, Laptop, Trip to Japan…"
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 dark:text-text-primary bg-white dark:bg-surface placeholder:text-gray-400 dark:placeholder:text-text-muted',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-primary transition-shadow',
                errors.name ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-white/[0.08]',
              )}
            />
            {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-text-secondary mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="A short note about this goal"
              className="w-full rounded-lg border border-gray-200 dark:border-white/[0.08] px-3 py-2 text-sm text-gray-900 dark:text-text-primary bg-white dark:bg-surface placeholder:text-gray-400 dark:placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-primary transition-shadow"
            />
          </div>

          {/* Amounts row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-text-secondary mb-1.5">
                Target amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.targetAmount}
                  onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))}
                  placeholder="0.00"
                  className={cn(
                    'w-full rounded-lg border pl-7 pr-3 py-2 text-sm text-gray-900 dark:text-text-primary bg-white dark:bg-surface placeholder:text-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-primary transition-shadow',
                    errors.targetAmount ? 'border-red-400' : 'border-gray-200 dark:border-white/[0.08]',
                  )}
                />
              </div>
              {errors.targetAmount && <p className="mt-1 text-xs text-red-500">{errors.targetAmount}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-text-secondary mb-1.5">
                Already saved
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.savedAmount}
                  onChange={(e) => setForm((f) => ({ ...f, savedAmount: e.target.value }))}
                  placeholder="0.00"
                  className={cn(
                    'w-full rounded-lg border pl-7 pr-3 py-2 text-sm text-gray-900 dark:text-text-primary bg-white dark:bg-surface placeholder:text-gray-400',
                    'focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-primary transition-shadow',
                    errors.savedAmount ? 'border-red-400' : 'border-gray-200 dark:border-white/[0.08]',
                  )}
                />
              </div>
              {errors.savedAmount && <p className="mt-1 text-xs text-red-500">{errors.savedAmount}</p>}
            </div>
          </div>

          {/* Target date */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-text-secondary mb-1.5">
              Target date <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={form.targetDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm text-gray-900 dark:text-text-primary bg-white dark:bg-surface',
                'focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-primary transition-shadow',
                errors.targetDate ? 'border-red-400' : 'border-gray-200 dark:border-white/[0.08]',
              )}
            />
            {errors.targetDate && <p className="mt-1 text-xs text-red-500">{errors.targetDate}</p>}
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-text-secondary mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(({ key, Icon, label }) => (
                <button
                  key={key}
                  type="button"
                  title={label}
                  onClick={() => setForm((f) => ({ ...f, icon: key }))}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border-2 transition-all',
                    form.icon === key
                      ? `border-transparent ring-2 ${selectedColor.ring} ${selectedColor.badge}`
                      : 'border-gray-100 dark:border-white/[0.06] text-gray-400 hover:border-gray-200 dark:hover:border-white/10',
                  )}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-text-secondary mb-2">Colour</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  onClick={() => setForm((f) => ({ ...f, color: c.key }))}
                  className={cn(
                    'h-7 w-7 rounded-full transition-all border-2',
                    c.bar,
                    form.color === c.key ? 'border-gray-800 dark:border-white scale-110' : 'border-transparent',
                  )}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-text-secondary dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 dark:bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700 dark:hover:bg-primary-accent transition-colors shadow-sm"
            >
              {mode === 'create' ? 'Create Goal' : 'Save Changes'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Adjust Amount Modal ───────────────────────────────────────────────────────

function AdjustModal({
  goal,
  onConfirm,
  onClose,
}: {
  goal: SavingsGoal;
  onConfirm: (delta: number) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) { setError('Enter a valid amount'); return; }
    if (mode === 'withdraw' && val > goal.savedAmount) { setError("Can't withdraw more than saved"); return; }
    onConfirm(mode === 'deposit' ? val : -val);
  }

  const remaining = Math.max(0, goal.targetAmount - goal.savedAmount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-surface-elevated shadow-2xl ring-1 ring-gray-200 dark:ring-white/10 p-6"
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-text-primary">
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-base font-bold text-gray-900 dark:text-text-primary mb-1">{goal.name}</h2>
        <p className="text-xs text-gray-500 dark:text-text-secondary mb-4">
          {fmt(goal.savedAmount)} saved · {fmt(remaining)} remaining
        </p>

        {/* Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-white/[0.08] mb-4">
          {(['deposit', 'withdraw'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); setError(''); }}
              className={cn(
                'flex-1 py-2 text-sm font-semibold capitalize transition-colors',
                mode === m
                  ? 'bg-brand-600 dark:bg-primary text-white'
                  : 'text-gray-500 dark:text-text-secondary hover:bg-gray-50 dark:hover:bg-white/[0.04]',
              )}
            >
              {m === 'deposit' ? '+ Deposit' : '− Withdraw'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setError(''); }}
                placeholder="0.00"
                autoFocus
                className={cn(
                  'w-full rounded-lg border pl-7 pr-3 py-2.5 text-sm bg-white dark:bg-surface text-gray-900 dark:text-text-primary placeholder:text-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-primary',
                  error ? 'border-red-400' : 'border-gray-200 dark:border-white/[0.08]',
                )}
              />
            </div>
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
            {mode === 'deposit' && remaining > 0 && !error && (
              <button
                type="button"
                onClick={() => setAmount(String(remaining))}
                className="mt-1.5 text-xs font-semibold text-brand-600 dark:text-primary-accent hover:underline"
              >
                Fill to goal ({fmt(remaining)})
              </button>
            )}
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-600 dark:bg-primary py-2.5 text-sm font-bold text-white hover:bg-brand-700 dark:hover:bg-primary-accent transition-colors"
          >
            Confirm
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Single Goal Card ─────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onAdjust,
}: {
  goal: SavingsGoal;
  onEdit: (g: SavingsGoal) => void;
  onDelete: (id: string) => void;
  onAdjust: (g: SavingsGoal) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const proj = computeProjection(goal);
  const colorCfg = getColorConfig(goal.color);
  const iconCfg = getIconConfig(goal.icon);
  const GoalIcon = iconCfg.Icon;

  return (
    <Card className="flex flex-col gap-0 p-0 overflow-hidden">
      {/* Top colour strip */}
      <div className={cn('h-1.5 w-full', colorCfg.bar)} />

      <div className="p-5 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', colorCfg.badge)}>
            <GoalIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-gray-900 dark:text-text-primary leading-snug truncate">{goal.name}</p>
            {goal.description && (
              <p className="text-xs text-gray-500 dark:text-text-secondary mt-0.5 truncate">{goal.description}</p>
            )}
          </div>
          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit(goal)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.08] dark:hover:text-text-primary transition-colors"
              aria-label="Edit goal"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(goal.id)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition-colors"
              aria-label="Delete goal"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5 gap-2">
            <span className="text-lg font-bold text-gray-900 dark:text-text-primary">
              {fmt(goal.savedAmount)}
              <span className="ml-1 text-xs font-normal text-gray-400 dark:text-text-muted">/ {fmt(goal.targetAmount)}</span>
            </span>
            <span className={cn(
              'text-sm font-bold tabular-nums',
              proj.isComplete ? 'text-emerald-600 dark:text-emerald-400' : colorCfg.badge.split(' ')[1],
            )}>
              {proj.pct}%
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/[0.08]">
            <motion.div
              className={cn('h-full rounded-full', colorCfg.bar)}
              initial={{ width: 0 }}
              animate={{ width: `${proj.pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          {/* Milestone pips */}
          <div className="relative mt-1 flex justify-between px-0">
            {[25, 50, 75, 100].map((m) => {
              const hit = proj.pct >= m;
              const celebrated = goal.celebratedMilestones?.includes(m);
              return (
                <div key={m} className="flex flex-col items-center gap-0.5">
                  <div className={cn(
                    'h-2 w-2 rounded-full transition-all duration-500',
                    hit ? colorCfg.bar : 'bg-gray-200 dark:bg-white/[0.08]',
                    celebrated && hit && 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-surface-elevated ring-amber-400',
                  )} />
                  <span className="text-[9px] text-gray-400 tabular-nums">{m}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complete badge */}
        {proj.isComplete && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-400/10 px-3 py-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              🏆 Goal achieved! {MILESTONE_BADGES[100]}
            </span>
          </div>
        )}

        {/* Countdown */}
        {proj.daysRemaining !== null && !proj.isComplete && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 dark:bg-white/[0.04] px-3 py-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-gray-400" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-600 dark:text-text-secondary">
                {proj.daysRemaining === 0
                  ? 'Deadline today!'
                  : `${proj.daysRemaining} day${proj.daysRemaining !== 1 ? 's' : ''} remaining`}
              </span>
              {goal.targetDate && (
                <span className="ml-1.5 text-xs text-gray-400">
                  · {new Date(goal.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
            </div>
            {proj.isOnTrack !== null && (
              <span className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold',
                proj.isOnTrack
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-400'
                  : 'bg-red-100 text-red-600 dark:bg-red-400/10 dark:text-red-400',
              )}>
                {proj.isOnTrack ? '✓ On track' : '⚠ Behind'}
              </span>
            )}
          </div>
        )}

        {/* Deposit / Withdraw */}
        <button
          type="button"
          onClick={() => onAdjust(goal)}
          className={cn(
            'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all',
            proj.isComplete
              ? 'bg-gray-100 text-gray-500 dark:bg-white/[0.06] dark:text-text-secondary'
              : `${colorCfg.badge} hover:opacity-80`,
          )}
          disabled={proj.isComplete}
        >
          <Plus className="h-4 w-4" /> Add Money
        </button>

        {/* Expandable projections */}
        {!proj.isComplete && proj.dailyRequired !== null && (
          <>
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-between text-xs font-semibold text-gray-500 dark:text-text-secondary hover:text-gray-700 dark:hover:text-text-primary transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                How much do I need to save?
              </span>
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {[
                      { label: 'Daily',   value: proj.dailyRequired   },
                      { label: 'Weekly',  value: proj.weeklyRequired  },
                      { label: 'Monthly', value: proj.monthlyRequired },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex flex-col items-center rounded-xl bg-gray-50 dark:bg-white/[0.04] px-2 py-2.5 gap-0.5"
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-text-primary">
                          {fmtDecimal(value ?? 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] text-gray-400 dark:text-text-muted leading-relaxed">
                    Save <strong className="text-gray-600 dark:text-text-secondary">{fmtDecimal(proj.dailyRequired ?? 0)}</strong> every day to reach your goal on time.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </Card>
  );
}

// ─── Overview stat card ────────────────────────────────────────────────────────

function OverviewStat({
  label,
  value,
  sub,
  icon: Icon,
  iconCls,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  iconCls: string;
}) {
  return (
    <Card className="flex items-center gap-4">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconCls)}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-gray-500 dark:text-text-secondary uppercase tracking-wide">{label}</p>
        <p className="mt-0.5 text-xl font-bold text-gray-900 dark:text-text-primary">{value}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-text-muted mt-0.5">{sub}</p>}
      </div>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SavingsGoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [modalMode, setModalMode] = useState<FormMode | null>(null);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | undefined>();
  const [adjustGoal, setAdjustGoal] = useState<SavingsGoal | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [confetti, setConfetti] = useState(false);
  const [toast, setToast] = useState<{ milestone: number; goalName: string } | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    setGoals(savingsGoalsService.list(user.id));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Check for newly hit milestones after goals update
  useEffect(() => {
    if (!user) return;
    for (const goal of goals) {
      const milestone = getNewMilestone(goal);
      if (milestone !== null) {
        savingsGoalsService.markMilestoneCelebrated(goal.id, milestone);
        setGoals((prev) =>
          prev.map((g) =>
            g.id === goal.id
              ? { ...g, celebratedMilestones: [...(g.celebratedMilestones ?? []), milestone] }
              : g,
          ),
        );
        setToast({ milestone, goalName: goal.name });
        setConfetti(true);
        break; // celebrate one at a time
      }
    }
  }, [goals, user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalSaved    = goals.reduce((s, g) => s + g.savedAmount, 0);
  const totalTarget   = goals.reduce((s, g) => s + g.targetAmount, 0);
  const completedCount = goals.filter((g) => computeProjection(g).isComplete).length;
  const avgRate = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleCreate(data: Omit<SavingsGoal, 'id' | 'createdAt' | 'celebratedMilestones'>) {
    if (!user) return;
    savingsGoalsService.create(user.id, data);
    setModalMode(null);
    load();
  }

  function handleEdit(data: Omit<SavingsGoal, 'id' | 'createdAt' | 'celebratedMilestones'>) {
    if (!editingGoal) return;
    savingsGoalsService.update(editingGoal.id, data);
    setModalMode(null);
    setEditingGoal(undefined);
    load();
  }

  function handleDeleteConfirmed() {
    if (!deleteConfirm) return;
    savingsGoalsService.delete(deleteConfirm);
    setDeleteConfirm(null);
    load();
  }

  function handleAdjust(delta: number) {
    if (!adjustGoal) return;
    savingsGoalsService.adjustAmount(adjustGoal.id, delta);
    setAdjustGoal(undefined);
    load();
  }

  return (
    <div className="space-y-6">
      {/* Confetti */}
      <AnimatePresence>
        {confetti && <ConfettiBurst onDone={() => setConfetti(false)} />}
      </AnimatePresence>

      {/* Milestone toast */}
      <AnimatePresence>
        {toast && (
          <MilestoneToast
            milestone={toast.milestone}
            goalName={toast.goalName}
            onClose={() => setToast(null)}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {modalMode === 'create' && (
          <GoalFormModal mode="create" onSubmit={handleCreate} onClose={() => setModalMode(null)} />
        )}
        {modalMode === 'edit' && editingGoal && (
          <GoalFormModal mode="edit" initial={editingGoal} onSubmit={handleEdit} onClose={() => { setModalMode(null); setEditingGoal(undefined); }} />
        )}
        {adjustGoal && (
          <AdjustModal goal={adjustGoal} onConfirm={handleAdjust} onClose={() => setAdjustGoal(undefined)} />
        )}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setDeleteConfirm(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-surface-elevated shadow-2xl ring-1 ring-gray-200 dark:ring-white/10 p-6"
            >
              <h3 className="text-base font-bold text-gray-900 dark:text-text-primary mb-1">Delete this goal?</h3>
              <p className="text-sm text-gray-500 dark:text-text-secondary mb-5">This can't be undone. All progress will be lost.</p>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:text-text-secondary dark:hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirmed}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-primary">Savings Goals</h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-text-secondary">
            Track every goal, from emergency funds to dream trips.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalMode('create')}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-600 dark:bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 dark:hover:bg-primary-accent transition-all hover:-translate-y-px"
        >
          <Plus className="h-4 w-4" /> New Goal
        </button>
      </div>

      {/* Overview stats */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <OverviewStat
            label="Total Saved"
            value={fmt(totalSaved)}
            sub={`of ${fmt(totalTarget)} target`}
            icon={PiggyBank}
            iconCls="bg-teal-100 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400"
          />
          <OverviewStat
            label="Avg. Savings Rate"
            value={`${avgRate}%`}
            sub="across all goals"
            icon={TrendingUp}
            iconCls="bg-brand-100 text-brand-700 dark:bg-brand-400/15 dark:text-brand-400"
          />
          <OverviewStat
            label="Goals Completed"
            value={`${completedCount} / ${goals.length}`}
            icon={CheckCircle2}
            iconCls="bg-emerald-100 text-emerald-600 dark:bg-emerald-400/15 dark:text-emerald-400"
          />
          <OverviewStat
            label="Remaining to Save"
            value={fmt(Math.max(0, totalTarget - totalSaved))}
            icon={Target}
            iconCls="bg-purple-100 text-purple-600 dark:bg-purple-400/15 dark:text-purple-400"
          />
        </div>
      )}

      {/* Goal cards grid */}
      {goals.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-100 text-teal-600 dark:bg-teal-400/15 dark:text-teal-400">
            <PiggyBank className="h-8 w-8" />
          </span>
          <div>
            <p className="text-base font-bold text-gray-900 dark:text-text-primary">No savings goals yet</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-text-secondary max-w-xs">
              Create your first goal — whether it's an emergency fund, a vacation, or a new laptop.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModalMode('create')}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 dark:bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 dark:hover:bg-primary-accent transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create First Goal
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {goals.map((goal) => (
              <motion.div
                key={goal.id}
                layout
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <GoalCard
                  goal={goal}
                  onEdit={(g) => { setEditingGoal(g); setModalMode('edit'); }}
                  onDelete={(id) => setDeleteConfirm(id)}
                  onAdjust={(g) => setAdjustGoal(g)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* "Add another" ghost card */}
          <motion.button
            type="button"
            layout
            onClick={() => setModalMode('create')}
            className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/[0.08] p-8 text-gray-400 transition-all hover:border-brand-400 hover:text-brand-500 dark:hover:border-primary dark:hover:text-primary-accent"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-dashed border-current transition-colors">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold">Add Goal</span>
          </motion.button>
        </div>
      )}

      {/* Earned badges shelf */}
      {goals.some((g) => (g.celebratedMilestones?.length ?? 0) > 0) && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <Star className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold text-gray-900 dark:text-text-primary">Earned Badges</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {goals.flatMap((g) =>
              (g.celebratedMilestones ?? []).map((m) => (
                <span
                  key={`${g.id}-${m}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-400/20"
                  title={g.name}
                >
                  {MILESTONE_BADGES[m]}
                  <span className="font-normal text-amber-500 dark:text-amber-500/70">· {g.name}</span>
                </span>
              )),
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
