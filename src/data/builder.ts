
import fs from 'fs';
import path from 'path';
import type { GraphData, Node, Link, NodeType } from '../engine/types';
import { CONNECTION_RULES, NODE_COUNTS } from '../engine/rules';

const VOCABULARY: Record<NodeType, string[]> = {
  subject: [
    "a faceless witness", "the geometric shadow", "an echo of silence", "the machine",
    "a wandering thought", "the observer", "a fragment of light", "the structure",
    "a distant memory", "the algorithm", "a sudden pattern", "the undefined variable",
    "a ghost in the static", "the persistent hum", "an unknown traveler", "the vibration",
    "a point of convergence", "the silent crowd", "an error in the code", "the void"
  ],
  action: [
    "intersects with", "dissolves into", "observes", "reconstructs", "transcends",
    "collides with", "ignites", "erases", "amplifies", "reflects",
    "navigates through", "scans", "distorts", "calculates", "obscures",
    "reveals", "transforms", "encounters", "avoids", "merges with",
    "fragments", "accelerates", "suspends", "questions", "follows",
    "anticipates", "remembers", "forgets", "shatters", "isolates",
    "surrounds", "permeates", "analyzes", "waits for", "signals"
  ],
  space: [
    "in a room without doors", "across the horizon", "within the network", "under the neon sky",
    "through the labyrinth", "in the empty plaza", "beyond the screen", "inside the loop",
    "along the infinite corridor", "in a suspended reality", "between the layers", "at the vanishing point",
    "nowhere", "in the digital ether", "across the grid", "beneath the surface",
    "in a collapsing star", "within the reflection", "near the edge", "in the static"
  ],
  time: [
    "before the dawn", "in a microsecond", "forever", "suddenly", "after the crash",
    "slowly", "in rapid succession", "continuously", "at the final moment", "never",
    "once again", "in the meantime", "historically", "in the future", "simultaneously"
  ],
  state: [
    "luminous", "broken", "silent", "trembling", "stationary",
    "volatile", "perfect", "corrupted", "hollow", "dense",
    "fluid", "frozen", "abstract", "transparent", "heavy",
    "chaotic", "organized", "fading", "vibrant", "obscure",
    "resonant", "infinite", "temporary", "absolute", "uncertain"
  ],
  object: [
    "a mirror", "the key", "a mechanism", "the data", "a barrier",
    "the artifact", "a signal", "the glitch", "a prism", "the relic",
    "a diagram", "the interface", "a window", "the anchor", "a thread",
    "the equation", "a black box", "the lens", "a catalyst", "the archive",
    "a trace", "the map", "a token", "the vessel", "a duplicate"
  ],
  connector: [
    "and yet", "however", "meanwhile", "although", "consequently",
    "furthermore", "nevertheless", "thus", "instead", "otherwise"
  ]
};

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateGraph() {
  const nodes: Node[] = [];
  const links: Link[] = [];

  // 1. Generate Nodes
  let idCounter = 1;
  const categories = Object.keys(NODE_COUNTS) as NodeType[];

  categories.forEach(type => {
    const count = NODE_COUNTS[type];
    const words = VOCABULARY[type];

    // Ensure we have enough words or reuse them randomly if needed,
    // but try to be unique first.
    // For this seed, we have enough words for counts provided (mostly).
    // If not, we cycle.

    for (let i = 0; i < count; i++) {
        // If we run out of unique words, we might need to duplicate or combine
        // (MVP: simple modulo or random if insufficient)
        const text = words[i % words.length];

        // Add a bit of variation if reusing? No, user wants controlled corpus.
        // Let's assume unique IDs make them unique nodes even if text is same,
        // but visualization might be confusing.
        // Let's try to make text unique if possible or accept reuse.
        // With 35 actions and ~35 words, it fits.
        // With 25 spaces and 20 words, some repeat.

        nodes.push({
            id: `n${String(idCounter).padStart(3, '0')}`,
            type,
            text
        });
        idCounter++;
    }
  });

  console.log(`Generated ${nodes.length} nodes.`);

  // 2. Generate Links
  // "Each node must have at least three outgoing links."
  // "Immediate short loops (A → B → A) should be avoided."

  nodes.forEach(source => {
      const allowedTargets = CONNECTION_RULES[source.type];
      const potentialTargets = nodes.filter(n => allowedTargets.includes(n.type) && n.id !== source.id);

      if (potentialTargets.length === 0) {
          console.warn(`Node ${source.id} (${source.type}) has no valid targets!`);
          return;
      }

      // Select 3 distinct targets
      const targets = new Set<string>();
      while (targets.size < 3) {
          const target = getRandomElement(potentialTargets);
          // Simple loop avoidance A->B->A check could be done here if we tracked incoming,
          // but for random generation, just strictly avoiding self is start.
          // Deep cycle detection is harder.
          // User: "Immediate short loops (A -> B -> A) should be avoided."
          // This implies we should check if target has a link to source.

          let isShortLoop = false;
          // Check if target -> source exists already
          // Since we are iterating sequentially, target might not have links yet.
          // But strict pre-check: if (link existing target->source) -> skip.
          const reverseLink = links.find(l =>
             (typeof l.source === 'string' ? l.source : l.source.id) === target.id &&
             (typeof l.target === 'string' ? l.target : l.target.id) === source.id
          );

          if (reverseLink) isShortLoop = true;

          if (!targets.has(target.id) && !isShortLoop) {
              targets.add(target.id);
              links.push({
                  source: source.id,
                  target: target.id,
                  weight: 1, // Default weight
                  rel: `${source.type}->${target.type}`
              });
          } else {
             // Break if impossible to find non-loop?
             // With 150 nodes, probability of forced loop is low, but we can relax if stuck.
             if (targets.size >= potentialTargets.length) break; // formatting
          }
      }
  });

  console.log(`Generated ${links.length} links.`);

  const graphData: GraphData = {
      meta: {
          version: 1,
          seed: Date.now()
      },
      nodes,
      links
  };

  const outputPath = path.resolve(process.cwd(), 'src/data/graph.seed.json');
  fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2));
  console.log(`Graph written to ${outputPath}`);
}

generateGraph();
