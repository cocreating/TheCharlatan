import { describe, expect, it } from 'vitest';
import { ECHO_OBJECT_WEIGHT, ECHO_SUBJECT_WEIGHT, echoesFor, phrase, rolesOf, storyText, type Fragment } from './grammar';
import type { NodeType } from './types';

let next = 0;
const f = (type: NodeType, text: string, id = `x${next++}`): Fragment => ({ id, text, type });

const witness = f('subject', 'a faceless witness', 's1');
const observes = f('action', 'observes', 'a1');
const mirror = f('object', 'a mirror', 'o1');
const dawn = f('time', 'before the dawn', 't1');
const andYet = f('connector', 'and yet', 'c1');
const silent = f('state', 'falls silent', 'st1');

describe('rolesOf', () => {
  it('an object after an action is an object; anywhere else it is a subject come back', () => {
    expect(rolesOf(['subject', 'action', 'object', 'object', 'state'])).toEqual([
      'subject',
      'action',
      'object',
      'subject',
      'state',
    ]);
    expect(rolesOf(['connector', 'object'])).toEqual(['connector', 'subject']);
  });
});

describe('phrase', () => {
  it('capitalizes sentences, ends them with a full stop and gives connectors a comma', () => {
    const story = [witness, observes, mirror, dawn, andYet, mirror, silent];
    expect(phrase(story).map(p => p.display)).toEqual([
      'A faceless witness',
      'observes',
      'a mirror',
      'before the dawn.',
      'And yet,',
      'the mirror', // Second mention, and the connector already opened the sentence
      'falls silent',
    ]);
  });

  it('says "the" when a noun comes back, and knows which fragments open a sentence', () => {
    const phrases = phrase([witness, observes, mirror, mirror, silent, witness]);
    expect(phrases.map(p => p.words)).toEqual([
      'A faceless witness',
      'observes',
      'a mirror',
      'The mirror',
      'falls silent',
      'The faceless witness',
    ]);
    expect(phrases.map(p => p.opens)).toEqual([true, false, false, true, false, true]);
    expect(phrases[3].role).toBe('subject');
  });

  it('leaves nouns without an indefinite article alone', () => {
    const machine = f('subject', 'the machine');
    expect(phrase([machine, silent, machine]).at(-1)?.words).toBe('The machine');
  });
});

describe('storyText', () => {
  it('writes the story as punctuated sentences', () => {
    expect(storyText([witness, observes, mirror, mirror, silent])).toBe(
      'A faceless witness observes a mirror. The mirror falls silent.',
    );
  });

  it('never ends on a comma', () => {
    expect(storyText([witness, silent, andYet])).toBe('A faceless witness falls silent. And yet.');
  });

  it('is empty without words', () => {
    expect(storyText([])).toBe('');
    expect(storyText([f('subject', '  ')])).toBe('');
  });
});

describe('echoesFor', () => {
  it('offers nothing in the middle of a sentence', () => {
    expect(echoesFor([])).toEqual([]);
    expect(echoesFor([witness])).toEqual([]);
    expect(echoesFor([witness, observes])).toEqual([]);
  });

  it('offers the object and the subject of the sentence just said', () => {
    expect(echoesFor([witness, observes, mirror])).toEqual([
      { id: 'o1', weight: ECHO_OBJECT_WEIGHT },
      { id: 's1', weight: ECHO_SUBJECT_WEIGHT },
    ]);
    expect(echoesFor([witness, observes, mirror, dawn, andYet]).map(e => e.id)).toEqual(['o1', 's1']);
  });

  it('only looks at the last sentence', () => {
    const machine = f('subject', 'the machine', 's2');
    expect(echoesFor([witness, observes, mirror, machine, silent])).toEqual([{ id: 's2', weight: ECHO_SUBJECT_WEIGHT }]);
  });

  it('offers a noun once, even when it plays both parts', () => {
    // "A mirror observes the mirror": the object and the subject are the same node
    expect(echoesFor([mirror, observes, mirror]).map(e => e.id)).toEqual(['o1']);
  });
});
