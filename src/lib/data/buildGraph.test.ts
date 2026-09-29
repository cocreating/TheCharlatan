import { expect, it } from 'vitest';
import { buildGraph, NODE_TYPES, type Vocabulary } from './buildGraph';
import { validateGraph } from '../engine/validateGraph';
import { NODE_COUNTS } from '../engine/rules';

const vocabulary = (size: number) =>
  Object.fromEntries(NODE_TYPES.map(t => [t, Array.from({ length: size }, (_, i) => `${t} ${i}`)])) as Vocabulary;

it('builds a valid graph with one node per fragment, capped by NODE_COUNTS', () => {
  const graph = buildGraph(vocabulary(40), 'test');
  expect(validateGraph(graph)).toEqual([]);
  for (const type of NODE_TYPES) {
    expect(graph.nodes.filter(n => n.type === type)).toHaveLength(Math.min(40, NODE_COUNTS[type]));
  }
  expect(new Set(graph.nodes.map(n => n.text)).size).toBe(graph.nodes.length);
  expect(graph.meta.seed).toBe('test');
});

it('stays valid with a small vocabulary', () => {
  for (let i = 0; i < 20; i++) {
    expect(validateGraph(buildGraph(vocabulary(5)))).toEqual([]);
  }
});
