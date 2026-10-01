import { base } from '$app/paths';
import type { DiceStep } from '$lib/engine/types';

export interface MeaningStats {
  answered: number;
  feltMeaning: number;
  pct: number | null;
}

export interface SessionPayload {
  question: string | null;
  answer: string;
  steps: DiceStep[];
  seed: number;
  vocabularyId: string | null;
}

/** Keeps the consultation; resolves to its id, or null if the server doesn't store sessions. */
export async function postSession(payload: SessionPayload): Promise<string | null> {
  try {
    const response = await fetch(`${base}/api/sessions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return null;
    return (await response.json())?.id ?? null;
  } catch {
    return null;
  }
}

/** Records "Did it speak to you?"; resolves to the running numbers, or null. */
export async function sendMeaning(sessionId: string, feltMeaning: boolean): Promise<MeaningStats | null> {
  try {
    const response = await fetch(`${base}/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feltMeaning }),
    });
    if (!response.ok) return null;
    return (await response.json()) as MeaningStats;
  } catch {
    return null;
  }
}

export interface Echo {
  question: string;
  answer: string;
  feltMeaning: boolean;
}

/** A few questions other visitors asked, with their answers; [] when there are none or on error. */
export async function fetchEchoes(excludeSessionId: string | null): Promise<Echo[]> {
  try {
    const query = excludeSessionId ? `?exclude=${encodeURIComponent(excludeSessionId)}` : '';
    const response = await fetch(`${base}/api/sessions/echoes${query}`);
    if (!response.ok) return [];
    const body = await response.json();
    return Array.isArray(body?.echoes) ? (body.echoes as Echo[]) : [];
  } catch {
    return [];
  }
}
