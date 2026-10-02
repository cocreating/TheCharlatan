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
  feltMeaning: number;
  pct: number | null;
}

/** Below this many answers a percentage means little ("100% of 7"): plain counts instead. */
export const MIN_SAMPLE_FOR_PCT = 30;

/** Longest interpretation the visitor can write (it is never stored). */
export const MAX_INTERPRETATION_LENGTH = 200;

/**
 * The closing lines after the dice: the real number when there is one, and the
 * visitor's own reading of the answer (if they wrote one) set against the dice,
 * and the mask (theme) the charlatan wore to answer, if any.
 */
export function revealLines(
  felt: boolean | null,
  stats: RevealStats | null,
  heard = '',
  mask: string | null = null,
): string[] {
  const lines: string[] = [];
  if (stats && stats.answered > 0) {
    const people = `${stats.answered} ${stats.answered === 1 ? 'person' : 'people'} who asked`;
    const share =
      stats.answered >= MIN_SAMPLE_FOR_PCT && stats.pct !== null
        ? `${stats.pct}% of the ${people}`
        : `${stats.feltMeaning} of the ${people} so far`;
    lines.push(
      felt
        ? `${share} felt a random answer was meant for them. So did you.`
        : `You didn't. But ${share} did.`,
    );
  }

  const worn = mask?.trim();
  if (worn) {
    lines.push(
      felt
        ? `It answered you wearing “${worn}”. Another mask, other words: would they have spoken to you too?`
        : `It answered you wearing “${worn}”. Another mask would have rolled other words, with the same dice.`,
    );
  }

  const reading = heard.trim();
  if (felt && reading) {
    lines.push(`You heard: “${reading}”.`);
    lines.push('The dice only rolled numbers. The meaning was yours.');
  } else {
    lines.push(
      felt
        ? 'Every word was a roll of the dice. The meaning was yours.'
        : 'Every word was a roll of the dice. There was nothing there to find.',
    );
  }
  return lines;
}
