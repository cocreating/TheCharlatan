import { describe, expect, it, vi } from 'vitest';
import { rollAmong, selectNextNode, selectNextStep, weighNextNodes } from './walker';
import { mulberry32 } from './random';
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

describe('dice', () => {
  const weighted: Link[] = [
    { source: 'a', target: 'b', weight: 3 },
    { source: 'a', target: 'c', weight: 1 },
  ];

  it('weighs options by link weight and recent visits', () => {
    expect(weighNextNodes('a', weighted, [])).toEqual([
      { id: 'b', p: 0.75 },
      { id: 'c', p: 0.25 },
    ]);
    const penalized = weighNextNodes('a', weighted, ['b']);
    expect(penalized[0].p).toBeCloseTo(0.3 / 1.3);
    expect(penalized.reduce((s, c) => s + c.p, 0)).toBeCloseTo(1);
  });

  it('rolls: the first candidate whose cumulative probability passes the roll', () => {
    const candidates = weighNextNodes('a', weighted, []);
    expect(rollAmong(candidates, () => 0.1)).toEqual({ node: 'b', candidates, roll: 0.1 });
    expect(rollAmong(candidates, () => 0.8)?.node).toBe('c');
    expect(rollAmong([], () => 0.5)).toBeNull();
  });

  it('replays the same walk from the same seed', () => {
    const walk = (seed: number) => {
      const rng = mulberry32(seed);
      const steps = [];
      let at = 'a';
      const history = [at];
      for (let i = 0; i < 12; i++) {
        const step = selectNextStep(at, links, history, rng);
        if (!step) break;
        steps.push(step);
        at = step.node;
        history.push(at);
      }
      return steps;
    };
    expect(walk(1234)).toEqual(walk(1234));
    expect(walk(1234)).not.toEqual(walk(4321));
  });
});
