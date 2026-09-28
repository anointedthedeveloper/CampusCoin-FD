import { httpClient } from './httpClient';
import type { ApiSuccess } from '@/types/api';

// The frontend only ever talks to these generic /ai/* endpoints. Which
// provider (OpenAI, Gemini, Claude, ...) actually serves them is a backend
// concern and must stay invisible here.
export interface CategorySuggestion {
  categoryId: string | null;
  confidence: number;
  /** 'history' = learned from the student's own past entries. */
  source?: 'history' | 'ai' | 'keywords' | null;
}

export interface MonthlyInsightRequest {
  month: string;
}

export interface AIConversationTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface AIIdentity {
  provider: string;
  model: string;
}

// AI providers routinely take longer than httpClient's 10s default (the
// backend allows up to ~45s per provider call), so AI requests get their own
// longer timeout instead of failing while the server is still answering.
const AI_TIMEOUT_MS = 60_000;

export const aiApi = {
  async answer(message: string, history: AIConversationTurn[] = []): Promise<{ answer: string; ai?: AIIdentity }> {
    const { data } = await httpClient.post<ApiSuccess<{ answer: string; ai?: AIIdentity }>>('/ai/answer', {
      message,
      history,
    }, { timeout: AI_TIMEOUT_MS });
    return data.data;
  },

  async suggestCategory(description: string, merchant?: string, type?: 'income' | 'expense'): Promise<CategorySuggestion> {
    const { data } = await httpClient.post<ApiSuccess<CategorySuggestion>>('/ai/categorize', {
      description,
      merchant,
      type,
    }, { timeout: AI_TIMEOUT_MS });
    return data.data;
  },

  async generateMonthlyInsight(payload: MonthlyInsightRequest): Promise<{ insightId: string }> {
    const { data } = await httpClient.post<ApiSuccess<{ insightId: string }>>(
      '/ai/insights/generate',
      payload,
      { timeout: AI_TIMEOUT_MS },
    );
    return data.data;
  },
};
