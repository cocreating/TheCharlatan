import type { SupabaseClient } from '@supabase/supabase-js';
import type { GraphData } from '$lib/engine/types';

/** Different AI vocabularies kept per theme, so a popular theme doesn't always sound the same. */
export const MAX_VARIANTS = 3;
const TABLE = 'charlatan_vocabularies';

export interface CachedVocabulary {
  id: string;
  variant: number;
  theme: string;
  graph: GraphData;
}

export interface VocabularyKey {
  themeKey: string;
  lang: string;
  promptVersion: string;
}

/** All stored variants of a theme for this language and prompt version. */
export async function findVariants(db: SupabaseClient, key: VocabularyKey): Promise<CachedVocabulary[]> {
  const { data, error } = await db
    .from(TABLE)
    .select('id, variant, theme, graph')
    .eq('theme_key', key.themeKey)
    .eq('lang', key.lang)
    .eq('prompt_version', key.promptVersion)
    .order('variant');
  if (error) throw new Error(`findVariants: ${error.message}`);
  return (data ?? []) as CachedVocabulary[];
}

/** Lowest variant number not taken yet, or null when the theme is full. */
export function nextVariant(existing: { variant: number }[]): number | null {
  for (let v = 1; v <= MAX_VARIANTS; v++) {
    if (!existing.some(e => e.variant === v)) return v;
  }
  return null;
}

/**
 * Stores a freshly generated graph. Returns its id, or null when another
 * request took the same variant number first (the unique key rejects it).
 */
export async function saveVariant(
  db: SupabaseClient,
  row: VocabularyKey & { theme: string; variant: number; provider: string | null; model: string | null; graph: GraphData },
): Promise<string | null> {
  const { data, error } = await db
    .from(TABLE)
    .insert({
      theme_key: row.themeKey,
      theme: row.theme,
      lang: row.lang,
      variant: row.variant,
      provider: row.provider,
      model: row.model,
      prompt_version: row.promptVersion,
      graph: row.graph,
    })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') return null; // unique_violation: lost a race, fine
    throw new Error(`saveVariant: ${error.message}`);
  }
  return (data as { id: string }).id;
}

/** Counts one more reuse of a stored vocabulary. */
export async function recordHit(db: SupabaseClient, id: string): Promise<void> {
  const { error } = await db.rpc('charlatan_vocabulary_hit', { p_id: id });
  if (error) throw new Error(`recordHit: ${error.message}`);
}

export interface ThemeSuggestion {
  key: string;
  theme: string;
}

/** Stored themes matching a normalized query: prefix first, then similar, then most used. */
export async function suggestThemes(db: SupabaseClient, q: string, lang: string, limit = 8): Promise<ThemeSuggestion[]> {
  const { data, error } = await db.rpc('charlatan_suggest_themes', { q, p_lang: lang, p_limit: limit });
  if (error) throw new Error(`suggestThemes: ${error.message}`);
  return ((data ?? []) as { theme_key: string; theme: string }[]).map(r => ({ key: r.theme_key, theme: r.theme }));
}
