import type { GraphData, Link, Node, NodeType } from '../engine/types';
import { CONNECTION_RULES, NODE_COUNTS, ROLES } from '../engine/rules';

export type Vocabulary = Record<NodeType, string[]>;

export const NODE_TYPES = Object.keys(NODE_COUNTS) as NodeType[];

// "Each node must have at least three outgoing links", for every role it can play.
const LINKS_PER_NODE = 3;
// Random picks per node before giving up on finding enough valid targets.
const MAX_ATTEMPTS = 200;

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const linkId = (end: string | Node) => (typeof end === 'string' ? end : end.id);

/**
 * Builds a random graph from a vocabulary: one node per fragment (up to
 * NODE_COUNTS per type) and LINKS_PER_NODE outgoing links per node and role
 * (ROLES), following CONNECTION_RULES and avoiding immediate short loops (A → B → A).
 */
export function buildGraph(vocabulary: Vocabulary, seed: number | string = Date.now()): GraphData {
  const nodes: Node[] = [];
  const links: Link[] = [];

  // 1. Generate Nodes
  let idCounter = 1;
  for (const type of NODE_TYPES) {
    for (const text of vocabulary[type].slice(0, NODE_COUNTS[type])) {
      nodes.push({ id: `n${String(idCounter).padStart(3, '0')}`, type, text });
      idCounter++;
    }
  }

  // 2. Generate Links: an object gets a second set, for when it comes back as a subject
  for (const source of nodes) {
    for (const role of ROLES[source.type]) {
      // One pool per type the role allows, taken in turn: every node offers a mix of ways
      // on (e.g. an object to a place) and ways to end the sentence (to a new subject)
      const pools = CONNECTION_RULES[role]
        .map(type => nodes.filter(n => n.type === type && n.id !== source.id))
        .filter(pool => pool.length > 0);
      const first = Math.floor(Math.random() * pools.length);

      const targets = new Set<string>();
      for (let attempt = 0; attempt < MAX_ATTEMPTS && targets.size < LINKS_PER_NODE; attempt++) {
        const target = getRandomElement(pools[(first + attempt) % pools.length] ?? []);
        if (!target || targets.has(target.id)) continue;

        // Avoid immediate short loops: skip if target -> source already exists
        const isShortLoop = links.some(l => linkId(l.source) === target.id && linkId(l.target) === source.id);
        if (isShortLoop) continue;

        targets.add(target.id);
        links.push({
          source: source.id,
          target: target.id,
          weight: 1, // Default weight
          rel: `${source.type}->${target.type}`,
        });
      }
    }
  }

  return { meta: { version: 1, seed }, nodes, links };
}
