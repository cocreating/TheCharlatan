import { base } from '$app/paths';
import type { GraphData } from '$lib/engine/types';

export interface ThemedGraph {
  graph: GraphData;
  /** The stored vocabulary behind the graph; null when nothing was stored. */
  vocabularyId: string | null;
}

/**
 * Asks the server for a graph whose vocabulary an AI wrote around `theme`.
 * The server may serve a stored one instead; `cachedOnly` insists on that
 * (used when the theme was picked from the suggestions).
 */
export async function requestThemedGraph(theme: string, cachedOnly = false): Promise<ThemedGraph> {
  const response = await fetch(`${base}/api/vocabulary`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ theme, cachedOnly }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message ?? `The oracle failed (${response.status})`);
  }
  return { graph: body.graph as GraphData, vocabularyId: body.vocabularyId ?? null };
}

export interface ThemeSuggestion {
  key: string;
  theme: string;
}

/** Stored themes that match what the visitor is typing. Never throws. */
export async function fetchThemeSuggestions(q: string, signal?: AbortSignal): Promise<ThemeSuggestion[]> {
  try {
    const response = await fetch(`${base}/api/themes/suggest?q=${encodeURIComponent(q)}`, { signal });
    if (!response.ok) return [];
    const body = await response.json();
    return Array.isArray(body?.themes) ? body.themes : [];
  } catch {
    return [];
  }
}
