import { describe, expect, it } from 'vitest';
import { CharlatanState } from './store.svelte';

describe('CharlatanState', () => {
  it('the first step starts a story from a subject without stopping playback', () => {
    const s = new CharlatanState();
    s.isPlaying = true;
    s.step();
    expect(s.isPlaying).toBe(true);
    expect(s.activeNode?.type).toBe('subject');
    expect(s.history).toHaveLength(1);
  });

  it('each step follows a link and extends history and story', () => {
    const s = new CharlatanState();
    s.step();
    const from = s.activeNodeId;
    s.step();
    expect(s.history).toHaveLength(2);
    expect(s.story.map(i => i.id)).toEqual(s.history);
    const linked = s.graph.links.some(l => l.source === from && l.target === s.activeNodeId);
    expect(linked).toBe(true);
  });

  it('reset stops playback and restarts the story', () => {
    const s = new CharlatanState();
    s.step();
    s.step();
    s.isPlaying = true;
    s.reset();
    expect(s.isPlaying).toBe(false);
    expect(s.history).toHaveLength(1);
  });

  it('manualJump moves to any node', () => {
    const s = new CharlatanState();
    const target = s.graph.nodes[42];
    s.manualJump(target.id);
    expect(s.activeNode).toBe(target);
    expect(s.story.at(-1)?.text).toBe(target.text);
  });
});

describe('loadGraph', () => {
  it('swaps the graph, stops playback and clears the story', () => {
    const s = new CharlatanState();
    const seed = s.graph;
    s.step();
    s.isPlaying = true;
    const graph = { meta: { version: 1, seed: 'x' }, nodes: [seed.nodes[0]], links: [] };
    s.loadGraph(graph, 'x');
    expect(s.graph).toBe(graph);
    expect(s.theme).toBe('x');
    expect(s.isPlaying).toBe(false);
    expect(s.story).toEqual([]);
    expect(s.activeNode).toBeNull();
    s.restoreSeed();
    expect(s.graph).toBe(seed);
    expect(s.theme).toBeNull();
  });

  it('an oracle answer always completes, and ends early at a dead end instead of hanging', () => {
    const s = new CharlatanState();
    s.beginAnswer(7);
    s.isPlaying = true;
    for (let i = 0; i < 40 && s.isPlaying; i++) s.step();
    expect(s.answerDone).toBe(true);
    expect(s.isPlaying).toBe(false);

    const dead = new CharlatanState({
      meta: { title: 'dead end', version: '1' },
      nodes: [
        { id: 'a', text: 'a', type: 'subject' },
        { id: 'b', text: 'b', type: 'object' },
      ],
      links: [{ source: 'a', target: 'b', weight: 1 }],
    } as never);
    dead.beginAnswer(1);
    dead.isPlaying = true;
    for (let i = 0; i < 5 && dead.isPlaying; i++) dead.step();
    expect(dead.trace.map(t => t.node)).toEqual(['a', 'b']);
    expect(dead.answerDone).toBe(true);
    expect(dead.isPlaying).toBe(false);
  });
});
