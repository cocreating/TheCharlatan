import { describe, expect, it } from 'vitest';
import { cleanTheme, sanitizeVocabulary, VocabularyError, MIN_FRAGMENTS_PER_TYPE } from './vocabulary';
import { CONNECTOR_COUNT, SCENE_COUNT, SCENE_COUNTS, SCENE_TYPES } from '$lib/engine/rules';

const list = <T,>(n: number, make: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => make(i));
const fill = (n: number, scenes = 4, make = (t: string, s: number, i: number) => `${t} ${s}.${i}`) => ({
  scenes: list(scenes, s => ({ name: `scene ${s}`, ...Object.fromEntries(SCENE_TYPES.map(t => [t, list(n, i => make(t, s, i))])) }) as Record<string, unknown>),
  connector: list(n, i => make('connector', 0, i)) as unknown[],
});

describe('cleanTheme', () => {
  it('trims and collapses whitespace', () => {
    expect(cleanTheme('  noir   rain \n')).toBe('noir rain');
  });

  it('rejects empty, too long and non-string themes', () => {
    expect(cleanTheme('   ')).toBeNull();
    expect(cleanTheme('x'.repeat(201))).toBeNull();
    expect(cleanTheme(42)).toBeNull();
  });
});

describe('sanitizeVocabulary', () => {
  it('normalizes and caps fragments per scene', () => {
    const vocabulary = sanitizeVocabulary(fill(50, 6, (t, s, i) => ` ${t.toUpperCase()}  ${s}.${i}. `));
    expect(vocabulary.scenes).toHaveLength(SCENE_COUNT);
    expect(vocabulary.scenes[0].subject[0]).toBe('subject 0.0');
    for (const type of SCENE_TYPES) expect(vocabulary.scenes[3][type]).toHaveLength(SCENE_COUNTS[type]);
    expect(vocabulary.connector).toHaveLength(CONNECTOR_COUNT);
  });

  it('dedupes across scenes and drops a scene left empty', () => {
    // Scene 1 repeats scene 0 word for word
    const raw = fill(4, 3, (t, s, i) => (s < 2 ? `${t} ${i}` : `${t} ${s}.${i}`));
    raw.connector = list(MIN_FRAGMENTS_PER_TYPE, i => `c ${i}`);
    expect(sanitizeVocabulary(raw).scenes.map(s => s.name)).toEqual(['scene 0', 'scene 2']);
  });

  it('names unnamed scenes', () => {
    const raw = fill(10);
    raw.scenes[2].name = 42;
    expect(sanitizeVocabulary(raw).scenes.map(s => s.name)).toEqual(['scene 0', 'scene 1', 'scene 3', 'scene 3']);
  });

  it('throws when scenes or a type come back too short', () => {
    expect(() => sanitizeVocabulary(null)).toThrow(VocabularyError);
    expect(() => sanitizeVocabulary({ subject: ['old flat shape'] })).toThrow(VocabularyError);
    expect(() => sanitizeVocabulary(fill(10, 1))).toThrow(VocabularyError);

    const raw = fill(20);
    raw.connector = ['and yet', 'and yet', '', 42, 'x'.repeat(80)];
    expect(() => sanitizeVocabulary(raw)).toThrow(VocabularyError);

    // Enough across the scenes, even if each scene alone is short
    const thin = fill(3, 2);
    thin.connector = list(MIN_FRAGMENTS_PER_TYPE, i => `c ${i}`);
    expect(() => sanitizeVocabulary(thin)).not.toThrow();
    const thinner = fill(2, 2);
    thinner.connector = list(MIN_FRAGMENTS_PER_TYPE, i => `c ${i}`);
    expect(() => sanitizeVocabulary(thinner)).toThrow(VocabularyError);
  });
});
