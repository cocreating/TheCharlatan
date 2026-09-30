import { expect, it } from 'vitest';
import { normalizeTheme } from './themes';

it('normalizes case, diacritics and spacing so equal themes share a key', () => {
  expect(normalizeTheme('  Noir   Rain ')).toBe('noir rain');
  expect(normalizeTheme('Café\tSOCIÉTÉ\n')).toBe('cafe societe');
  expect(normalizeTheme('Ñandú')).toBe('nandu');
  expect(normalizeTheme('   ')).toBe('');
});

it('is idempotent', () => {
  const once = normalizeTheme(' Über  Größe ');
  expect(normalizeTheme(once)).toBe(once);
});
