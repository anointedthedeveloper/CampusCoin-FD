import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Pencil, Receipt, Store, Tag, Trash2 } from 'lucide-react';
import { Button, Card, EmptyState, Spinner } from '@/components/common';
import { STUDENT_ROUTES, buildPath } from '@/constants/routes';
import { categoryService, transactionService } from '@/services';
import { useAuth } from '@/hooks/useAuth';
import { DEFAULT_CURRENCY } from '@/constants/config';
import { formatCurrency, formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { Transaction } from '@/types/transaction';

export function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [transaction, setTransaction] = useState<Transaction | undefined>(undefined);
  const [categoryName, setCategoryName] = useState('Other');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user || !id) return;
    let cancelled = false;
    async function load() {
      const tx = await transactionService.getById(user!.id, id!);
      if (cancelled) return;
      setTransaction(tx);
      if (tx) {
        const cat = await categoryService.getById(user!.id, tx.categoryId);
        if (!cancelled) setCategoryName(cat?.name ?? 'Other');
      }
      setIsLoading(false);
    }
    void load();
    return () => { cancelled = true; };
  }, [user?.id, id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner /></div>;

  if (!user || !transaction) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={Receipt}
          title="Transaction not found"
          description="This transaction may have been deleted."
          action={<Link to={STUDENT_ROUTES.transactions} className="text-sm font-semibold text-brand-600 hover:text-brand-700">Back to transactions</Link>}
        />
      </div>
    );
  }

  async function handleDelete() {
    if (!user || !transaction) return;
    if (!window.confirm('Delete this transaction? This cannot be undone.')) return;
    await transactionService.remove(user.id, transaction.id);
    navigate(STUDENT_ROUTES.transactions);
  }

  return (
    <div className="mx-auto max-w-xl">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-text-secondary dark:hover:text-text-primary">
        <ArrowLeft className="h-4 w-4" />Back
      </button>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-full', transaction.type === 'income' ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-600')}>
              <Receipt className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-text-primary">{transaction.description || categoryName}</p>
              <p className="text-sm text-gray-500 capitalize">{transaction.type}</p>
            </div>
          </div>
          <p className={cn('text-xl font-bold', transaction.type === 'income' ? 'text-brand-600' : 'text-gray-900')}>
            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount, DEFAULT_CURRENCY)}
          </p>
        </div>

        <div className="mt-6 space-y-3 border-t border-gray-100 pt-5">
          <div className="flex items-center gap-3 text-sm"><Tag className="h-4 w-4 shrink-0 text-gray-400 dark:text-text-muted" /><span className="text-gray-500 dark:text-text-secondary">Category</span><span className="ml-auto font-medium text-gray-900 dark:text-text-primary">{categoryName}</span></div>
          <div className="flex items-center gap-3 text-sm"><Calendar className="h-4 w-4 shrink-0 text-gray-400 dark:text-text-muted" /><span className="text-gray-500 dark:text-text-secondary">Date</span><span className="ml-auto font-medium text-gray-900 dark:text-text-primary">{formatDate(transaction.occurredAt)}</span></div>
          {transaction.merchant && (
            <div className="flex items-center gap-3 text-sm"><Store className="h-4 w-4 shrink-0 text-gray-400 dark:text-text-muted" /><span className="text-gray-500 dark:text-text-secondary">Merchant</span><span className="ml-auto font-medium text-gray-900 dark:text-text-primary">{transaction.merchant}</span></div>
          )}
          <div className="flex items-center gap-3 text-sm"><Receipt className="h-4 w-4 shrink-0 text-gray-400 dark:text-text-muted" /><span className="text-gray-500 dark:text-text-secondary">Source</span><span className="ml-auto font-medium capitalize text-gray-900 dark:text-text-primary">{transaction.source.replace('-', ' ')}</span></div>
        </div>

        <div className="mt-6 flex gap-3 border-t border-gray-100 pt-5">
          <Link to={buildPath(STUDENT_ROUTES.editTransaction, { id: transaction.id })} className="flex-1">
            <Button variant="outline" className="w-full"><Pencil className="h-4 w-4" />Edit</Button>
          </Link>
          <Button variant="danger" className="flex-1" onClick={() => void handleDelete()}>
            <Trash2 className="h-4 w-4" />Delete
          </Button>
        </div>
      </Card>
    </div>
  );
}
