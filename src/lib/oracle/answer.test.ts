import { describe, expect, it } from 'vitest';
import type { NodeType } from '$lib/engine/types';
import { ANSWER_MAX_FRAGMENTS, ANSWER_MIN_FRAGMENTS, answerText, isAnswerComplete, revealLines } from './answer';

const types = (n: number, last: NodeType): NodeType[] => [...Array<NodeType>(n - 1).fill('action'), last];

describe('isAnswerComplete', () => {
  it('waits for the minimum length', () => {
    expect(isAnswerComplete(types(ANSWER_MIN_FRAGMENTS - 1, 'object'))).toBe(false);
    expect(isAnswerComplete(types(ANSWER_MIN_FRAGMENTS, 'object'))).toBe(true);
  });

  it('only ends on a type that closes a sentence', () => {
    expect(isAnswerComplete(types(ANSWER_MIN_FRAGMENTS, 'action'))).toBe(false);
    for (const t of ['object', 'space', 'time', 'state'] as NodeType[]) {
      expect(isAnswerComplete(types(ANSWER_MIN_FRAGMENTS, t))).toBe(true);
    }
  });

  it('always ends at the cap', () => {
    expect(isAnswerComplete(types(ANSWER_MAX_FRAGMENTS, 'action'))).toBe(true);
  });
});

describe('answerText', () => {
  it('joins the fragments into one capitalized sentence', () => {
    expect(answerText(['the machine', 'remembers', 'the rain'])).toBe('The machine remembers the rain.');
  });

  it('is empty without fragments', () => {
    expect(answerText([])).toBe('');
    expect(answerText(['  '])).toBe('');
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
