import { expect, it } from 'vitest';
import { validateGraph } from './validateGraph';
import type { GraphData, Link, Node } from './types';
import seed from '../data/graph.seed.json';

it('the seed graph respects the connection rules', () => {
  expect(validateGraph(seed as unknown as GraphData)).toEqual([]);
});

it('reports an empty graph', () => {
  expect(validateGraph({ meta: { version: 1, seed: 0 }, nodes: [], links: [] })).toEqual(['Graph is empty']);
});

const node = (id: string, type: Node['type']): Node => ({ id, type, text: id });
const fan = (source: string, targets: string[]): Link[] => targets.map(target => ({ source, target, weight: 1 }));

it('wants an object to go on both as an object and as a subject come back', () => {
  const nodes = [
    node('o', 'object'),
    ...['s1', 's2', 's3'].map(id => node(id, 'subject')),
    ...['a1', 'a2', 'a3'].map(id => node(id, 'action')),
  ];
  const asObject = fan('o', ['s1', 's2', 's3']);
  const asSubject = fan('o', ['a1', 'a2', 'a3']);
  const errors = (links: Link[]) =>
    validateGraph({ meta: { version: 1, seed: 0 }, nodes, links }).filter(e => e.startsWith('Node o '));

  expect(errors([...asObject, ...asSubject])).toEqual([]);
  expect(errors(asObject)).toEqual(['Node o (o) has only 0 outgoing links as subject (min 3)']);
  expect(errors(asSubject)).toEqual(['Node o (o) has only 0 outgoing links as object (min 3)']);
});

it('reports links the grammar never takes', () => {
  const graph: GraphData = {
    meta: { version: 1, seed: 0 },
    nodes: [node('c', 'connector'), node('t', 'time')],
    links: fan('c', ['t']),
  };
  expect(validateGraph(graph)).toContain('Invalid semantic link: connector -> time (Node c to t)');
});
