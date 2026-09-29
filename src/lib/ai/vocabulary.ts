import { base } from '$app/paths';
import type { GraphData } from '$lib/engine/types';

/** Asks the server for a graph whose vocabulary Claude wrote around `theme`. */
export async function requestThemedGraph(theme: string): Promise<GraphData> {
  const response = await fetch(`${base}/api/vocabulary`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ theme }),
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.message ?? `The oracle failed (${response.status})`);
  }
  return body.graph as GraphData;
}
