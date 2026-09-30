import { describe, expect, it } from 'vitest';
import { isUuid, MAX_QUESTION_LENGTH, parseSessionInput } from './sessions';

const UUID = '0b8e4f7a-1c2d-4e5f-8a9b-0c1d2e3f4a5b';
const step = { node: 'b', candidates: [{ id: 'b', p: 0.75 }, { id: 'c', p: 0.25 }], roll: 0.4 };
const valid = { question: 'Will it rain?', answer: 'The rain remembers.', steps: [step], seed: 42, vocabularyId: UUID };

describe('parseSessionInput', () => {
  it('accepts a well-formed session', () => {
    expect(parseSessionInput(valid)).toEqual(valid);
  });

  it('keeps no question when the visitor opts out or leaves it blank', () => {
    expect(parseSessionInput({ ...valid, question: null })).toMatchObject({ question: null });
    expect(parseSessionInput({ ...valid, question: undefined })).toMatchObject({ question: null });
    expect(parseSessionInput({ ...valid, question: '   ' })).toMatchObject({ question: null });
  });

  it('collapses whitespace and trims', () => {
    expect(parseSessionInput({ ...valid, question: ' will \n it  rain ', answer: ' x ' })).toMatchObject({
      question: 'will it rain',
      answer: 'x',
    });
  });

  it('allows the base graph (no vocabulary)', () => {
    expect(parseSessionInput({ ...valid, vocabularyId: null })).toMatchObject({ vocabularyId: null });
  });

  it.each([
    ['not an object', 'nope'],
    ['a long question', { ...valid, question: 'x'.repeat(MAX_QUESTION_LENGTH + 1) }],
    ['a non-string question', { ...valid, question: 3 }],
    ['no answer', { ...valid, answer: '' }],
    ['no steps', { ...valid, steps: [] }],
    ['too many steps', { ...valid, steps: Array(33).fill(step) }],
    ['a roll out of range', { ...valid, steps: [{ ...step, roll: 1.5 }] }],
    ['a bad candidate', { ...valid, steps: [{ ...step, candidates: [{ id: '', p: 0.5 }] }] }],
    ['a fractional seed', { ...valid, seed: 1.5 }],
    ['a negative seed', { ...valid, seed: -1 }],
    ['a seed over 32 bits', { ...valid, seed: 2 ** 32 }],
    ['a malformed vocabulary id', { ...valid, vocabularyId: 'abc' }],
  ])('rejects %s', (_, body) => {
    expect(typeof parseSessionInput(body)).toBe('string');
  });

  it('drops unknown fields from steps', () => {
    const parsed = parseSessionInput({ ...valid, steps: [{ ...step, extra: 1 }] });
    expect(parsed).toMatchObject({ steps: [step] });
  });
});

it('recognizes UUIDs', () => {
  expect(isUuid(UUID)).toBe(true);
  expect(isUuid('nope')).toBe(false);
  expect(isUuid(7)).toBe(false);
});
