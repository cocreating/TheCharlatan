import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NODE_TYPES } from '$lib/data/buildGraph';
import { AIProviderError } from '$lib/server/ai/types';

const env = vi.hoisted(() => ({ GEMINI_API_KEY: 'test-key', RATE_LIMIT_PER_HOUR: '2' }) as Record<string, string | undefined>);
vi.mock('$env/dynamic/private', () => ({ env }));

const provider = vi.hoisted(() => vi.fn());
vi.mock('$lib/server/ai', async importOriginal => ({
  ...(await importOriginal<typeof import('$lib/server/ai')>()),
  resolveProvider: (e: Record<string, string | undefined>) => (e.GEMINI_API_KEY ? provider : null),
}));

const { POST } = await import('./+server');

const vocabulary = Object.fromEntries(NODE_TYPES.map(t => [t, Array.from({ length: 10 }, (_, i) => `${t} ${i}`)]));

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
  });

  it('returns a valid themed graph', async () => {
    const res = await call({ theme: '  noir rain ' }, 'ok');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.theme).toBe('noir rain');
    expect(body.graph.nodes.length).toBe(70);
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
