import type { DiceCandidate, DiceStep, Link, Node } from './types';
import type { Echo } from './grammar';
import type { Rng } from './random';

// Configuration
const RECENT_HISTORY_PENALTY_WINDOW = 20;
const PENALTY_FACTOR = 0.1; // Multiplier for visited nodes (0.1 means 10x less likely)
const P_DECIMALS = 4; // Precision kept for probabilities and rolls (they get stored)

const endId = (end: string | Node) => (typeof end === 'string' ? end : end.id);
const round = (n: number) => Number(n.toFixed(P_DECIMALS));

/** What the story allows on top of the graph's links. */
export interface WalkRules {
  /** Which link targets fit the sentence so far. When none does, any link will do. */
  fits?: (targetId: string) => boolean;
  /** Nodes offered without a link and without the history penalty (see echoesFor). */
  echoes?: Echo[];
  /** Multiplies a link's weight by how well its target fits where the story is (e.g. its scene). */
  affinity?: (targetId: string) => number;
}

/**
 * The walker's options from `currentNodeId`, each with its final probability:
 * link weight, times PENALTY_FACTOR for every recent visit and the affinity, plus any
 * echoes, normalized.
 */
export function weighNextNodes(
  currentNodeId: string,
  links: Link[],
  history: string[],
  rules: WalkRules = {},
): DiceCandidate[] {
  const recent = history.slice(-RECENT_HISTORY_PENALTY_WINDOW);
  const outgoing = links.filter(l => endId(l.source) === currentNodeId);
  const { fits } = rules;
  const fitting = fits ? outgoing.filter(l => fits(endId(l.target))) : outgoing;

  // A node offered twice (a link and an echo) adds up its weights
  const weights = new Map<string, number>();
  const offer = (id: string, w: number) => weights.set(id, (weights.get(id) ?? 0) + w);

  for (const link of fitting.length > 0 ? fitting : outgoing) {
    const id = endId(link.target);
    const recentVisits = recent.filter(v => v === id).length;
    // weight = base_weight * (PENALTY_FACTOR ^ recentVisits) * affinity
    offer(id, (link.weight || 1) * Math.pow(PENALTY_FACTOR, recentVisits) * (rules.affinity?.(id) ?? 1));
  }
  for (const echo of rules.echoes ?? []) offer(echo.id, echo.weight);

  const total = [...weights.values()].reduce((sum, w) => sum + w, 0);
  // All zero (floats underflowed): treat the options as equally likely
  return [...weights].map(([id, w]) => ({ id, p: total > 0 ? w / total : 1 / weights.size }));
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
  rules: WalkRules = {},
): DiceStep | null {
  return rollAmong(weighNextNodes(currentNodeId, links, history, rules), rng);
}

/** Weighted random choice of the next node id, or null at a dead end. */
export function selectNextNode(
  currentNodeId: string,
  links: Link[],
  history: string[],
  rng: Rng = Math.random,
  rules: WalkRules = {},
): string | null {
  return selectNextStep(currentNodeId, links, history, rng, rules)?.node ?? null;
}
