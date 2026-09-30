import { describe, expect, it } from 'vitest';
import type { NodeType } from '$lib/engine/types';
import { ANSWER_MAX_FRAGMENTS, ANSWER_MIN_FRAGMENTS, isAnswerComplete, revealLines } from './answer';

const roles = (n: number, last: NodeType): NodeType[] => [...Array<NodeType>(n - 1).fill('action'), last];

describe('isAnswerComplete', () => {
  it('waits for the minimum length', () => {
    expect(isAnswerComplete(roles(ANSWER_MIN_FRAGMENTS - 1, 'object'))).toBe(false);
    expect(isAnswerComplete(roles(ANSWER_MIN_FRAGMENTS, 'object'))).toBe(true);
  });

  it('only ends on a role that closes a sentence', () => {
    expect(isAnswerComplete(roles(ANSWER_MIN_FRAGMENTS, 'action'))).toBe(false);
    // An object come back as a subject opens a sentence; it can't end one
    expect(isAnswerComplete(roles(ANSWER_MIN_FRAGMENTS, 'subject'))).toBe(false);
    for (const t of ['object', 'space', 'time', 'state'] as NodeType[]) {
      expect(isAnswerComplete(roles(ANSWER_MIN_FRAGMENTS, t))).toBe(true);
    }
  });

  it('always ends at the cap', () => {
    expect(isAnswerComplete(roles(ANSWER_MAX_FRAGMENTS, 'action'))).toBe(true);
  });
});

describe('revealLines', () => {
  it('gives the real number to those who felt it', () => {
    const lines = revealLines(true, { answered: 40, pct: 72 });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('72% of the 40 people who asked felt a random answer was meant for them. So did you.');
  });

  it('turns it around for those who did not', () => {
    expect(revealLines(false, { answered: 1, pct: 100 })[0]).toBe("You didn't. But 100% of the 1 person who asked did.");
  });

  it('skips the number when there is none', () => {
    expect(revealLines(true, null)).toEqual(['Every word was a roll of the dice. The meaning was yours.']);
    expect(revealLines(false, { answered: 0, pct: null })).toHaveLength(1);
  });
});
