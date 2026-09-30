import { CONNECTOR_COUNT, MIN_SCENES, SCENE_COUNT, SCENE_COUNTS, SCENE_TYPES } from '$lib/engine/rules';
import type { SceneVocabulary, Vocabulary } from '$lib/data/buildGraph';
import type { VocabularyProvider } from './ai';

const MAX_FRAGMENT_LENGTH = 60;
const MAX_SCENE_NAME_LENGTH = 40;
// Fewest fragments per type (across all scenes) that still gives every node three valid link targets.
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

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/**
 * Trims, dedupes (across the whole vocabulary) and caps the model's fragments.
 * Throws if fewer than MIN_SCENES scenes come back, or a type is too short overall.
 */
export function sanitizeVocabulary(raw: unknown): Vocabulary {
  if (!isObject(raw) || !Array.isArray(raw.scenes)) throw new VocabularyError('Malformed vocabulary');

  const seen = new Set<string>();
  const clean = (items: unknown, cap: number): string[] => {
    const fragments: string[] = [];
    for (const item of Array.isArray(items) ? items : []) {
      if (typeof item !== 'string' || fragments.length >= cap) continue;
      const text = item.replace(/\s+/g, ' ').trim().replace(/[.!?;:,]+$/, '').toLowerCase();
      if (!text || text.length > MAX_FRAGMENT_LENGTH || seen.has(text)) continue;
      seen.add(text);
      fragments.push(text);
    }
    return fragments;
  };

  const scenes: SceneVocabulary[] = raw.scenes
    .filter(isObject)
    .slice(0, SCENE_COUNT)
    .map((scene, i) => {
      const name = typeof scene.name === 'string' ? scene.name.replace(/\s+/g, ' ').trim().slice(0, MAX_SCENE_NAME_LENGTH) : '';
      const fragments = Object.fromEntries(SCENE_TYPES.map(t => [t, clean(scene[t], SCENE_COUNTS[t])]));
      return { name: name || `scene ${i + 1}`, ...fragments } as SceneVocabulary;
    })
    .filter(scene => SCENE_TYPES.some(t => scene[t].length > 0));
  if (scenes.length < MIN_SCENES) throw new VocabularyError('Too few scenes');

  for (const type of SCENE_TYPES) {
    if (scenes.reduce((n, scene) => n + scene[type].length, 0) < MIN_FRAGMENTS_PER_TYPE) {
      throw new VocabularyError(`Too few "${type}" fragments`);
    }
  }
  const connector = clean(raw.connector, CONNECTOR_COUNT);
  if (connector.length < MIN_FRAGMENTS_PER_TYPE) throw new VocabularyError('Too few "connector" fragments');

  return { scenes, connector };
}

/** Asks the configured AI provider for a themed vocabulary. Server-only. */
export async function generateVocabulary(theme: string, provider: VocabularyProvider): Promise<Vocabulary> {
  return sanitizeVocabulary(await provider(theme));
}
