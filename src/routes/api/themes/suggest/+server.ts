import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { MAX_SUGGEST_QUERY, MIN_SUGGEST_QUERY, normalizeTheme } from '$lib/themes';
import { getDb } from '$lib/server/db';
import { createRateLimiter } from '$lib/server/rateLimit';
import { suggestThemes } from '$lib/server/vocabularyCache';
import type { RequestHandler } from './$types';

const LANG = 'en';
const LIMIT = 8;

// Typing fires a request every ~250 ms; this only stops scripted hammering.
const checkRateLimit = createRateLimiter({ limit: 120, windowMs: 60 * 1000 });

/** GET ?q= → { themes: [{ key, theme }] }: stored themes for the autocomplete. */
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
  const q = normalizeTheme(url.searchParams.get('q') ?? '');
  const db = getDb(env);
  if (!db || q.length < MIN_SUGGEST_QUERY || q.length > MAX_SUGGEST_QUERY) return json({ themes: [] });

  if (!checkRateLimit(getClientAddress()).allowed) {
    return json({ themes: [] }, { status: 429 });
  }

  try {
    const themes = await suggestThemes(db, q, LANG, LIMIT);
    return json({ themes }, { headers: { 'cache-control': 'private, max-age=30' } });
  } catch (e) {
    console.error('[themes/suggest]', e instanceof Error ? e.message : e);
    return json({ themes: [] });
  }
};
