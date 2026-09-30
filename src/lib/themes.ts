/** Longest theme accepted in a suggestion query. */
export const MAX_SUGGEST_QUERY = 60;
export const MIN_SUGGEST_QUERY = 2;

/**
 * The key a theme is stored and looked up by: trimmed, lowercase, without
 * diacritics, single spaces. "  Noir   Rain " and "noir rain" share a key.
 * Used on both sides (saving and searching), so they always agree.
 */
export function normalizeTheme(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}
