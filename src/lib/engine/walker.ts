import type { Link, Node } from './types';

// Configuration
const RECENT_HISTORY_PENALTY_WINDOW = 20;
const PENALTY_FACTOR = 0.1; // Multiplier for visited nodes (0.1 means 10x less likely)

export function selectNextNode(
  currentNodeId: string,
  links: Link[],
  history: string[]
): string | null {
  // 1. Find outgoing links
  const outgoing = links.filter(l => {
    const srcId = typeof l.source === 'string' ? l.source : (l.source as Node).id;
    return srcId === currentNodeId;
  });

  if (outgoing.length === 0) return null;

  // 2. Calculate dynamic weights
  const candidates = outgoing.map(link => {
    const targetId = typeof link.target === 'string' ? link.target : (link.target as Node).id;

    // Check history for penalization
    const recentVisits = history.slice(-RECENT_HISTORY_PENALTY_WINDOW).filter(id => id === targetId).length;

    // Weight strategy:
    // If visited recently, weight drastically reduced.
    // weight = base_weight * (PENALTY_FACTOR ^ recentVisits)
    let weight = link.weight || 1;
    if (recentVisits > 0) {
      weight = weight * Math.pow(PENALTY_FACTOR, recentVisits);
    }

    return { targetId, weight };
  });

  // 3. Weighted Random Selection
  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) {
      // Fallback: pick random if all zero (shouldn't happen unless floats underflow)
      return candidates[Math.floor(Math.random() * candidates.length)].targetId;
  }

  let random = Math.random() * totalWeight;
  for (const candidate of candidates) {
    random -= candidate.weight;
    if (random <= 0) {
      return candidate.targetId;
    }
  }

  // Fallback (float precision edge case)
  return candidates[candidates.length - 1].targetId;
}
