import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDb } from '$lib/server/db';
import { createRateLimiter } from '$lib/server/rateLimit';
import { insertSession, parseSessionInput } from '$lib/server/sessions';
import type { RequestHandler } from './$types';

const MAX_BODY_BYTES = 32 * 1024;

// A consultation takes ~30 s of speech; this is generous for people and stingy for scripts.
const checkRateLimit = createRateLimiter({ limit: 60, windowMs: 60 * 60 * 1000 });

/** POST { question, answer, steps, seed, vocabularyId } → { id } */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const db = getDb(env);
  if (!db) error(503, 'Sessions are not stored on this server');

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) error(413, 'Session too large');

  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    error(400, 'Malformed session');
  }

  const input = parseSessionInput(body);
  if (typeof input === 'string') error(400, input);

  if (!checkRateLimit(getClientAddress()).allowed) error(429, 'Too many consultations. Rest a while.');

  try {
    return json({ id: await insertSession(db, input) }, { status: 201 });
  } catch (e) {
    console.error('[sessions]', e instanceof Error ? e.message : e);
    error(502, 'The session could not be kept');
  }
};
