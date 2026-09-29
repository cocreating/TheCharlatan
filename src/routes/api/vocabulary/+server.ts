import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { buildGraph } from '$lib/data/buildGraph';
import { validateGraph } from '$lib/engine/validateGraph';
import { AIProviderError, resolveProvider } from '$lib/server/ai';
import { createRateLimiter } from '$lib/server/rateLimit';
import { cleanTheme, generateVocabulary, VocabularyError, MAX_THEME_LENGTH } from '$lib/server/vocabulary';
import type { RequestHandler } from './$types';

const HOUR_MS = 60 * 60 * 1000;
const BUILD_ATTEMPTS = 3;

const checkRateLimit = createRateLimiter({
  limit: Number(env.RATE_LIMIT_PER_HOUR) || 20,
  windowMs: HOUR_MS,
});

/** POST { theme } → { theme, graph }: a new graph built from an AI-written vocabulary. */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const provider = resolveProvider(env);
  if (!provider) error(503, 'AI is not configured on this server');

  const body = await request.json().catch(() => null);
  const theme = cleanTheme(body?.theme);
  if (!theme) error(400, `Give the charlatan a theme (1-${MAX_THEME_LENGTH} characters)`);

  const limit = checkRateLimit(getClientAddress());
  if (!limit.allowed) {
    return json(
      { message: `Too many summonings. Try again in ${Math.ceil(limit.retryAfter / 60)} min` },
      { status: 429, headers: { 'retry-after': String(limit.retryAfter) } },
    );
  }

  try {
    const vocabulary = await generateVocabulary(theme, provider);

    // Link generation is random; retry the rare layout that leaves a node short of links
    for (let attempt = 0; attempt < BUILD_ATTEMPTS; attempt++) {
      const graph = buildGraph(vocabulary, theme);
      if (validateGraph(graph).length === 0) return json({ theme, graph });
    }
    error(502, 'Could not weave a valid graph from this theme. Try another one.');
  } catch (e) {
    if (e instanceof VocabularyError) error(502, e.message);
    if (e instanceof AIProviderError) {
      console.error('[vocabulary]', e.message);
      if (e.busy) error(503, 'The oracle is busy. Try again shortly.');
      error(502, e.publicMessage ?? 'The oracle is unreachable right now');
    }
    throw e;
  }
};
