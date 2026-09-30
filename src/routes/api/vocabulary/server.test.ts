import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SCENE_TYPES } from '$lib/engine/rules';
import { AIProviderError } from '$lib/server/ai/types';

const env = vi.hoisted(() => ({ GEMINI_API_KEY: 'test-key', RATE_LIMIT_PER_HOUR: '2' }) as Record<string, string | undefined>);
vi.mock('$env/dynamic/private', () => ({ env }));

const provider = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/ai', async importOriginal => ({
  ...(await importOriginal<typeof import('$lib/server/ai')>()),
  resolveProvider: (e: Record<string, string | undefined>) => (e.GEMINI_API_KEY ? provider : null),
}));

// Supabase: off unless a test turns it on; the cache functions are mocked, nextVariant stays real
const db = vi.hoisted(() => ({ on: false }));
vi.mock('$lib/server/db', () => ({ getDb: () => (db.on ? {} : null) }));

const cache = vi.hoisted(() => ({ findVariants: vi.fn(), recordHit: vi.fn(), saveVariant: vi.fn() }));
vi.mock('$lib/server/vocabularyCache', async importOriginal => ({
  ...(await importOriginal<typeof import('$lib/server/vocabularyCache')>()),
  ...cache,
}));

const { POST } = await import('./+server');

const ten = (prefix: string) => Array.from({ length: 10 }, (_, i) => `${prefix} ${i}`);
const vocabulary = {
  scenes: [0, 1, 2, 3].map(s => ({ name: `scene ${s}`, ...Object.fromEntries(SCENE_TYPES.map(t => [t, ten(`${t} ${s}`)])) })),
  connector: ten('connector'),
};

async function call(body: unknown, ip = '10.0.0.1') {
  const request = new Request('http://localhost/api/vocabulary', { method: 'POST', body: JSON.stringify(body) });
  const event = { request, getClientAddress: () => ip } as unknown as Parameters<typeof POST>[0];
  try {
    return await POST(event);
  } catch (e) {
    // SvelteKit's error() throws an HttpError { status, body }
    const { status, body: errBody } = e as { status: number; body: unknown };
    return new Response(JSON.stringify(errBody), { status });
  }
}

describe('POST /api/vocabulary', () => {
  beforeEach(() => {
    provider.mockReset().mockResolvedValue(vocabulary);
    env.GEMINI_API_KEY = 'test-key';
    db.on = false;
  });

  it('returns a valid themed graph', async () => {
    const res = await call({ theme: '  noir rain ' }, 'ok');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.theme).toBe('noir rain');
    expect(body.graph.nodes.length).toBe(150); // 4 scenes of 35 (capped per type) + 10 connectors
    expect(body.graph.meta.scenes).toHaveLength(4);
    expect(provider).toHaveBeenCalledWith('noir rain');
  });

  it('rejects a missing theme without calling the provider', async () => {
    expect((await call({}, 'bad')).status).toBe(400);
    expect(provider).not.toHaveBeenCalled();
  });

  it('answers 503 when no provider is configured', async () => {
    env.GEMINI_API_KEY = undefined;
    expect((await call({ theme: 'x' }, 'nokey')).status).toBe(503);
  });

  it('maps provider quota errors to 503 and refusals to their public message', async () => {
    provider.mockRejectedValueOnce(new AIProviderError('gemini 429', true));
    expect((await call({ theme: 'x' }, 'quota')).status).toBe(503);

    provider.mockRejectedValueOnce(new AIProviderError('blocked', false, 'The charlatan refuses this theme.'));
    const refused = await call({ theme: 'x' }, 'refused');
    expect(refused.status).toBe(502);
    expect((await refused.json()).message).toBe('The charlatan refuses this theme.');
  });

  it('rate-limits per client address', async () => {
    expect((await call({ theme: 'a' }, 'busy')).status).toBe(200);
    expect((await call({ theme: 'b' }, 'busy')).status).toBe(200);
    const limited = await call({ theme: 'c' }, 'busy');
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0);
    expect(provider).toHaveBeenCalledTimes(2);
  });
});

describe('POST /api/vocabulary with the Supabase cache', () => {
  const stored = (variant: number) => ({
    id: `00000000-0000-4000-8000-00000000000${variant}`,
    variant,
    theme: 'Noir Rain',
    graph: { meta: { stored: variant }, nodes: [], links: [] },
  });

  beforeEach(() => {
    provider.mockReset().mockResolvedValue(vocabulary);
    env.GEMINI_API_KEY = 'test-key';
    db.on = true;
    cache.findVariants.mockReset().mockResolvedValue([]);
    cache.recordHit.mockReset().mockResolvedValue(undefined);
    cache.saveVariant.mockReset().mockResolvedValue('00000000-0000-4000-8000-0000000000aa');
  });

  // The endpoint's first Math.random() decides whether a known theme gets a new variant;
  // later calls (picking a variant, buildGraph) stay random
  const newVariantRoll = (wins: boolean) => vi.spyOn(Math, 'random').mockReturnValueOnce(wins ? 0.1 : 0.99);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('looks up the normalized theme and serves a stored variant without the AI', async () => {
    newVariantRoll(false);
    cache.findVariants.mockResolvedValue([stored(1)]);
    const res = await call({ theme: '  NOIR  rain ' }, 'hit');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ vocabularyId: stored(1).id, graph: stored(1).graph, cached: true });
    expect(cache.findVariants).toHaveBeenCalledWith({}, expect.objectContaining({ themeKey: 'noir rain', lang: 'en' }));
    expect(cache.recordHit).toHaveBeenCalledWith({}, stored(1).id);
    expect(provider).not.toHaveBeenCalled();
  });

  it('serves stored themes even without an AI key', async () => {
    env.GEMINI_API_KEY = undefined;
    newVariantRoll(true);
    cache.findVariants.mockResolvedValue([stored(1)]);
    expect((await call({ theme: 'noir rain' }, 'nokey-hit')).status).toBe(200);
  });

  it('sometimes writes a new variant while the theme has room', async () => {
    newVariantRoll(true);
    cache.findVariants.mockResolvedValue([stored(1)]);
    const res = await call({ theme: 'noir rain' }, 'grow');
    expect(await res.json()).toMatchObject({ vocabularyId: '00000000-0000-4000-8000-0000000000aa' });
    expect(provider).toHaveBeenCalledOnce();
    expect(cache.saveVariant).toHaveBeenCalledWith({}, expect.objectContaining({ themeKey: 'noir rain', variant: 2 }));
  });

  it('never generates for a full theme', async () => {
    newVariantRoll(true);
    cache.findVariants.mockResolvedValue([stored(1), stored(2), stored(3)]);
    expect((await call({ theme: 'noir rain' }, 'full')).status).toBe(200);
    expect(provider).not.toHaveBeenCalled();
  });

  it('cachedOnly never generates when something is stored', async () => {
    newVariantRoll(true);
    cache.findVariants.mockResolvedValue([stored(1)]);
    expect(await (await call({ theme: 'noir rain', cachedOnly: true }, 'picked')).json()).toMatchObject({ cached: true });
    expect(provider).not.toHaveBeenCalled();
  });

  it('generates and saves variant 1 for a new theme', async () => {
    const res = await call({ theme: 'Noir Rain' }, 'new');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ theme: 'Noir Rain', vocabularyId: '00000000-0000-4000-8000-0000000000aa' });
    expect(cache.saveVariant).toHaveBeenCalledWith(
      {},
      expect.objectContaining({ themeKey: 'noir rain', theme: 'Noir Rain', variant: 1, provider: 'gemini' }),
    );
  });

  it('still answers when saving fails', async () => {
    cache.saveVariant.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await call({ theme: 'noir rain' }, 'savefail');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ vocabularyId: null });
  });

  it('falls back to a stored variant when the AI is busy', async () => {
    newVariantRoll(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    cache.findVariants.mockResolvedValue([stored(1)]);
    provider.mockRejectedValueOnce(new AIProviderError('gemini 503', true));
    const res = await call({ theme: 'noir rain' }, 'aibusy');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ vocabularyId: stored(1).id, cached: true });
  });

  it('falls back to a stored variant when rate-limited, without calling the AI', async () => {
    expect((await call({ theme: 'a' }, 'limited')).status).toBe(200);
    expect((await call({ theme: 'b' }, 'limited')).status).toBe(200);
    provider.mockClear();

    newVariantRoll(true);
    cache.findVariants.mockResolvedValue([stored(1)]);
    const res = await call({ theme: 'noir rain' }, 'limited');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ cached: true });
    expect(provider).not.toHaveBeenCalled();
  });

  it('works as before when the lookup fails', async () => {
    cache.findVariants.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await call({ theme: 'noir rain' }, 'lookupfail')).status).toBe(200);
    expect(provider).toHaveBeenCalledOnce();
  });
});
