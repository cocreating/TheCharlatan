import { NODE_COUNTS } from '$lib/engine/rules';
import { NODE_TYPES, type Vocabulary } from '$lib/data/buildGraph';
import type { VocabularyProvider } from './ai';

const MAX_FRAGMENT_LENGTH = 60;
// Fewest fragments per type that still gives every node three valid link targets.
export const MIN_FRAGMENTS_PER_TYPE = 5;
export const MAX_THEME_LENGTH = 200;

/** The model answered, but not with a usable vocabulary. */
export class VocabularyError extends Error {}

/** Normalizes a theme typed by a user; returns null when it is unusable. */
export function cleanTheme(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const theme = input.replace(/\s+/g, ' ').trim();
  return theme.length > 0 && theme.length <= MAX_THEME_LENGTH ? theme : null;
}

/** Trims, dedupes and caps the model's fragments; throws if a type comes back too short. */
export function sanitizeVocabulary(raw: unknown): Vocabulary {
  if (typeof raw !== 'object' || raw === null) throw new VocabularyError('Malformed vocabulary');
  const source = raw as Record<string, unknown>;

  const vocabulary = {} as Vocabulary;
  for (const type of NODE_TYPES) {
    const items = Array.isArray(source[type]) ? source[type] : [];
    const fragments = new Set<string>();
    for (const item of items) {
      if (typeof item !== 'string') continue;
      const text = item.replace(/\s+/g, ' ').trim().replace(/[.!?;:,]+$/, '').toLowerCase();
      if (text && text.length <= MAX_FRAGMENT_LENGTH) fragments.add(text);
    }
    if (fragments.size < MIN_FRAGMENTS_PER_TYPE) {
      throw new VocabularyError(`Too few "${type}" fragments`);
    }
    vocabulary[type] = [...fragments].slice(0, NODE_COUNTS[type]);
  }
  return vocabulary;
}

/** Asks the configured AI provider for a themed vocabulary. Server-only. */
export async function generateVocabulary(theme: string, provider: VocabularyProvider): Promise<Vocabulary> {
  return sanitizeVocabulary(await provider(theme));
}
