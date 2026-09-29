import { anthropicProvider } from './anthropic';
import { geminiProvider } from './gemini';
import { openAICompatibleProvider } from './openaiCompatible';
import type { VocabularyProvider } from './types';

export { AIProviderError, type VocabularyProvider } from './types';

type Env = Record<string, string | undefined>;

/**
 * Picks the AI provider from the server environment. AI_PROVIDER forces one
 * (gemini | openai | anthropic); otherwise the first configured key wins,
 * in that order. Returns null when no provider is configured.
 */
export function resolveProvider(env: Env): VocabularyProvider | null {
  const wanted = env.AI_PROVIDER?.trim().toLowerCase();
  const pick = (name: string) => !wanted || wanted === name;

  if (pick('gemini') && env.GEMINI_API_KEY) {
    return geminiProvider(env.GEMINI_API_KEY, env.GEMINI_MODEL || undefined);
  }
  if (pick('openai') && env.OPENAI_API_KEY && env.OPENAI_BASE_URL && env.OPENAI_MODEL) {
    return openAICompatibleProvider(env.OPENAI_BASE_URL, env.OPENAI_API_KEY, env.OPENAI_MODEL);
  }
  if (pick('anthropic') && env.ANTHROPIC_API_KEY) {
    return anthropicProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL || undefined);
  }
  return null;
}
