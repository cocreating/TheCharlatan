import { expect, it } from 'vitest';
import { MAX_VARIANTS, nextVariant } from './vocabularyCache';

it('picks the lowest free variant, or null when the theme is full', () => {
  expect(nextVariant([])).toBe(1);
  expect(nextVariant([{ variant: 1 }])).toBe(2);
  expect(nextVariant([{ variant: 1 }, { variant: 3 }])).toBe(2);
  expect(nextVariant(Array.from({ length: MAX_VARIANTS }, (_, i) => ({ variant: i + 1 })))).toBeNull();
});
