import { describe, expect, it } from 'vitest';
import { cleanTheme, sanitizeVocabulary, VocabularyError, MIN_FRAGMENTS_PER_TYPE } from './vocabulary';
import { NODE_TYPES } from '$lib/data/buildGraph';
import { NODE_COUNTS } from '$lib/engine/rules';

const fill = (n: number, make = (t: string, i: number) => `${t} ${i}`) =>
  Object.fromEntries(NODE_TYPES.map(t => [t, Array.from({ length: n }, (_, i) => make(t, i))]));

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
  it('normalizes, dedupes and caps fragments per type', () => {
    const raw = fill(50, (t, i) => ` ${t.toUpperCase()}  ${i % 30}. `);
    const vocabulary = sanitizeVocabulary(raw);
    expect(vocabulary.subject[0]).toBe('subject 0');
    for (const type of NODE_TYPES) {
      expect(vocabulary[type]).toHaveLength(Math.min(30, NODE_COUNTS[type]));
    }
  });

  it('throws when a type has too few usable fragments', () => {
    const raw = fill(20);
    raw.connector = ['and yet', 'and yet', '', 42, 'x'.repeat(80)] as unknown as string[];
    expect(() => sanitizeVocabulary(raw)).toThrow(VocabularyError);
    expect(() => sanitizeVocabulary(fill(MIN_FRAGMENTS_PER_TYPE))).not.toThrow();
    expect(() => sanitizeVocabulary(null)).toThrow(VocabularyError);
  });
});
