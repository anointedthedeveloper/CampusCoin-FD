import { transactionsApi } from '@/api/transactions.api';
import type { Transaction, TransactionFilters, TransactionPayload } from '@/types/transaction';

export const transactionService = {
  async list(_userId?: string, filters: TransactionFilters = {}): Promise<Transaction[]> {
    const result = await transactionsApi.list(filters);
    return result.items;
  },

  async listPaginated(_userId?: string, filters: TransactionFilters = {}) {
    return transactionsApi.list(filters);
  },

  async getById(_userId: string, id: string): Promise<Transaction | undefined> {
    try {
      return await transactionsApi.getById(id);
    } catch {
      return undefined;
    }
  },

  async create(_userId: string, payload: TransactionPayload): Promise<Transaction> {
    return transactionsApi.create(payload);
  },

  async createMany(_userId: string, payloads: TransactionPayload[]): Promise<Transaction[]> {
    return Promise.all(payloads.map((p) => transactionsApi.create(p)));
  },

  async update(_userId: string, id: string, payload: Partial<TransactionPayload>): Promise<Transaction> {
    return transactionsApi.update(id, payload);
  },

  async remove(_userId: string, id: string): Promise<void> {
    return transactionsApi.remove(id);
  },

  // No-op — server handles reassignment or cascading on delete.
  async reassignCategory(_userId: string, _from: string, _to: string): Promise<number> {
    return 0;
  },

  deleteAllForUser(_userId: string): void {
    return;
  },
};
