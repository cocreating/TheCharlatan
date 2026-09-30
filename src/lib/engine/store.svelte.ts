import type { DiceStep, GraphData, Node, NodeType } from './types';
import { rollAmong, selectNextStep } from './walker';
import { mulberry32, type Rng } from './random';
import { isAnswerComplete } from '../oracle/answer';
import seedDataRaw from '../data/graph.seed.json';

// Cast JSON to GraphData to ensure types match (especially if JSON import is loose)
const seedData = seedDataRaw as unknown as GraphData;

export interface StoryItem {
  id: string;
  text: string;
  type: NodeType;
}

/**
 * Who is driving the walk:
 * - free: normal playback, anything goes
 * - answering: the oracle is answering; every roll is recorded, the walk is seeded
 * - frozen: the oracle owns the display (question, dice replay); no stepping
 */
export type WalkMode = 'free' | 'answering' | 'frozen';

/** What the graph shows during the dice replay. */
export interface DiceView {
  from: string | null;
  step: DiceStep;
  /** performance.now() when this roll was put on screen (drives the fade). */
  shownAt: number;
}

export class CharlatanState {
  // Raw (non-proxied): d3-force mutates node positions every tick, which must not
  // trigger reactivity. Replace the whole object to load a different graph.
  graph = $state.raw<GraphData>(seedData);
  theme = $state<string | null>(null); // Set when the graph was generated from a theme
  vocabularyId = $state<string | null>(null); // Stored vocabulary behind the graph (null = seed graph)
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

  // Oracle
  mode = $state<WalkMode>('free');
  trace = $state.raw<DiceStep[]>([]); // Every roll of the current answer
  answerDone = $state(false);
  dice = $state.raw<DiceView | null>(null);
  private rng: Rng = Math.random;

  // Rebuilt (never mutated) when the graph changes, so a plain Map is enough.
  // eslint-disable-next-line svelte/prefer-svelte-reactivity
  nodesById = $derived(new Map(this.graph.nodes.map(n => [n.id, n])));
  activeNode = $derived(this.activeNodeId ? this.nodesById.get(this.activeNodeId) ?? null : null);

  constructor(graph: GraphData = seedData) {
    this.graph = graph;
  }

  togglePlay = () => {
    if (this.mode === 'frozen') return;
    this.isPlaying = !this.isPlaying;
  };

  /** Stop playback and start a new story from a random subject. */
  reset = () => {
    if (this.mode !== 'free') return;
    this.isPlaying = false;
    this.start();
  };

  /** Swap in a new graph (e.g. AI-generated) and start an empty story on it. */
  loadGraph = (graph: GraphData, theme: string | null = null, vocabularyId: string | null = null) => {
    if (this.mode !== 'free') return;
    this.isPlaying = false;
    this.graph = graph;
    this.theme = theme;
    this.vocabularyId = vocabularyId;
    this.clearStory();
  };

  restoreSeed = () => this.loadGraph(seedData);

  manualJump = (nodeId: string) => {
    if (this.mode !== 'free') return;
    const node = this.nodesById.get(nodeId);
    if (node) this.visit(node);
  };

  // The Tick
  step = () => {
    if (this.mode === 'frozen') return;
    if (this.mode === 'answering' && this.answerDone) {
      this.isPlaying = false; // The last word has been spoken: the oracle takes over
      return;
    }

    // If no active node, start one
    if (!this.activeNodeId) {
      this.start();
      return;
    }

    const roll = selectNextStep(this.activeNodeId, this.graph.links, this.history, this.rng);
    const nextNode = roll ? this.nodesById.get(roll.node) : undefined;

    if (roll && nextNode) {
      this.visit(nextNode, roll);
    } else {
      // Dead end? Should not happen with constraints.
      console.warn('Dead end reached!');
      // An oracle answer ends here rather than waiting forever for a word that can't come
      if (this.mode === 'answering' && this.trace.length > 0) this.answerDone = true;
      this.isPlaying = false;
    }
  };

  /** Start a seeded, recorded walk on the current graph: the oracle's answer. */
  beginAnswer = (seed: number) => {
    this.isPlaying = false;
    this.mode = 'answering';
    this.rng = mulberry32(seed);
    this.dice = null;
    this.clearStory();
  };

  /** Hand the display to the oracle: no more steps until endOracle(). */
  freeze = () => {
    this.isPlaying = false;
    this.mode = 'frozen';
  };

  /** Show the walk up to `upTo` rolls of the recorded answer, with that roll's dice. */
  showRoll = (upTo: number, now = performance.now()) => {
    const steps = this.trace.slice(0, upTo + 1);
    const nodes = steps.map(s => this.nodesById.get(s.node)).filter((n): n is Node => n !== undefined);
    this.history = nodes.map(n => n.id);
    this.story = nodes.map(toStoryItem);
    this.activeNodeId = this.history.at(-1) ?? null;
    const step = this.trace[upTo];
    this.dice = step ? { from: upTo > 0 ? this.trace[upTo - 1].node : null, step, shownAt: now } : null;
  };

  /** Back to free playback, keeping the answer on screen. */
  endOracle = () => {
    this.isPlaying = false;
    this.mode = 'free';
    this.rng = Math.random;
    this.dice = null;
    this.answerDone = false;
    this.trace = [];
  };

  // Start a sentence cleanly from a random 'subject' (the graph allows any start).
  private start() {
    const subjects = this.graph.nodes.filter(n => n.type === 'subject');
    const pool = subjects.length > 0 ? subjects : this.graph.nodes;
    const roll = rollAmong(pool.map(n => ({ id: n.id, p: 1 / pool.length })), this.rng);
    const startNode = (roll && this.nodesById.get(roll.node)) || this.graph.nodes[0];

    this.clearStory();
    this.visit(startNode, roll ?? undefined);
  }

  private visit(node: Node, roll?: DiceStep) {
    this.activeNodeId = node.id;
    this.history = [...this.history, node.id];
    this.story = [...this.story, toStoryItem(node)];

    if (this.mode === 'answering' && roll) {
      this.trace = [...this.trace, roll];
      this.answerDone = isAnswerComplete(this.story.map(s => s.type));
    }
  }

  private clearStory() {
    this.activeNodeId = null;
    this.history = [];
    this.story = [];
    this.trace = [];
    this.answerDone = false;
  }
}

function toStoryItem(node: Node): StoryItem {
  return { id: node.id, text: node.text, type: node.type };
}

export const charlatan = new CharlatanState();
