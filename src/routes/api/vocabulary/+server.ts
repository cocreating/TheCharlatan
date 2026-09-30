import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { buildGraph } from '$lib/data/buildGraph';
import { validateGraph } from '$lib/engine/validateGraph';
import type { GraphData } from '$lib/engine/types';
import { normalizeTheme } from '$lib/themes';
import { AIProviderError, describeProvider, resolveProvider } from '$lib/server/ai';
import { PROMPT_VERSION } from '$lib/server/ai/prompt';
import { getDb } from '$lib/server/db';
import { createRateLimiter } from '$lib/server/rateLimit';
import { cleanTheme, generateVocabulary, VocabularyError, MAX_THEME_LENGTH } from '$lib/server/vocabulary';
import {
  findVariants,
  nextVariant,
  recordHit,
  saveVariant,
  type CachedVocabulary,
} from '$lib/server/vocabularyCache';
import type { RequestHandler } from './$types';

const HOUR_MS = 60 * 60 * 1000;
const BUILD_ATTEMPTS = 3;
const LANG = 'en';
// With fewer than MAX_VARIANTS stored, how often a request for a known theme writes a new one
const NEW_VARIANT_CHANCE = 0.3;

const checkRateLimit = createRateLimiter({
  limit: Number(env.RATE_LIMIT_PER_HOUR) || 20,
  windowMs: HOUR_MS,
});

const logError = (where: string) => (e: unknown) => {
  console.error(`[vocabulary] ${where}:`, e instanceof Error ? e.message : e);
};

/**
 * POST { theme, cachedOnly? } → { theme, graph, vocabularyId, cached? }
 *
 * Cache first: a theme already stored in Supabase is served without calling the
 * AI (and without counting against the rate limit). While a theme has fewer
 * than MAX_VARIANTS vocabularies, some requests write a new one. `cachedOnly`
 * (a theme picked from the suggestions) never generates when one is stored.
 * If the AI is busy or the visitor is rate-limited, a stored variant is served instead.
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const body = await request.json().catch(() => null);
  const theme = cleanTheme(body?.theme);
  if (!theme) error(400, `Give the charlatan a theme (1-${MAX_THEME_LENGTH} characters)`);
  const cachedOnly = body?.cachedOnly === true;

  const provider = resolveProvider(env);
  const db = getDb(env);
  const key = { themeKey: normalizeTheme(theme), lang: LANG, promptVersion: PROMPT_VERSION };

  const variants: CachedVocabulary[] = db ? await findVariants(db, key).catch(e => (logError('lookup')(e), [])) : [];

  const serveCached = () => {
    const pick = variants[Math.floor(Math.random() * variants.length)];
    if (db) recordHit(db, pick.id).catch(logError('hit'));
    return json({ theme, graph: pick.graph, vocabularyId: pick.id, cached: true });
  };

  const wantsNew =
    provider !== null &&
    !cachedOnly &&
    (variants.length === 0 || (nextVariant(variants) !== null && Math.random() < NEW_VARIANT_CHANCE));

  if (!wantsNew) {
    if (variants.length > 0) return serveCached();
    if (!provider) error(503, 'AI is not configured on this server');
    // cachedOnly, but nothing is stored (e.g. the prompt version changed): generate it
  }

  const limit = checkRateLimit(getClientAddress());
  if (!limit.allowed) {
    if (variants.length > 0) return serveCached();
    return json(
      { message: `Too many summonings. Try again in ${Math.ceil(limit.retryAfter / 60)} min` },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  let graph: GraphData | null = null;
  try {
    const vocabulary = await generateVocabulary(theme, provider!);

    // Link generation is random; retry the rare layout that leaves a node short of links
    for (let attempt = 0; attempt < BUILD_ATTEMPTS && !graph; attempt++) {
      const candidate = buildGraph(vocabulary, theme);
      if (validateGraph(candidate).length === 0) graph = candidate;
    }
  } catch (e) {
    if (variants.length > 0 && (e instanceof AIProviderError || e instanceof VocabularyError)) {
      logError('generate (served a stored variant)')(e);
      return serveCached();
    }
    if (e instanceof VocabularyError) error(502, e.message);
    if (e instanceof AIProviderError) {
      console.error('[vocabulary]', e.message);
      if (e.busy) error(503, 'The oracle is busy. Try again shortly.');
      error(502, e.publicMessage ?? 'The oracle is unreachable right now');
    }
    throw e;
  }

  if (!graph) {
    if (variants.length > 0) return serveCached();
    error(502, 'Could not weave a valid graph from this theme. Try another one.');
  }

  let vocabularyId: string | null = null;
  const variant = nextVariant(variants);
  if (db && variant !== null) {
    const info = describeProvider(env);
    vocabularyId = await saveVariant(db, {
      ...key,
      theme,
      variant,
      provider: info?.provider ?? null,
      model: info?.model ?? null,
      graph,
    }).catch(e => (logError('save')(e), null));
  }

  return json({ theme, graph, vocabularyId });
};
