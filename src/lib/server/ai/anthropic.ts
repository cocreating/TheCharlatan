import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, userMessage, VOCABULARY_SCHEMA } from './prompt';
import { AIProviderError, parseJson, type VocabularyProvider } from './types';

export const DEFAULT_ANTHROPIC_MODEL = 'claude-opus-5-5';

export function anthropicProvider(apiKey: string, model = DEFAULT_ANTHROPIC_MODEL): VocabularyProvider {
  const client = new Anthropic({ apiKey, timeout: 120_000 });

  return async theme => {
    let response;
    try {
      response = await client.beta.messages.create({
        model,
        max_tokens: 16000,
        // On a safety-classifier decline, retry server-side on Anthropic's recommended fallback model
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: {
          effort: 'medium',
          format: { type: 'json_schema', schema: VOCABULARY_SCHEMA },
        },
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage(theme) }],
      });
    } catch (e) {
      if (e instanceof Anthropic.APIError) {
        throw new AIProviderError(`anthropic ${e.status}: ${e.message}`, e instanceof Anthropic.RateLimitError);
      }
      throw e;
    }

    if (response.stop_reason === 'refusal') {
      throw new AIProviderError('anthropic refused', false, 'The charlatan refuses this theme. Try another one.');
    }
    if (response.stop_reason === 'max_tokens') {
      throw new AIProviderError('anthropic: response cut off (max_tokens)');
    }
    return parseJson(response.content.find(block => block.type === 'text')?.text, 'anthropic');
  };
}
