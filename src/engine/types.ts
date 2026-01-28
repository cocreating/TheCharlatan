
export type NodeType = 'subject' | 'action' | 'space' | 'time' | 'state' | 'object' | 'connector';

export interface Node {
  id: string;
  type: NodeType;
  text: string;
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

export interface GraphData {
  meta: {
    version: number;
    seed: number | string;
  };
  nodes: Node[];
  links: Link[];
}
