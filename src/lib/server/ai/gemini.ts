import { SCENE_TYPES } from '$lib/engine/rules';
import { SYSTEM_PROMPT, userMessage } from './prompt';
import { AIProviderError, parseJson, type VocabularyProvider } from './types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
// Alias that follows Google's current Flash model (on the free tier)
export const DEFAULT_GEMINI_MODEL = 'gemini-flash-latest';

// Gemini's responseSchema uses the OpenAPI subset (uppercase types, no additionalProperties)
const STRINGS = { type: 'ARRAY', items: { type: 'STRING' } };
const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    scenes: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, ...Object.fromEntries(SCENE_TYPES.map(t => [t, STRINGS])) },
        required: ['name', ...SCENE_TYPES],
      },
    },
    connector: STRINGS,
  },
  required: ['scenes', 'connector'],
};

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

export function geminiProvider(apiKey: string, model = DEFAULT_GEMINI_MODEL): VocabularyProvider {
  return async theme => {
    const response = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: userMessage(theme) }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          temperature: 1,
          maxOutputTokens: 8192,
        },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new AIProviderError(`gemini ${response.status}: ${detail.slice(0, 300)}`, response.status === 429 || response.status === 503);
    }

    const data = (await response.json()) as GeminiResponse;
    if (data.promptFeedback?.blockReason) {
      throw new AIProviderError(
        `gemini blocked the prompt: ${data.promptFeedback.blockReason}`,
        false,
        'The charlatan refuses this theme. Try another one.',
      );
    }

    const candidate = data.candidates?.[0];
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      throw new AIProviderError(`gemini stopped early: ${candidate.finishReason}`);
    }
    const text = candidate?.content?.parts?.map(p => p.text ?? '').join('');
    return parseJson(text, 'gemini');
  };
}
