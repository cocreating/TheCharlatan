import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDb } from '$lib/server/db';
import { isUuid, meaningStats, recordMeaning } from '$lib/server/sessions';
import type { RequestHandler } from './$types';

/** PATCH { feltMeaning } → { answered, feltMeaning, pct }: "Did it speak to you?" and the running number. */
export const PATCH: RequestHandler = async ({ params, request }) => {
  const db = getDb(env);
  if (!db) error(503, 'Sessions are not stored on this server');
  if (!isUuid(params.id)) error(404, 'No such session');

  const body = await request.json().catch(() => null);
  if (typeof body?.feltMeaning !== 'boolean') error(400, 'feltMeaning must be true or false');

  try {
    // Only the first answer per session counts; a repeat just gets the numbers back.
    await recordMeaning(db, params.id, body.feltMeaning);
    return json(await meaningStats(db));
  } catch (e) {
    console.error('[sessions]', e instanceof Error ? e.message : e);
    error(502, 'The answer could not be kept');
  }
};
