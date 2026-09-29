import { describe, expect, it, vi } from 'vitest';
import { selectNextNode } from './walker';
import type { Link } from './types';

const links: Link[] = [
  { source: 'a', target: 'b', weight: 1 },
  { source: 'a', target: 'c', weight: 1 },
  { source: 'b', target: 'a', weight: 1 },
];

describe('selectNextNode', () => {
  it('returns null when the node has no outgoing links', () => {
    expect(selectNextNode('c', links, [])).toBeNull();
  });

  it('only picks targets of outgoing links', () => {
    for (let i = 0; i < 50; i++) {
      expect(['b', 'c']).toContain(selectNextNode('a', links, []));
    }
  });

  it('penalizes recently visited targets', () => {
    // b visited once -> weight 0.1 vs c at 1: a draw of 0.5 of the total lands on c
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(selectNextNode('a', links, ['b'])).toBe('c');
    vi.restoreAllMocks();
  });
});
