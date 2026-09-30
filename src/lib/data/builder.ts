
// Regenerates graph.seed.json from the built-in vocabulary.
import fs from 'fs';
import path from 'path';
import { buildGraph, type Vocabulary } from './buildGraph';

const VOCABULARY: Vocabulary = {
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
    "in the middle of nowhere", "in the digital ether", "across the grid", "beneath the surface",
    "in a collapsing star", "within the reflection", "near the edge", "in the static"
  ],
  time: [
    "before the dawn", "in a microsecond", "forever", "suddenly", "after the crash",
    "slowly", "again and again", "at midnight", "at the final moment", "at last",
    "once again", "every night", "long ago", "in the future", "all at once"
  ],
  state: [
    "grows luminous", "breaks apart", "falls silent", "keeps trembling", "stands still",
    "turns volatile", "looks perfect", "becomes corrupted", "sounds hollow", "grows dense",
    "turns fluid", "freezes", "flickers", "becomes transparent", "grows heavy",
    "descends into chaos", "falls into order", "fades away", "burns bright", "grows obscure",
    "resonates", "never ends", "holds its breath", "hesitates", "wavers"
  ],
  object: [
    "a mirror", "the key", "a mechanism", "the data", "a barrier",
    "the artifact", "a signal", "the glitch", "a prism", "the relic",
    "a diagram", "the interface", "a window", "the anchor", "a thread",
    "the equation", "a black box", "the lens", "a catalyst", "the archive",
    "a trace", "the map", "a token", "the vessel", "a duplicate"
  ],
  connector: [
    "and yet", "however", "meanwhile", "then", "consequently",
    "later", "nevertheless", "so", "instead", "elsewhere"
  ]
};

const graphData = buildGraph(VOCABULARY);
console.log(`Generated ${graphData.nodes.length} nodes and ${graphData.links.length} links.`);

const outputPath = path.resolve(process.cwd(), 'src/lib/data/graph.seed.json');
fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2));
console.log(`Graph written to ${outputPath}`);
