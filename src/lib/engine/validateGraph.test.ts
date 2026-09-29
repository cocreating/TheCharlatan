import { expect, it } from 'vitest';
import { validateGraph } from './validateGraph';
import type { GraphData } from './types';
import seed from '../data/graph.seed.json';

it('the seed graph respects the connection rules', () => {
  expect(validateGraph(seed as unknown as GraphData)).toEqual([]);
});

it('reports an empty graph', () => {
  expect(validateGraph({ meta: { version: 1, seed: 0 }, nodes: [], links: [] })).toEqual(['Graph is empty']);
});
