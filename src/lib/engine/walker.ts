import type { DiceCandidate, DiceStep, Link, Node } from './types';
import type { Rng } from './random';

// Configuration
const RECENT_HISTORY_PENALTY_WINDOW = 20;
const PENALTY_FACTOR = 0.1; // Multiplier for visited nodes (0.1 means 10x less likely)
const P_DECIMALS = 4; // Precision kept for probabilities and rolls (they get stored)

const endId = (end: string | Node) => (typeof end === 'string' ? end : end.id);
const round = (n: number) => Number(n.toFixed(P_DECIMALS));

/**
 * The walker's options from `currentNodeId`, each with its final probability:
 * link weight, times PENALTY_FACTOR for every recent visit, normalized.
 */
export function weighNextNodes(currentNodeId: string, links: Link[], history: string[]): DiceCandidate[] {
  const recent = history.slice(-RECENT_HISTORY_PENALTY_WINDOW);

  const weighted = links
    .filter(l => endId(l.source) === currentNodeId)
    .map(link => {
      const id = endId(link.target);
      const recentVisits = recent.filter(v => v === id).length;
      // weight = base_weight * (PENALTY_FACTOR ^ recentVisits)
      return { id, w: (link.weight || 1) * Math.pow(PENALTY_FACTOR, recentVisits) };
    });

  const total = weighted.reduce((sum, c) => sum + c.w, 0);
  // All zero (floats underflowed): treat the options as equally likely
  return weighted.map(c => ({ id: c.id, p: total > 0 ? c.w / total : 1 / weighted.length }));
}

/**
 * Rolls once among `candidates` (probabilities summing to 1). Returns the full
 * record of the roll, or null when there is nothing to choose from.
 */
export function rollAmong(candidates: DiceCandidate[], rng: Rng = Math.random): DiceStep | null {
  if (candidates.length === 0) return null;

  const roll = rng();
  let chosen = candidates[candidates.length - 1]; // Fallback (float precision edge case)
  let cumulative = 0;
  for (const candidate of candidates) {
    cumulative += candidate.p;
    if (roll < cumulative) {
      chosen = candidate;
      break;
    }
  }

  return {
    node: chosen.id,
    candidates: candidates.map(c => ({ id: c.id, p: round(c.p) })),
    roll: round(roll),
  };
}

/** Picks the next node and reports every option it had and the roll that decided it. */
export function selectNextStep(
  currentNodeId: string,
  links: Link[],
  history: string[],
  rng: Rng = Math.random,
): DiceStep | null {
  return rollAmong(weighNextNodes(currentNodeId, links, history), rng);
}

/** Weighted random choice of the next node id, or null at a dead end. */
export function selectNextNode(
  currentNodeId: string,
  links: Link[],
  history: string[],
  rng: Rng = Math.random,
): string | null {
  return selectNextStep(currentNodeId, links, history, rng)?.node ?? null;
}
