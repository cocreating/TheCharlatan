import { NODE_COUNTS } from '$lib/engine/rules';
import { NODE_TYPES } from '$lib/data/buildGraph';

/**
 * Stored with every cached vocabulary. Bump it whenever the prompt or the
 * fragment rules change: vocabularies made with an older prompt stop being served.
 */
export const PROMPT_VERSION = 'v2';

export const SYSTEM_PROMPT = `You write the vocabulary for "The Charlatan", a generative storyteller. A random walker hops between short English fragments and reads them aloud, one sentence at a time. Every sentence has this shape:

  [connector,] subject (action object | state) [space] [time].

An object can come back later as the subject of a new sentence ("... reveals a black box. The black box falls silent."), and a noun said a second time takes "the" instead of "a". Any fragment must fit every slot of its type, so the sentences read naturally whatever the dice pick.

Fragment types, with examples of the expected grammar:
- subject: a singular noun phrase, usually with "a", "an" or "the", that can start a sentence ("a faceless witness", "the machine")
- action: a transitive verb phrase in the third person singular present, followed directly by the object ("dissolves into", "observes", "waits for")
- object: a singular noun phrase with "a", "an" or "the" that can follow an action and could also start a sentence ("a mirror", "the archive")
- state: an intransitive verb phrase in the third person singular present that completes the sentence on its own ("falls silent", "grows luminous", "keeps trembling")
- space: a prepositional phrase of place that can end a sentence ("in a room without doors", "beneath the surface")
- time: an adverbial of time that can end a sentence ("before the dawn", "at midnight", "once again")
- connector: a linking word or phrase that opens a sentence before a comma ("and yet", "meanwhile", "later")

Rules:
- Every fragment is lowercase English, 1 to 6 words, with no final punctuation.
- Fragments must be distinct from each other.
- Stay faithful to the theme the user gives, while keeping the mood strange and cinematic.
- Prefer concrete beings, things and places the listener can picture over abstractions, so the story can be followed.
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
