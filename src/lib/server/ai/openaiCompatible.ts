import { SYSTEM_PROMPT, userMessage } from './prompt';
import { AIProviderError, parseJson, type VocabularyProvider } from './types';

interface ChatCompletion {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
}

/**
 * Any OpenAI-compatible chat completions API: Groq, OpenRouter, Mistral, a local
 * Ollama... `baseUrl` is the API root, e.g. https://api.groq.com/openai/v1
 */
export function openAICompatibleProvider(baseUrl: string, apiKey: string, model: string): VocabularyProvider {
  return async theme => {
    const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage(theme) },
        ],
        // JSON mode is the widely supported option; the prompt spells out the shape
        response_format: { type: 'json_object' },
        temperature: 1,
        max_tokens: 8192,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new AIProviderError(`openai-compatible ${response.status}: ${detail.slice(0, 300)}`, response.status === 429 || response.status === 503);
    }

    const choice = ((await response.json()) as ChatCompletion).choices?.[0];
    if (choice?.finish_reason === 'length') {
      throw new AIProviderError('openai-compatible: response cut off (max_tokens)');
    }
    return parseJson(choice?.message?.content ?? undefined, 'openai-compatible');
  };
}
