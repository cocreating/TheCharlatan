import type { GraphData, Node, NodeType } from './types';
import { selectNextNode } from './walker';
import seedDataRaw from '../data/graph.seed.json';

// Cast JSON to GraphData to ensure types match (especially if JSON import is loose)
const seedData = seedDataRaw as unknown as GraphData;

export interface StoryItem {
  id: string;
  text: string;
  type: NodeType;
}

export class CharlatanState {
  // Raw (non-proxied): d3-force mutates node positions every tick, which must not
  // trigger reactivity. Replace the whole object to load a different graph.
  graph = $state.raw<GraphData>(seedData);
  theme = $state<string | null>(null); // Set when the graph was generated from a theme
  activeNodeId = $state<string | null>(null);
  history = $state.raw<string[]>([]); // List of Node IDs visited
  story = $state.raw<StoryItem[]>([]);

  isPlaying = $state(false);
  transitionSpeed = $state(1.0); // Node Transition Speed Factor (0.5x to 3.0x)
  voiceSpeed = $state(1.0); // Voice Rate Factor (0.5x to 3.0x)

  // TTS
  ttsEnabled = $state(false);
  voiceName = $state<string | null>(null);
  availableVoices = $state.raw<string[]>([]);

  // Glitch
  glitchEnabled = $state(false);
  isGlitching = $state(false);

  // Rebuilt (never mutated) when the graph changes, so a plain Map is enough.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  nodesById = $derived(new Map(this.graph.nodes.map(n => [n.id, n])));
  activeNode = $derived(this.activeNodeId ? this.nodesById.get(this.activeNodeId) ?? null : null);

  constructor(graph: GraphData = seedData) {
    this.graph = graph;
  }

  togglePlay = () => {
    this.isPlaying = !this.isPlaying;
  };

  /** Stop playback and start a new story from a random subject. */
  reset = () => {
    this.isPlaying = false;
    this.start();
  };

  /** Swap in a new graph (e.g. AI-generated) and start an empty story on it. */
  loadGraph = (graph: GraphData, theme: string | null = null) => {
    this.isPlaying = false;
    this.graph = graph;
    this.theme = theme;
    this.activeNodeId = null;
    this.history = [];
    this.story = [];
  };

  restoreSeed = () => this.loadGraph(seedData);

  manualJump = (nodeId: string) => {
    const node = this.nodesById.get(nodeId);
    if (node) this.visit(node);
  };

  // The Tick
  step = () => {
    // If no active node, start one
    if (!this.activeNodeId) {
      this.start();
      return;
    }

    const nextNodeId = selectNextNode(this.activeNodeId, this.graph.links, this.history);
    const nextNode = nextNodeId ? this.nodesById.get(nextNodeId) : undefined;

    if (nextNode) {
      this.visit(nextNode);
    } else {
      // Dead end? Should not happen with constraints.
      console.warn('Dead end reached!');
      this.isPlaying = false;
    }
  };

  // Start a sentence cleanly from a random 'subject' (the graph allows any start).
  private start() {
    const subjects = this.graph.nodes.filter(n => n.type === 'subject');
    const startNode = subjects[Math.floor(Math.random() * subjects.length)] || this.graph.nodes[0];

    this.activeNodeId = startNode.id;
    this.history = [startNode.id];
    this.story = [toStoryItem(startNode)];
  }

  private visit(node: Node) {
    this.activeNodeId = node.id;
    this.history = [...this.history, node.id];
    this.story = [...this.story, toStoryItem(node)];
  }
}

function toStoryItem(node: Node): StoryItem {
  return { id: node.id, text: node.text, type: node.type };
}

export const charlatan = new CharlatanState();
