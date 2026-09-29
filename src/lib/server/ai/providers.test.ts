import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveProvider } from './index';
import { geminiProvider } from './gemini';
import { openAICompatibleProvider } from './openaiCompatible';
import { AIProviderError, parseJson } from './types';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
afterEach(() => fetchMock.mockReset());

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('resolveProvider', () => {
  it('returns null when nothing is configured', () => {
    expect(resolveProvider({})).toBeNull();
  });

  it('picks the first configured provider, or the one AI_PROVIDER names', () => {
    const env = { GEMINI_API_KEY: 'g', ANTHROPIC_API_KEY: 'a' };
    expect(resolveProvider(env)).not.toBeNull();
    expect(resolveProvider({ ...env, AI_PROVIDER: 'openai' })).toBeNull(); // openai needs base URL + model
    expect(
      resolveProvider({ AI_PROVIDER: 'openai', OPENAI_API_KEY: 'o', OPENAI_BASE_URL: 'https://x/v1', OPENAI_MODEL: 'm' }),
    ).not.toBeNull();
  });
});

describe('geminiProvider', () => {
  it('sends a structured-output request and parses the JSON answer', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"subject":["a ghost"]}' }] } }] }),
    );
    await expect(geminiProvider('KEY', 'gemini-test')('noir')).resolves.toEqual({ subject: ['a ghost'] });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    expect(init.headers['x-goog-api-key']).toBe('KEY');
    const body = JSON.parse(init.body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema.required).toContain('connector');
    expect(body.contents[0].parts[0].text).toBe('Theme: noir');
  });

  it('flags quota errors as busy and blocked prompts with a public message', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: { message: 'quota' } }, 429));
    await expect(geminiProvider('KEY')('x')).rejects.toMatchObject({ busy: true });

    fetchMock.mockResolvedValueOnce(jsonResponse({ promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(geminiProvider('KEY')('x')).rejects.toMatchObject({ publicMessage: expect.any(String) });

    fetchMock.mockResolvedValueOnce(jsonResponse({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [] } }] }));
    await expect(geminiProvider('KEY')('x')).rejects.toBeInstanceOf(AIProviderError);
  });
});

describe('openAICompatibleProvider', () => {
  it('calls chat/completions in JSON mode', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ choices: [{ finish_reason: 'stop', message: { content: '{"time":["never"]}' } }] }));
    await expect(openAICompatibleProvider('https://api.groq.com/openai/v1/', 'K', 'llama')('x')).resolves.toEqual({ time: ['never'] });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions');
    expect(init.headers.authorization).toBe('Bearer K');
    expect(JSON.parse(init.body)).toMatchObject({ model: 'llama', response_format: { type: 'json_object' } });
  });
});

describe('parseJson', () => {
  it('accepts JSON wrapped in a markdown fence', () => {
    expect(parseJson('```json\n{"a":1}\n```', 't')).toEqual({ a: 1 });
  });

  it('rejects empty or invalid text', () => {
    expect(() => parseJson('', 't')).toThrow(AIProviderError);
    expect(() => parseJson('nope', 't')).toThrow(AIProviderError);
  });
});
