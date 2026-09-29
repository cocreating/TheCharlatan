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
