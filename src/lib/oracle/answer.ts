import type { NodeType } from '$lib/engine/types';
import { canEndSentence } from '$lib/engine/grammar';

/** Fewest fragments in an oracle answer, and a hard cap so it always ends. */
export const ANSWER_MIN_FRAGMENTS = 8;
export const ANSWER_MAX_FRAGMENTS = 16;

/**
 * True once the answer is long enough and its last fragment can end a sentence.
 * Takes roles, not types: an object that came back as a subject can't end one.
 */
export function isAnswerComplete(roles: NodeType[]): boolean {
  if (roles.length >= ANSWER_MAX_FRAGMENTS) return true;
  const last = roles.at(-1);
  return roles.length >= ANSWER_MIN_FRAGMENTS && last !== undefined && canEndSentence(last);
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
