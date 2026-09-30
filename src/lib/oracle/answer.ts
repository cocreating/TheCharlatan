import type { NodeType } from '$lib/engine/types';

/** Fewest fragments in an oracle answer, and a hard cap so it always ends. */
export const ANSWER_MIN_FRAGMENTS = 8;
export const ANSWER_MAX_FRAGMENTS = 16;

// Types that close a sentence well; an answer never ends on "and yet" or "the machine".
const ENDING_TYPES: NodeType[] = ['object', 'space', 'time', 'state'];

/** True once the answer is long enough and its last fragment can end a sentence. */
export function isAnswerComplete(types: NodeType[]): boolean {
  if (types.length >= ANSWER_MAX_FRAGMENTS) return true;
  return types.length >= ANSWER_MIN_FRAGMENTS && ENDING_TYPES.includes(types[types.length - 1]);
}

/** The spoken answer as one line of text. */
export function answerText(fragments: string[]): string {
  const text = fragments.join(' ').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) + '.' : '';
}

export interface RevealStats {
  answered: number;
  pct: number | null;
}

/** The closing lines after the dice: the real number when there is one. */
export function revealLines(felt: boolean | null, stats: RevealStats | null): string[] {
  const lines: string[] = [];
  if (stats && stats.pct !== null && stats.answered > 0) {
    const people = `${stats.answered} ${stats.answered === 1 ? 'person' : 'people'}`;
    lines.push(
      felt
        ? `${stats.pct}% of the ${people} who asked felt a random answer was meant for them. So did you.`
        : `You didn't. But ${stats.pct}% of the ${people} who asked did.`,
    );
  }
  lines.push(
    felt
      ? 'Every word was a roll of the dice. The meaning was yours.'
      : 'Every word was a roll of the dice. There was nothing there to find.',
  );
  return lines;
}
