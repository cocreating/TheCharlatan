/** A failure talking to the AI provider (network, quota, bad key, blocked output...). */
export class AIProviderError extends Error {
  constructor(
    message: string,
    /** True when the provider is rate-limiting or out of free quota. */
    readonly busy = false,
    /** A message safe to show to visitors, when the default one isn't right. */
    readonly publicMessage?: string,
  ) {
    super(message);
  }
}

/** Returns the model's JSON answer, parsed but not yet validated. */
export type VocabularyProvider = (theme: string) => Promise<unknown>;

export function parseJson(text: string | undefined, provider: string): unknown {
  if (!text) throw new AIProviderError(`${provider}: empty response`);
  try {
    // Some models wrap JSON in a markdown fence even when asked not to
    return JSON.parse(text.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, ''));
  } catch {
    throw new AIProviderError(`${provider}: response is not valid JSON`);
  }
}
