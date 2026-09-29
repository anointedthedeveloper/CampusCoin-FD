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

export interface AITemplate {
  kind: 'afford' | 'when-afford';
  amount: number;
  itemName?: string;
  targetMonths?: number;
}

export interface AIAnswer {
  answer: string;
  ai?: AIIdentity;
  degraded?: boolean;
  conversationId?: string;
  title?: string;
}

export interface AIConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  preview: string;
  updatedAt: string;
  createdAt: string;
}

export interface AIStoredMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  ai?: AIIdentity;
  createdAt: string;
}

export const aiApi = {
  async answer(
    message: string,
    options: { history?: AIConversationTurn[]; conversationId?: string; template?: AITemplate } = {},
  ): Promise<AIAnswer> {
    const { data } = await httpClient.post<ApiSuccess<AIAnswer>>('/ai/answer', {
      message,
      history: options.history,
      conversationId: options.conversationId,
      template: options.template,
    }, { timeout: AI_TIMEOUT_MS });
    return data.data;
  },

  async listConversations(): Promise<AIConversationSummary[]> {
    const { data } = await httpClient.get<ApiSuccess<AIConversationSummary[]>>('/ai/conversations');
    return data.data ?? [];
  },

  async getConversation(id: string): Promise<AIConversationSummary & { messages: AIStoredMessage[] }> {
    const { data } = await httpClient.get<ApiSuccess<AIConversationSummary & { messages: AIStoredMessage[] }>>(`/ai/conversations/${id}`);
    return data.data;
  },

  async deleteConversation(id: string): Promise<void> {
    await httpClient.delete(`/ai/conversations/${id}`);
  },

  async clearConversations(): Promise<void> {
    await httpClient.delete('/ai/conversations');
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
