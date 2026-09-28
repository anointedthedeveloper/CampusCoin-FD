import { aiApi, type AIConversationTurn, type CategorySuggestion } from '@/api/ai.api';
import { FEATURE_FLAGS } from '@/constants/config';

// Gate every AI call behind its feature flag so the UI degrades gracefully
// when a provider isn't configured on the backend yet.
export const aiService = {
  isCategorizationEnabled: () => FEATURE_FLAGS.aiCategorization,
  isInsightsEnabled: () => FEATURE_FLAGS.aiInsights,

  answer: (message: string, history?: AIConversationTurn[]) => aiApi.answer(message, history),

  // Gated by the student's own "Automatic categorization" setting (checked
  // by the caller) rather than a build-time flag, so it works as soon as
  // the student turns it on.
  async suggestCategory(description: string, merchant?: string, type?: 'income' | 'expense'): Promise<CategorySuggestion | null> {
    return aiApi.suggestCategory(description, merchant, type);
  },

  async generateMonthlyInsight(month: string): Promise<{ insightId: string } | null> {
    if (!FEATURE_FLAGS.aiInsights) return null;
    return aiApi.generateMonthlyInsight({ month });
  },
};
