import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDb } from '$lib/server/db';
import { isUuid, recentEchoes } from '$lib/server/sessions';
import type { RequestHandler } from './$types';

/** GET ?exclude=<session id> → { echoes: [{ question, answer, feltMeaning }] }: what others asked. */
export const GET: RequestHandler = async ({ url }) => {
  const db = getDb(env);
  if (!db) return json({ echoes: [] });

  const exclude = url.searchParams.get('exclude');
  try {
    const echoes = await recentEchoes(db, isUuid(exclude) ? exclude : null);
    return json({ echoes }, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    console.error('[sessions]', e instanceof Error ? e.message : e);
    return json({ echoes: [] });
  }
};
