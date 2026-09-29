import {
  Apple,
  Award,
  Baby,
  Banknote,
  Beer,
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  Bus,
  Camera,
  Car,
  Church,
  Code,
  Coffee,
  Coins,
  CreditCard,
  CupSoda,
  Dog,
  Droplets,
  Dumbbell,
  Film,
  Fuel,
  Gamepad2,
  Gift,
  Globe,
  GraduationCap,
  HandCoins,
  Heart,
  HeartPulse,
  Home,
  Landmark,
  Laptop,
  MoreHorizontal,
  Music,
  Palette,
  PartyPopper,
  PenLine,
  PiggyBank,
  Pill,
  Pizza,
  Plane,
  Plus,
  Printer,
  Receipt,
  Repeat,
  Sandwich,
  Scissors,
  Shield,
  Shirt,
  ShoppingBag,
  ShoppingBasket,
  Smartphone,
  Soup,
  Sparkles,
  Stethoscope,
  Store,
  Tag,
  Ticket,
  TrainFront,
  TrendingUp,
  Truck,
  Tv,
  Users,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react';

/**
 * Every icon a category can use. The key is what's stored on the category
 * (`icon`); `words` drive the suggestions shown while typing a name.
 */
export const CATEGORY_ICON_SET: Record<string, { icon: LucideIcon; label: string; words: string[] }> = {
  utensils: { icon: Utensils, label: 'Food', words: ['food', 'meal', 'eat', 'canteen', 'restaurant', 'lunch', 'dinner', 'breakfast', 'buka', 'chop'] },
  soup: { icon: Soup, label: 'Soup / home meals', words: ['soup', 'cook', 'foodstuff', 'kitchen'] },
  sandwich: { icon: Sandwich, label: 'Snacks', words: ['snack', 'sandwich', 'bread', 'pastry', 'shawarma'] },
  pizza: { icon: Pizza, label: 'Takeaway', words: ['pizza', 'takeaway', 'take-out', 'delivery', 'fast food', 'chowdeck', 'glovo'] },
  coffee: { icon: Coffee, label: 'Coffee & drinks', words: ['coffee', 'tea', 'cafe', 'drink'] },
  'cup-soda': { icon: CupSoda, label: 'Soft drinks', words: ['soda', 'soft drink', 'juice', 'water'] },
  beer: { icon: Beer, label: 'Nightlife', words: ['beer', 'bar', 'club', 'nightlife', 'party drinks'] },
  apple: { icon: Apple, label: 'Groceries', words: ['fruit', 'grocer', 'market', 'provision'] },
  'shopping-basket': { icon: ShoppingBasket, label: 'Groceries', words: ['grocer', 'supermarket', 'provision', 'market', 'foodstuff'] },
  bus: { icon: Bus, label: 'Transport', words: ['transport', 'bus', 'fare', 'keke', 'okada', 'shuttle', 'brt', 'commute'] },
  car: { icon: Car, label: 'Ride / car', words: ['car', 'ride', 'uber', 'bolt', 'taxi', 'cab'] },
  bike: { icon: Bike, label: 'Bike', words: ['bike', 'bicycle', 'cycle'] },
  'train-front': { icon: TrainFront, label: 'Train', words: ['train', 'rail', 'metro'] },
  plane: { icon: Plane, label: 'Travel', words: ['travel', 'flight', 'trip', 'holiday', 'vacation'] },
  fuel: { icon: Fuel, label: 'Fuel', words: ['fuel', 'petrol', 'gas', 'diesel'] },
  home: { icon: Home, label: 'Rent / home', words: ['rent', 'hostel', 'home', 'house', 'room', 'lodge', 'apartment', 'accommodation'] },
  'building-2': { icon: Building2, label: 'Hostel', words: ['hostel', 'hall', 'dorm', 'residence'] },
  zap: { icon: Zap, label: 'Electricity', words: ['electric', 'power', 'light', 'nepa', 'prepaid', 'utility', 'utilities'] },
  droplets: { icon: Droplets, label: 'Water', words: ['water', 'laundry', 'wash'] },
  'book-open': { icon: BookOpen, label: 'Academics', words: ['academic', 'book', 'textbook', 'handout', 'study', 'course', 'library'] },
  'graduation-cap': { icon: GraduationCap, label: 'School / scholarship', words: ['school', 'tuition', 'fees', 'scholarship', 'bursary', 'education', 'exam'] },
  'pen-line': { icon: PenLine, label: 'Stationery', words: ['stationery', 'pen', 'notebook', 'supplies'] },
  printer: { icon: Printer, label: 'Printing', words: ['print', 'photocopy', 'binding', 'project'] },
  laptop: { icon: Laptop, label: 'Tech', words: ['laptop', 'computer', 'tech', 'gadget', 'software'] },
  repeat: { icon: Repeat, label: 'Subscriptions', words: ['subscription', 'recurring', 'membership', 'plan'] },
  tv: { icon: Tv, label: 'Streaming / TV', words: ['tv', 'netflix', 'showmax', 'dstv', 'gotv', 'streaming', 'prime'] },
  music: { icon: Music, label: 'Music', words: ['music', 'spotify', 'apple music', 'audiomack', 'boomplay'] },
  smartphone: { icon: Smartphone, label: 'Airtime / phone', words: ['airtime', 'phone', 'recharge', 'mtn', 'glo', 'airtel', '9mobile'] },
  wifi: { icon: Wifi, label: 'Data / internet', words: ['data', 'internet', 'wifi', 'broadband'] },
  film: { icon: Film, label: 'Movies', words: ['movie', 'cinema', 'film', 'entertainment'] },
  'gamepad-2': { icon: Gamepad2, label: 'Games', words: ['game', 'gaming', 'playstation', 'xbox', 'fun'] },
  'party-popper': { icon: PartyPopper, label: 'Outings & parties', words: ['party', 'outing', 'hangout', 'birthday', 'event', 'celebration', 'fun', 'entertainment'] },
  ticket: { icon: Ticket, label: 'Events', words: ['ticket', 'concert', 'show', 'event'] },
  'shopping-bag': { icon: ShoppingBag, label: 'Shopping', words: ['shopping', 'shop', 'jumia', 'konga', 'purchase', 'buy'] },
  shirt: { icon: Shirt, label: 'Clothing', words: ['cloth', 'clothing', 'fashion', 'shoe', 'wear', 'outfit'] },
  scissors: { icon: Scissors, label: 'Hair & grooming', words: ['hair', 'salon', 'barber', 'grooming', 'nails', 'beauty'] },
  sparkles: { icon: Sparkles, label: 'Personal care', words: ['personal', 'care', 'cosmetic', 'skincare', 'toiletries', 'beauty'] },
  'heart-pulse': { icon: HeartPulse, label: 'Health', words: ['health', 'hospital', 'clinic', 'medical'] },
  pill: { icon: Pill, label: 'Medicine', words: ['drug', 'medicine', 'pharmacy', 'pills'] },
  stethoscope: { icon: Stethoscope, label: 'Doctor', words: ['doctor', 'checkup', 'dental', 'eye'] },
  dumbbell: { icon: Dumbbell, label: 'Fitness', words: ['gym', 'fitness', 'sport', 'workout', 'football'] },
  users: { icon: Users, label: 'Family & friends', words: ['family', 'friends', 'sibling', 'dues', 'contribution', 'association'] },
  baby: { icon: Baby, label: 'Kids', words: ['baby', 'kid', 'child'] },
  dog: { icon: Dog, label: 'Pets', words: ['pet', 'dog', 'cat'] },
  church: { icon: Church, label: 'Religious giving', words: ['church', 'tithe', 'offering', 'mosque', 'zakat', 'charity', 'donation'] },
  heart: { icon: Heart, label: 'Charity', words: ['charity', 'donation', 'giving', 'love'] },
  gift: { icon: Gift, label: 'Gifts', words: ['gift', 'present', 'birthday'] },
  wallet: { icon: Wallet, label: 'Allowance', words: ['allowance', 'upkeep', 'pocket', 'stipend', 'wallet', 'feeding'] },
  briefcase: { icon: Briefcase, label: 'Job', words: ['job', 'work', 'part-time', 'part time', 'salary', 'internship', 'wage'] },
  code: { icon: Code, label: 'Freelance', words: ['freelance', 'gig', 'client', 'contract', 'coding', 'design'] },
  palette: { icon: Palette, label: 'Creative work', words: ['creative', 'art', 'design', 'content'] },
  camera: { icon: Camera, label: 'Photography', words: ['photo', 'camera', 'video'] },
  wrench: { icon: Wrench, label: 'Repairs', words: ['repair', 'fix', 'maintenance', 'service'] },
  truck: { icon: Truck, label: 'Delivery', words: ['delivery', 'logistics', 'shipping', 'dispatch'] },
  store: { icon: Store, label: 'Small business', words: ['business', 'sales', 'store', 'side hustle', 'hustle', 'resell'] },
  'hand-coins': { icon: HandCoins, label: 'Income', words: ['income', 'earning', 'received', 'refund', 'payment'] },
  banknote: { icon: Banknote, label: 'Cash', words: ['cash', 'money', 'transfer'] },
  coins: { icon: Coins, label: 'Savings', words: ['saving', 'coins', 'thrift', 'ajo', 'esusu'] },
  'piggy-bank': { icon: PiggyBank, label: 'Savings', words: ['saving', 'savings', 'piggy', 'emergency'] },
  'trending-up': { icon: TrendingUp, label: 'Investments', words: ['invest', 'investment', 'stock', 'crypto', 'interest', 'dividend'] },
  landmark: { icon: Landmark, label: 'Bank & fees', words: ['bank', 'charges', 'fee', 'levy', 'loan'] },
  'credit-card': { icon: CreditCard, label: 'Card / loans', words: ['card', 'credit', 'loan', 'debt', 'repayment'] },
  receipt: { icon: Receipt, label: 'Bills', words: ['bill', 'bills', 'invoice', 'receipt', 'tax'] },
  award: { icon: Award, label: 'Prizes & awards', words: ['award', 'prize', 'grant', 'bonus', 'competition'] },
  shield: { icon: Shield, label: 'Insurance', words: ['insurance', 'cover', 'protection'] },
  globe: { icon: Globe, label: 'Online', words: ['online', 'web', 'domain', 'hosting'] },
  tag: { icon: Tag, label: 'General', words: ['general', 'tag', 'label'] },
  'more-horizontal': { icon: MoreHorizontal, label: 'Other', words: ['other', 'misc', 'miscellaneous', 'others'] },
  plus: { icon: Plus, label: 'Other income', words: ['other income', 'extra'] },
};

export type CategoryIconSlug = keyof typeof CATEGORY_ICON_SET;

/** Icon slugs ranked by how well they fit a category name. */
export function suggestIcons(name: string, type?: 'income' | 'expense', limit = 6): string[] {
  const text = name.trim().toLowerCase();
  if (!text) return type === 'income' ? ['wallet', 'briefcase', 'hand-coins', 'gift', 'award', 'code'] : ['utensils', 'bus', 'home', 'book-open', 'repeat', 'party-popper'];
  const tokens = text.split(/[\s/&,+-]+/).filter(Boolean);
  const scored = Object.entries(CATEGORY_ICON_SET).map(([slug, def]) => {
    let score = 0;
    for (const w of def.words) {
      if (text === w) score += 12;
      // A whole word counts more than a fragment, and the first word most
      // ("Gym membership" is about the gym, not a subscription).
      else if (tokens.includes(w)) score += tokens[0] === w ? 9 : 7;
      else if (text.includes(w)) score += 5;
      else if (tokens.some((t) => t.length > 2 && w.startsWith(t))) score += 3;
    }
    if (def.label.toLowerCase().includes(text)) score += 4;
    if (type === 'income' && ['wallet', 'briefcase', 'hand-coins', 'code', 'award', 'store', 'trending-up', 'gift', 'graduation-cap', 'plus'].includes(slug)) score += 0.5;
    return { slug, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.slug);
}

/** The icon for a category: its chosen icon, else the best guess from its name. */
const ICON_ALIASES: Record<string, string> = { book: 'book-open', 'gamepad': 'gamepad-2', train: 'train-front', building: 'building-2' };

export function resolveCategoryIcon(category: { name: string; icon?: string | null; type?: 'income' | 'expense' }): LucideIcon {
  const slug = category.icon ? ICON_ALIASES[category.icon] ?? category.icon : null;
  if (slug && CATEGORY_ICON_SET[slug]) return CATEGORY_ICON_SET[slug].icon;
  const guess = suggestIcons(category.name, category.type, 1)[0];
  if (guess) return CATEGORY_ICON_SET[guess].icon;
  return category.type === 'income' ? HandCoins : MoreHorizontal;
}

const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Background/foreground style for a category badge from its colour. */
export function categoryBadgeStyle(color?: string | null): React.CSSProperties {
  const c = color && HEX_RE.test(color) ? color : '#1c8f53';
  return { backgroundColor: `${c}1f`, color: c };
}

export interface CategoryIcon {
  icon: LucideIcon;
  badgeClassName: string;
}

// Legacy name → look maps, still used for a few quick-pick buttons.
export const INCOME_CATEGORY_ICONS: Record<string, CategoryIcon> = {
  Allowance: { icon: Wallet, badgeClassName: 'bg-purple-100 text-purple-600' },
  'Part-time Job': { icon: Briefcase, badgeClassName: 'bg-blue-100 text-blue-600' },
  Scholarship: { icon: GraduationCap, badgeClassName: 'bg-brand-100 text-brand-700' },
  Gift: { icon: Gift, badgeClassName: 'bg-pink-100 text-pink-600' },
  'Other Income': { icon: HandCoins, badgeClassName: 'bg-gray-100 text-gray-600' },
};

export const EXPENSE_CATEGORY_ICONS: Record<string, CategoryIcon> = {
  Food: { icon: Utensils, badgeClassName: 'bg-red-100 text-red-600' },
  Transport: { icon: Bus, badgeClassName: 'bg-blue-100 text-blue-600' },
  'Hostel/Rent': { icon: Home, badgeClassName: 'bg-purple-100 text-purple-600' },
  Academics: { icon: BookOpen, badgeClassName: 'bg-indigo-100 text-indigo-600' },
  Entertainment: { icon: Film, badgeClassName: 'bg-pink-100 text-pink-600' },
  Subscriptions: { icon: Repeat, badgeClassName: 'bg-teal-100 text-teal-600' },
  Miscellaneous: { icon: MoreHorizontal, badgeClassName: 'bg-gray-100 text-gray-600' },
};

export const DEFAULT_CATEGORY_ICON: CategoryIcon = {
  icon: MoreHorizontal,
  badgeClassName: 'bg-gray-100 text-gray-600',
};
