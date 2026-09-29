import Anthropic from '@anthropic-ai/sdk';
import { NODE_COUNTS } from '$lib/engine/rules';
import { NODE_TYPES, type Vocabulary } from '$lib/data/buildGraph';

const MODEL = 'claude-opus-5-5';
const MAX_FRAGMENT_LENGTH = 60;
// Fewest fragments per type that still gives every node three valid link targets.
export const MIN_FRAGMENTS_PER_TYPE = 5;
export const MAX_THEME_LENGTH = 200;

export class VocabularyError extends Error {}

const SYSTEM_PROMPT = `You write the vocabulary for "The Charlatan", a generative storyteller. A random walker hops between short English fragments and reads them aloud in sequence, so any valid chain must sound like an eerie, poetic sentence. Transitions follow these rules:
subject → action | state
action → space | object | time | state
space → action | state | time
state → action | space
object → connector | subject
time → subject | action | connector
connector → any type

Fragment types, with examples of the expected grammar:
- subject: a noun phrase that can start a sentence ("a faceless witness", "the machine")
- action: a verb phrase that takes an object or place ("dissolves into", "observes", "collides with")
- space: a prepositional phrase of place ("in a room without doors", "beneath the surface")
- time: an adverbial of time ("before the dawn", "suddenly", "in a microsecond")
- state: a single adjective or short adjective phrase ("luminous", "trembling", "almost silent")
- object: a noun phrase that can follow a verb ("a mirror", "the archive")
- connector: a conjunction or linking adverb ("and yet", "meanwhile")

Rules:
- Every fragment is lowercase English, 1 to 6 words, with no final punctuation.
- Fragments must be distinct from each other.
- Stay faithful to the theme the user gives, while keeping the mood strange and cinematic.
- Produce exactly this many fragments per type: ${NODE_TYPES.map(t => `${t} ${NODE_COUNTS[t]}`).join(', ')}.`;

const VOCABULARY_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(NODE_TYPES.map(t => [t, { type: 'array', items: { type: 'string' } }])),
  required: NODE_TYPES,
  additionalProperties: false,
};

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

/** Asks Claude for a themed vocabulary. Server-only: needs the API key. */
export async function generateVocabulary(theme: string, apiKey: string): Promise<Vocabulary> {
  const client = new Anthropic({ apiKey, timeout: 120_000 });

  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    // On a safety-classifier decline, retry server-side on Anthropic's recommended fallback model
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: VOCABULARY_SCHEMA },
    },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Theme: ${theme}` }],
  });

  if (response.stop_reason === 'refusal') {
    throw new VocabularyError('The charlatan refuses this theme. Try another one.');
  }
  if (response.stop_reason === 'max_tokens') {
    throw new VocabularyError('The vocabulary came back incomplete');
  }

  const text = response.content.find(block => block.type === 'text')?.text;
  if (!text) throw new VocabularyError('Empty response');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new VocabularyError('Malformed vocabulary');
  }
  return sanitizeVocabulary(parsed);
}
