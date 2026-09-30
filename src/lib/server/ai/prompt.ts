import { NODE_COUNTS } from '$lib/engine/rules';
import { NODE_TYPES } from '$lib/data/buildGraph';

/**
 * Stored with every cached vocabulary. Bump it whenever the prompt or the
 * fragment rules change: vocabularies made with an older prompt stop being served.
 */
export const PROMPT_VERSION = 'v1';

export const SYSTEM_PROMPT = `You write the vocabulary for "The Charlatan", a generative storyteller. A random walker hops between short English fragments and reads them aloud in sequence, so any valid chain must sound like an eerie, poetic sentence. Transitions follow these rules:
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
- Produce exactly this many fragments per type: ${NODE_TYPES.map(t => `${t} ${NODE_COUNTS[t]}`).join(', ')}.

Answer with a single JSON object whose keys are ${NODE_TYPES.map(t => `"${t}"`).join(', ')}, each mapping to an array of strings. No other keys, no commentary.`;

export const userMessage = (theme: string) => `Theme: ${theme}`;

/** Standard JSON Schema for the vocabulary (Claude / OpenAI-style structured output). */
export const VOCABULARY_SCHEMA = {
  type: 'object',
  properties: Object.fromEntries(NODE_TYPES.map(t => [t, { type: 'array', items: { type: 'string' } }])),
  required: NODE_TYPES,
  additionalProperties: false,
};
