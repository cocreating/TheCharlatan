import { anthropicProvider, DEFAULT_ANTHROPIC_MODEL } from './anthropic';
import { geminiProvider, DEFAULT_GEMINI_MODEL } from './gemini';
import { openAICompatibleProvider } from './openaiCompatible';
import type { VocabularyProvider } from './types';

export { AIProviderError, type VocabularyProvider } from './types';

type Env = Record<string, string | undefined>;

export interface ProviderInfo {
  provider: 'gemini' | 'openai' | 'anthropic';
  model: string;
}

/**
 * Which AI provider the server environment selects. AI_PROVIDER forces one
 * (gemini | openai | anthropic); otherwise the first configured key wins,
 * in that order. Returns null when no provider is configured.
 */
export function describeProvider(env: Env): ProviderInfo | null {
  const wanted = env.AI_PROVIDER?.trim().toLowerCase();
  const pick = (name: string) => !wanted || wanted === name;

  if (pick('gemini') && env.GEMINI_API_KEY) {
    return { provider: 'gemini', model: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL };
  }
  if (pick('openai') && env.OPENAI_API_KEY && env.OPENAI_BASE_URL && env.OPENAI_MODEL) {
    return { provider: 'openai', model: env.OPENAI_MODEL };
  }
  if (pick('anthropic') && env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', model: env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL };
  }
  return null;
}

/** The configured provider, ready to call; null when none is configured. */
export function resolveProvider(env: Env): VocabularyProvider | null {
  const info = describeProvider(env);
  switch (info?.provider) {
    case 'gemini':
      return geminiProvider(env.GEMINI_API_KEY!, info.model);
    case 'openai':
      return openAICompatibleProvider(env.OPENAI_BASE_URL!, env.OPENAI_API_KEY!, info.model);
    case 'anthropic':
      return anthropicProvider(env.ANTHROPIC_API_KEY!, info.model);
    default:
      return null;
  }
}
