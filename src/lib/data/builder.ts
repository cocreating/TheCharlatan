
// Regenerates graph.seed.json from the built-in vocabulary.
import fs from 'fs';
import path from 'path';
import { buildGraph, type Vocabulary } from './buildGraph';

const VOCABULARY: Vocabulary = {
  scenes: [
    {
      name: "the machine",
      subject: ["the machine", "the algorithm", "an error in the code", "the undefined variable", "the persistent hum"],
      action: ["calculates", "scans", "analyzes", "reconstructs", "isolates", "erases", "signals", "accelerates"],
      object: ["the data", "a mechanism", "the interface", "a black box", "the glitch", "the equation"],
      state: ["becomes corrupted", "falls into order", "grows dense", "sounds hollow", "freezes", "flickers"],
      space: ["within the network", "inside the loop", "across the grid", "in the digital ether", "beyond the screen", "in the static"],
      time: ["in a microsecond", "after the crash", "again and again", "all at once"]
    },
    {
      name: "the hall of mirrors",
      subject: ["the geometric shadow", "a fragment of light", "the observer", "a faceless witness", "a sudden pattern"],
      action: ["reflects", "distorts", "reveals", "obscures", "observes", "fragments", "amplifies", "shatters"],
      object: ["a mirror", "a prism", "the lens", "a window", "a trace", "a duplicate"],
      state: ["grows luminous", "becomes transparent", "burns bright", "grows obscure", "breaks apart", "looks perfect"],
      space: ["within the reflection", "at the vanishing point", "in a room without doors", "between the layers", "near the edge", "beneath the surface"],
      time: ["before the dawn", "slowly", "at the final moment", "once again"]
    },
    {
      name: "the drowned archive",
      subject: ["a distant memory", "a ghost in the static", "an echo of silence", "the silent crowd", "a wandering thought"],
      action: ["remembers", "forgets", "waits for", "follows", "questions", "anticipates", "surrounds", "avoids"],
      object: ["the archive", "the relic", "a thread", "the key", "the map", "a token"],
      state: ["fades away", "falls silent", "holds its breath", "hesitates", "keeps trembling", "never ends"],
      space: ["along the infinite corridor", "through the labyrinth", "in the empty plaza", "in the middle of nowhere", "in a suspended reality", "under the neon sky"],
      time: ["long ago", "every night", "at midnight", "forever"]
    },
    {
      name: "the edge of the void",
      subject: ["the void", "an unknown traveler", "the vibration", "a point of convergence", "the structure"],
      action: ["dissolves into", "collides with", "transcends", "navigates through", "merges with", "permeates", "ignites", "suspends"],
      object: ["the vessel", "the anchor", "a barrier", "a signal", "a catalyst", "the artifact"],
      state: ["resonates", "wavers", "stands still", "turns fluid", "turns volatile", "descends into chaos"],
      space: ["across the horizon", "in a collapsing star", "among the dead stars", "in the dark between worlds", "on the event horizon", "in a falling sky"],
      time: ["in the future", "suddenly", "at last", "before the stars burn out"]
    }
  ],
  connector: [
    "and yet", "however", "meanwhile", "then", "still",
    "later", "nevertheless", "so", "instead", "elsewhere"
  ]
};

const graphData = buildGraph(VOCABULARY);
console.log(`Generated ${graphData.nodes.length} nodes and ${graphData.links.length} links.`);

const outputPath = path.resolve(process.cwd(), 'src/lib/data/graph.seed.json');
fs.writeFileSync(outputPath, JSON.stringify(graphData, null, 2));
console.log(`Graph written to ${outputPath}`);
