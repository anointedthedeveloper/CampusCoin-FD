import { aiApi, type AIConversationTurn, type CategorySuggestion } from '@/api/ai.api';
import { FEATURE_FLAGS } from '@/constants/config';

// Gate every AI call behind its feature flag so the UI degrades gracefully
// when a provider isn't configured on the backend yet.
export const aiService = {
  isCategorizationEnabled: () => FEATURE_FLAGS.aiCategorization,
  isInsightsEnabled: () => FEATURE_FLAGS.aiInsights,

  answer: (message: string, history?: AIConversationTurn[]) => aiApi.answer(message, history),

  async suggestCategory(description: string, merchant?: string): Promise<CategorySuggestion | null> {
    if (!FEATURE_FLAGS.aiCategorization) return null;
    return aiApi.suggestCategory(description, merchant);
  },

  async generateMonthlyInsight(month: string): Promise<{ insightId: string } | null> {
    if (!FEATURE_FLAGS.aiInsights) return null;
    return aiApi.generateMonthlyInsight({ month });
  },
};
