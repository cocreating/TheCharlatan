import type { SupabaseClient } from '@supabase/supabase-js';
import type { DiceStep } from '$lib/engine/types';

export const MAX_QUESTION_LENGTH = 500;
const MAX_ANSWER_LENGTH = 2000;
const MAX_STEPS = 32;
const MAX_CANDIDATES = 64;
const MAX_ID_LENGTH = 32;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface SessionInput {
  question: string | null;
  answer: string;
  steps: DiceStep[];
  seed: number;
  vocabularyId: string | null;
}

export interface MeaningStats {
  answered: number;
  feltMeaning: number;
  pct: number | null;
}

export const isUuid = (s: unknown): s is string => typeof s === 'string' && UUID.test(s);

const isShortId = (s: unknown): s is string => typeof s === 'string' && s.length > 0 && s.length <= MAX_ID_LENGTH;
const isUnit = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;

function parseStep(raw: unknown): DiceStep | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { node, candidates, roll } = raw as Record<string, unknown>;
  if (!isShortId(node) || !isUnit(roll) || !Array.isArray(candidates) || candidates.length > MAX_CANDIDATES) return null;

  const clean = [];
  for (const c of candidates) {
    if (typeof c !== 'object' || c === null) return null;
    const { id, p } = c as Record<string, unknown>;
    if (!isShortId(id) || !isUnit(p)) return null;
    clean.push({ id, p });
  }
  return { node, candidates: clean, roll };
}

/** Validates a session posted by the browser. Returns an error message or the clean input. */
export function parseSessionInput(body: unknown): SessionInput | string {
  if (typeof body !== 'object' || body === null) return 'Malformed session';
  const b = body as Record<string, unknown>;

  let question: string | null = null;
  if (b.question !== null && b.question !== undefined) {
    if (typeof b.question !== 'string') return 'Malformed question';
    question = b.question.replace(/\s+/g, ' ').trim() || null;
    if (question && question.length > MAX_QUESTION_LENGTH) return `The question is too long (max ${MAX_QUESTION_LENGTH})`;
  }

  if (typeof b.answer !== 'string') return 'Missing answer';
  const answer = b.answer.trim();
  if (!answer || answer.length > MAX_ANSWER_LENGTH) return 'Malformed answer';

  if (!Array.isArray(b.steps) || b.steps.length === 0 || b.steps.length > MAX_STEPS) return 'Malformed steps';
  const steps: DiceStep[] = [];
  for (const raw of b.steps) {
    const step = parseStep(raw);
    if (!step) return 'Malformed steps';
    steps.push(step);
  }

  const seed = b.seed;
  if (typeof seed !== 'number' || !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) return 'Malformed seed';

  let vocabularyId: string | null = null;
  if (b.vocabularyId !== null && b.vocabularyId !== undefined) {
    if (!isUuid(b.vocabularyId)) return 'Malformed vocabulary id';
    vocabularyId = b.vocabularyId;
  }

  return { question, answer, steps, seed, vocabularyId };
}

/** Stores one consultation; returns its id. No IP or anything identifying is kept. */
export async function insertSession(db: SupabaseClient, s: SessionInput, lang = 'en'): Promise<string> {
  const { data, error } = await db
    .from('charlatan_sessions')
    .insert({
      question: s.question,
      answer: s.answer,
      steps: s.steps,
      seed: s.seed,
      vocabulary_id: s.vocabularyId,
      lang,
    })
    .select('id')
    .single();
  if (error) throw new Error(`insertSession: ${error.message}`);
  return (data as { id: string }).id;
}

/** Records "Did it speak to you?". Only the first answer counts. Returns false if nothing changed. */
export async function recordMeaning(db: SupabaseClient, id: string, felt: boolean): Promise<boolean> {
  const { data, error } = await db
    .from('charlatan_sessions')
    .update({ felt_meaning: felt })
    .eq('id', id)
    .is('felt_meaning', null)
    .select('id');
  if (error) throw new Error(`recordMeaning: ${error.message}`);
  return (data ?? []).length > 0;
}

export async function meaningStats(db: SupabaseClient): Promise<MeaningStats> {
  const { data, error } = await db.rpc('charlatan_meaning_stats');
  if (error) throw new Error(`meaningStats: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | undefined;
  return {
    answered: Number(row?.answered ?? 0),
    feltMeaning: Number(row?.felt_meaning ?? 0),
    pct: row?.pct === null || row?.pct === undefined ? null : Number(row.pct),
  };
}

/** Another visitor's consultation, as shown after the reveal: nothing but the words. */
export interface Echo {
  question: string;
  answer: string;
  feltMeaning: boolean;
}

const ECHO_POOL = 30; // Picked at random from this many of the latest

/**
 * A few other questions people asked, with the answer each got and whether it spoke to them.
 * Only sessions that kept their question, got a reaction and are listed (not hidden by moderation).
 */
export async function recentEchoes(db: SupabaseClient, exclude: string | null, count = 3): Promise<Echo[]> {
  let query = db
    .from('charlatan_sessions')
    .select('question, answer, felt_meaning')
    .eq('listed', true)
    .not('question', 'is', null)
    .not('felt_meaning', 'is', null)
    .order('created_at', { ascending: false })
    .limit(ECHO_POOL);
  if (exclude) query = query.neq('id', exclude);

  const { data, error } = await query;
  if (error) throw new Error(`recentEchoes: ${error.message}`);
  const pool = (data ?? []) as { question: string; answer: string; felt_meaning: boolean }[];
  return shuffle(pool)
    .slice(0, count)
    .map(r => ({ question: r.question, answer: r.answer, feltMeaning: r.felt_meaning }));
}

function shuffle<T>(items: T[], rng = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
