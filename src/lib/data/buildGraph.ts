import type { GraphData, Link, Node, NodeType } from '../engine/types';
import { CONNECTION_RULES, CONNECTOR_COUNT, ROLES, SCENE_COUNTS, SCENE_TYPES, type SceneType } from '../engine/rules';

/** One scene: a small world inside the theme, with its own fragments of every scene type. */
export type SceneVocabulary = { name: string } & Record<SceneType, string[]>;

/** A vocabulary in scenes; connectors are shared. The shape the AI answers with. */
export interface Vocabulary {
  scenes: SceneVocabulary[];
  connector: string[];
}

export const NODE_TYPES: NodeType[] = [...SCENE_TYPES, 'connector'];

// How often a link stays inside its scene; the rest may bridge to another scene.
const SCENE_LOYALTY = 0.85;
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
 * SCENE_COUNTS per scene and type, CONNECTOR_COUNT connectors) and
 * LINKS_PER_NODE outgoing links per node and role (ROLES), following
 * CONNECTION_RULES and avoiding immediate short loops (A → B → A). Links mostly
 * stay inside their scene (SCENE_LOYALTY); the rest bridge between scenes.
 */
export function buildGraph(vocabulary: Vocabulary, seed: number | string = Date.now()): GraphData {
  const nodes: Node[] = [];
  const links: Link[] = [];

  // 1. Generate Nodes
  let idCounter = 1;
  const addNode = (type: NodeType, text: string, scene?: number) => {
    nodes.push({ id: `n${String(idCounter).padStart(3, '0')}`, type, text, ...(scene === undefined ? {} : { scene }) });
    idCounter++;
  };
  for (const type of SCENE_TYPES) {
    vocabulary.scenes.forEach((scene, i) => {
      for (const text of scene[type].slice(0, SCENE_COUNTS[type])) addNode(type, text, i);
    });
  }
  for (const text of vocabulary.connector.slice(0, CONNECTOR_COUNT)) addNode('connector', text);

  // 2. Generate Links: an object gets a second set, for when it comes back as a subject.
  // A shared node (a connector) gets a set into every scene, so the walk can stay where it is.
  const sceneCount = vocabulary.scenes.length;
  for (const source of nodes) {
    const shared = source.scene === undefined;
    const quota = shared ? LINKS_PER_NODE * Math.max(1, sceneCount) : LINKS_PER_NODE;
    for (const role of ROLES[source.type]) {
      // One pool per type the role allows, taken in turn: every node offers a mix of ways
      // on (e.g. an object to a place) and ways to end the sentence (to a new subject)
      const pools = CONNECTION_RULES[role]
        .map(type => nodes.filter(n => n.type === type && n.id !== source.id))
        .filter(pool => pool.length > 0);
      const first = Math.floor(Math.random() * pools.length);

      const targets = new Set<string>();
      for (let attempt = 0; attempt < MAX_ATTEMPTS && targets.size < quota; attempt++) {
        const pool = pools[(first + attempt) % pools.length] ?? [];
        // Mostly the source's own scene (a shared source takes the scenes in turn); now and then, anywhere
        const scene = shared ? targets.size % Math.max(1, sceneCount) : source.scene;
        const home = pool.filter(n => n.scene === undefined || n.scene === scene);
        const target = getRandomElement(home.length > 0 && Math.random() < SCENE_LOYALTY ? home : pool);
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

  return { meta: { version: 1, seed, scenes: vocabulary.scenes.map(s => s.name) }, nodes, links };
}
