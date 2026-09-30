import type { Node, NodeType } from './types';
import { CONNECTION_RULES } from './rules';

/** A fragment of the story: the node's own words and type. */
export type Fragment = Pick<Node, 'id' | 'text' | 'type'>;

/** A node the walker can come back to without a link, and its weight on the dice. */
export interface Echo {
  id: string;
  weight: number;
}

/** A fragment as the story says it. */
export interface Phrase extends Fragment {
  /** The part it plays in its sentence (see rolesOf). */
  role: NodeType;
  /** As spoken: "the" on a second mention, a capital when it opens a sentence. */
  words: string;
  /** As written: `words` plus a comma after a connector, a full stop before the next sentence. */
  display: string;
  /** It starts a sentence. */
  opens: boolean;
}

// Weight on the dice of coming back to the latest subject (the same character goes on) and to the
// latest object (what the last sentence acted on becomes what the next one is about). A link weighs 1.
export const ECHO_SUBJECT_WEIGHT = 0.35;
export const ECHO_OBJECT_WEIGHT = 0.7;

/** True if a fragment playing `role` can be followed by one of type `next`. */
export const canFollow = (role: NodeType, next: NodeType) => CONNECTION_RULES[role].includes(next);

/** True if a sentence can end after a fragment playing `role`. */
export const canEndSentence = (role: NodeType) => canFollow(role, 'subject');

/**
 * The role each fragment plays: its own type, except an object that does not
 * follow an action, which is a noun come back as the subject of a new sentence.
 */
export function rolesOf(types: NodeType[]): NodeType[] {
  const roles: NodeType[] = [];
  for (const type of types) {
    roles.push(type === 'object' && roles.at(-1) !== 'action' ? 'subject' : type);
  }
  return roles;
}

/**
 * The nouns the walker can come back to when the next fragment may open a
 * sentence: the subject and the object of the sentence just said.
 */
export function echoesFor(story: Fragment[]): Echo[] {
  const roles = rolesOf(story.map(f => f.type));
  const last = roles.at(-1);
  if (!last || !canFollow(last, 'subject')) return [];

  // The sentence just said: after a connector, the one before it
  const end = last === 'connector' ? roles.length - 2 : roles.length - 1;
  let start = end;
  while (start > 0 && !opensAt(roles, start)) start--;

  const echoes: Echo[] = [];
  const offer = (role: NodeType, weight: number) => {
    const i = roles.lastIndexOf(role, end);
    if (i >= 0 && i >= start && !echoes.some(e => e.id === story[i].id)) echoes.push({ id: story[i].id, weight });
  };
  offer('object', ECHO_OBJECT_WEIGHT);
  offer('subject', ECHO_SUBJECT_WEIGHT);
  return echoes;
}

// A connector always opens a sentence; a subject does unless a connector just did.
function opensAt(roles: NodeType[], i: number): boolean {
  return i === 0 || roles[i] === 'connector' || (roles[i] === 'subject' && roles[i - 1] !== 'connector');
}

const definite = (text: string) => text.replace(/^an? /, 'the ');
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** The story as it is said and written: articles, capitals and punctuation. */
export function phrase(story: Fragment[]): Phrase[] {
  const roles = rolesOf(story.map(f => f.type));
  const said = new Set<string>();

  return story.map((fragment, i) => {
    const role = roles[i];
    const opens = opensAt(roles, i);

    let words = fragment.text;
    if ((role === 'subject' || role === 'object') && said.has(fragment.id)) words = definite(words);
    if (opens) words = capitalize(words);
    said.add(fragment.id);

    let display = words;
    if (role === 'connector') display += ',';
    else if (i + 1 < story.length && opensAt(roles, i + 1)) display += '.';

    return { ...fragment, role, words, display, opens };
  });
}

/** The whole story as one line of text, ending with a full stop. */
export function storyText(story: Fragment[]): string {
  const text = phrase(story)
    .map(p => p.display)
    .join(' ')
    .trim()
    .replace(/[,.]$/, '');
  return text ? `${text}.` : '';
}
