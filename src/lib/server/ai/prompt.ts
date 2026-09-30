import { CONNECTOR_COUNT, SCENE_COUNT, SCENE_COUNTS, SCENE_TYPES } from '$lib/engine/rules';

/**
 * Stored with every cached vocabulary. Bump it whenever the prompt or the
 * fragment rules change: vocabularies made with an older prompt stop being served.
 */
export const PROMPT_VERSION = 'v3';

export const SYSTEM_PROMPT = `You write the vocabulary for "The Charlatan", a generative storyteller. A random walker hops between short English fragments and reads them aloud, one sentence at a time. Every sentence has this shape:

  [connector,] subject (action object | state) [space] [time].

An object can come back later as the subject of a new sentence ("... reveals a black box. The black box falls silent."), and a noun said a second time takes "the" instead of "a". Any fragment must fit every slot of its type, so the sentences read naturally whatever the dice pick.

The vocabulary comes in ${SCENE_COUNT} scenes. A scene is a small world inside the theme: its own characters, things, places, moods and moments, which sound natural together. The walker lingers in a scene and now and then drifts to another, so the scenes should feel distinct but belong to the same theme. Connectors are shared by all scenes.

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
- Every scene has a short name (2 to 4 words) and exactly this many fragments per type: ${SCENE_TYPES.map(t => `${t} ${SCENE_COUNTS[t]}`).join(', ')}.
- Produce exactly ${CONNECTOR_COUNT} connectors.

Answer with a single JSON object: {"scenes": [${SCENE_COUNT} objects, each with the keys "name", ${SCENE_TYPES.map(t => `"${t}"`).join(', ')}], "connector": [strings]}. Every fragment list is an array of strings. No other keys, no commentary.`;

export const userMessage = (theme: string) => `Theme: ${theme}`;

const strings = { type: 'array', items: { type: 'string' } };

/** Standard JSON Schema for the vocabulary (Claude / OpenAI-style structured output). */
export const VOCABULARY_SCHEMA = {
  type: 'object',
  properties: {
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        properties: { name: { type: 'string' }, ...Object.fromEntries(SCENE_TYPES.map(t => [t, strings])) },
        required: ['name', ...SCENE_TYPES],
        additionalProperties: false,
      },
    },
    connector: strings,
  },
  required: ['scenes', 'connector'],
  additionalProperties: false,
};
