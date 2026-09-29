import { categoryBadgeStyle, resolveCategoryIcon } from '@/constants/categoryIcons';
import { cn } from '@/utils/cn';

interface Props {
  category: { name: string; icon?: string | null; color?: string | null; type?: 'income' | 'expense' };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 'h-7 w-7 rounded-lg', md: 'h-9 w-9 rounded-xl', lg: 'h-11 w-11 rounded-xl' };
const ICON_SIZES = { sm: 'h-3.5 w-3.5', md: 'h-4 w-4', lg: 'h-5 w-5' };

/** A category's icon in a badge tinted with the category's colour. */
export function CategoryIconBadge({ category, size = 'md', className }: Props) {
  const Icon = resolveCategoryIcon(category);
  return (
    <span className={cn('flex shrink-0 items-center justify-center', SIZES[size], className)} style={categoryBadgeStyle(category.color)} aria-hidden="true">
      <Icon className={ICON_SIZES[size]} />
    </span>
  );
}
