
export type NodeType = 'subject' | 'action' | 'space' | 'time' | 'state' | 'object' | 'connector';

export interface Node {
  id: string;
  type: NodeType;
  text: string;
  /** The scene it belongs to (index into `meta.scenes`); none for shared fragments like connectors. */
  scene?: number;
  // d3-force mutable properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  index?: number;
}

export interface Link {
  source: string | Node;
  target: string | Node;
  weight: number;
  rel?: string;
}

/** One option the walker had, with its final probability (after the history penalty). */
export interface DiceCandidate {
  id: string;
  p: number;
}

/** One roll of the dice: the node that came out, what else could have, and the roll. */
export interface DiceStep {
  node: string;
  candidates: DiceCandidate[];
  /** Uniform draw in [0, 1): the chosen candidate is the first whose cumulative p reaches it. */
  roll: number;
}

export interface GraphData {
  meta: {
    version: number;
    seed: number | string;
    /** Scene names, when the vocabulary came in scenes. */
    scenes?: string[];
  };
  nodes: Node[];
  links: Link[];
}
