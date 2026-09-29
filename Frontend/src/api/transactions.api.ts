import { httpClient } from './httpClient';
import type { ApiSuccess, PaginatedResult } from '@/types/api';
import type { CsvImportPreview, Transaction, TransactionFilters, TransactionPayload } from '@/types/transaction';

export const transactionsApi = {
  async list(filters: TransactionFilters = {}): Promise<PaginatedResult<Transaction>> {
    const { data } = await httpClient.get<ApiSuccess<PaginatedResult<Transaction>>>('/transactions', {
      params: filters,
    });
    return data.data;
  },

  async getById(id: string): Promise<Transaction> {
    const { data } = await httpClient.get<ApiSuccess<Transaction>>(`/transactions/${id}`);
    return data.data;
  },

  async create(payload: TransactionPayload): Promise<Transaction> {
    const { data } = await httpClient.post<ApiSuccess<Transaction>>('/transactions', payload);
    return data.data;
  },

  async update(id: string, payload: Partial<TransactionPayload>): Promise<Transaction> {
    const { data } = await httpClient.patch<ApiSuccess<Transaction>>(`/transactions/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/transactions/${id}`);
  },

  async previewCsvImport(file: File): Promise<CsvImportPreview> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await httpClient.post<ApiSuccess<CsvImportPreview>>(
      '/transactions/import/preview',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return data.data;
  },

  async confirmCsvImport(rows: CsvImportPreview['rows']): Promise<{ imported: number }> {
    const { data } = await httpClient.post<ApiSuccess<Transaction[]> & { meta?: { imported?: number } }>(
      '/transactions/import/confirm',
      { rows },
    );
    return { imported: data.meta?.imported ?? data.data.length };
  },

  async history(id: string): Promise<TransactionRevision[]> {
    const { data } = await httpClient.get<ApiSuccess<TransactionRevision[]>>(`/transactions/${id}/history`);
    return data.data ?? [];
  },

  async recentlyDeleted(): Promise<TransactionRevision[]> {
    const { data } = await httpClient.get<ApiSuccess<TransactionRevision[]>>('/transactions/deleted');
    return data.data ?? [];
  },

  async restoreDeleted(revisionId: string): Promise<Transaction> {
    const { data } = await httpClient.post<ApiSuccess<Transaction>>(`/transactions/deleted/${revisionId}/restore`);
    return data.data;
  },

  /** Batch category suggestions for rows being imported. */
  async suggestImportCategories(rows: { description: string; type: 'income' | 'expense' }[]): Promise<ImportSuggestion[]> {
    const { data } = await httpClient.post<ApiSuccess<ImportSuggestion[]>>('/transactions/import/categorize', { rows });
    return data.data;
  },

  async importRows(rows: ImportRowPayload[], opts: { skipDuplicates: boolean; fileName?: string }): Promise<ImportResult> {
    const { data } = await httpClient.post<ApiSuccess<Transaction[]> & { meta: ImportResult }>(
      '/transactions/import/confirm',
      { rows, skipDuplicates: opts.skipDuplicates, fileName: opts.fileName },
    );
    return data.meta;
  },

  /** Every transaction matching the filters (up to 5,000), with category names. */
  async exportRows(filters: ExportFilters = {}): Promise<{ rows: ExportRow[]; truncated: boolean }> {
    const { data } = await httpClient.get<ApiSuccess<ExportRow[]> & { meta?: { truncated?: boolean } }>('/transactions/export', { params: filters });
    return { rows: data.data ?? [], truncated: Boolean(data.meta?.truncated) };
  },

  async exportPdf(filters: ExportFilters = {}): Promise<Blob> {
    const { data } = await httpClient.get<Blob>('/transactions/export', { params: { ...filters, format: 'pdf' }, responseType: 'blob' });
    return data;
  },
};

export interface ImportSuggestion {
  categoryId: string | null;
  source: 'history' | 'ai' | 'keywords' | null;
  confidence: number;
}

export interface ImportRowPayload {
  occurredAt: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categoryId: string;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  invalid: number;
  errors: { row: number; message: string }[];
}

export interface ExportFilters {
  type?: 'income' | 'expense';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface ExportRow {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  merchant: string;
  amount: number;
  source: string;
}

export interface TransactionSnapshot {
  type?: 'income' | 'expense';
  amount?: number;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  merchant?: string;
  occurredAt?: string;
  source?: string;
}

export interface TransactionRevision {
  id: string;
  transactionId: string;
  action: 'created' | 'updated' | 'deleted' | 'restored';
  via: 'app' | 'ai' | 'import' | 'recurring' | 'restore';
  before: TransactionSnapshot | null;
  after: TransactionSnapshot | null;
  at: string;
  restoredAt?: string | null;
}
