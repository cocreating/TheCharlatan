import { expect, it } from 'vitest';
import { buildGraph, type Vocabulary } from './buildGraph';
import { validateGraph } from '../engine/validateGraph';
import { CONNECTOR_COUNT, SCENE_COUNTS, SCENE_TYPES } from '../engine/rules';

const vocabulary = (size: number, scenes = 4): Vocabulary => ({
  scenes: Array.from({ length: scenes }, (_, s) => ({
    name: `scene ${s}`,
    ...Object.fromEntries(SCENE_TYPES.map(t => [t, Array.from({ length: size }, (_, i) => `${t} ${s}.${i}`)])),
  })) as Vocabulary['scenes'],
  connector: Array.from({ length: size }, (_, i) => `connector ${i}`),
});

it('builds a valid graph with one node per fragment, capped per scene', () => {
  const graph = buildGraph(vocabulary(40), 'test');
  expect(validateGraph(graph)).toEqual([]);
  for (const type of SCENE_TYPES) {
    for (let s = 0; s < 4; s++) {
      expect(graph.nodes.filter(n => n.type === type && n.scene === s)).toHaveLength(SCENE_COUNTS[type]);
    }
  }
  const connectors = graph.nodes.filter(n => n.type === 'connector');
  expect(connectors).toHaveLength(CONNECTOR_COUNT);
  expect(connectors.every(n => n.scene === undefined)).toBe(true);
  expect(new Set(graph.nodes.map(n => n.text)).size).toBe(graph.nodes.length);
  expect(graph.meta).toMatchObject({ seed: 'test', scenes: ['scene 0', 'scene 1', 'scene 2', 'scene 3'] });
});

it('keeps most links inside their scene', () => {
  const graph = buildGraph(vocabulary(40));
  const scene = new Map(graph.nodes.map(n => [n.id, n.scene]));
  const between = graph.links.filter(l => scene.get(l.source as string) !== undefined && scene.get(l.target as string) !== undefined);
  const inside = between.filter(l => scene.get(l.source as string) === scene.get(l.target as string));
  expect(inside.length / between.length).toBeGreaterThan(0.75);
  expect(inside.length).toBeLessThan(between.length); // ...but some bridge between scenes
});

it('links every connector into every scene', () => {
  const graph = buildGraph(vocabulary(40));
  const scene = new Map(graph.nodes.map(n => [n.id, n.scene]));
  for (const connector of graph.nodes.filter(n => n.type === 'connector')) {
    const reached = new Set(graph.links.filter(l => l.source === connector.id).map(l => scene.get(l.target as string)));
    expect(reached.size, connector.text).toBe(4);
  }
});

it('stays valid with a small vocabulary', () => {
  for (let i = 0; i < 20; i++) {
    expect(validateGraph(buildGraph(vocabulary(2, 3)))).toEqual([]);
  }
});
