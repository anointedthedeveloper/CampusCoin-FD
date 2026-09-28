import { httpClient } from './httpClient';
import type { ApiSuccess } from '@/types/api';
import type { RecurringEntry, RecurringPayload } from '@/types/recurring';

export const recurringApi = {
  async list(): Promise<RecurringEntry[]> {
    const { data } = await httpClient.get<ApiSuccess<RecurringEntry[]>>('/money-routines');
    return data.data ?? [];
  },

  async create(payload: RecurringPayload): Promise<RecurringEntry> {
    const { data } = await httpClient.post<ApiSuccess<RecurringEntry>>('/money-routines', payload);
    return data.data;
  },

  async update(id: string, payload: Partial<RecurringPayload> & { isActive?: boolean }): Promise<RecurringEntry> {
    const { data } = await httpClient.patch<ApiSuccess<RecurringEntry>>(`/money-routines/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`/money-routines/${id}`);
  },

  /** Posts any occurrences that have come due. */
  async processDue(): Promise<number> {
    const { data } = await httpClient.post<ApiSuccess<{ processed: number }>>('/money-routines/process');
    return data.data?.processed ?? 0;
  },
};

/** The next occurrence strictly after `fromIso` (YYYY-MM-DD), as YYYY-MM-DD. */
export function nextOccurrence(fromIso: string, frequency: RecurringEntry['frequency'], interval = 1): string {
  const [y, m, d] = fromIso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (frequency === 'daily') date.setUTCDate(date.getUTCDate() + interval);
  else if (frequency === 'weekly') date.setUTCDate(date.getUTCDate() + 7 * interval);
  else if (frequency === 'monthly') date.setUTCMonth(date.getUTCMonth() + interval);
  else date.setUTCFullYear(date.getUTCFullYear() + interval);
  return date.toISOString().slice(0, 10);
}
