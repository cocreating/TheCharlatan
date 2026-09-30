import { charlatan, type CharlatanState } from '$lib/engine/store.svelte';
import { randomSeed } from '$lib/engine/random';
import { speak, cancelSpeech } from '$lib/engine/audio';
import { answerText } from './answer';
import { postSession, sendMeaning, type MeaningStats } from './api';

/**
 * - idle: the question box
 * - answering: the charlatan walks (seeded, recorded) and speaks
 * - asking: "Did it speak to you?"
 * - replaying: the same answer again, slowly, with the dice showing
 * - revealed: the number
 */
export type OraclePhase = 'idle' | 'answering' | 'asking' | 'replaying' | 'revealed';

/** Time each roll stays on screen in the replay (longer if the voice takes longer). */
export const REPLAY_STEP_MS = 2600;
const REPLAY_VOICE_FACTOR = 0.85; // The replay speaks a little slower

export class Oracle {
  phase = $state<OraclePhase>('idle');
  question = $state('');
  answer = $state('');
  felt = $state<boolean | null>(null);
  stats = $state<MeaningStats | null>(null);
  /** Index of the roll on screen during the replay. */
  rollIndex = $state(0);

  private seed = 0;
  private keepQuestion = true;
  private session: Promise<string | null> = Promise.resolve(null);
  private run = 0; // Bumped by close(): anything still awaiting from an older run lets go
  private skipped = false; // SKIP ends the current replay but keeps its run
  private wake: (() => void) | null = null; // Ends the current replay pause early

  constructor(private state: CharlatanState) {}

  /** Step 1: the visitor asks, the charlatan answers with a seeded walk. */
  ask = (question: string, keepQuestion: boolean) => {
    if (this.phase !== 'idle' || !question.trim()) return;
    this.question = question.trim();
    this.keepQuestion = keepQuestion;
    this.answer = '';
    this.felt = null;
    this.stats = null;
    this.seed = randomSeed();

    this.state.beginAnswer(this.seed);
    this.state.isPlaying = true;
    this.phase = 'answering';
  };

  /** The walk reached the end of its answer: keep it and ask the question. */
  finishAnswer = () => {
    if (this.phase !== 'answering') return;
    this.state.freeze();
    this.answer = answerText(this.state.story.map(s => s.text));
    this.phase = 'asking';

    this.session = postSession({
      question: this.keepQuestion ? this.question : null,
      answer: this.answer,
      steps: this.state.trace,
      seed: this.seed,
      vocabularyId: this.state.vocabularyId,
    });
  };

  /** Step 2: "Did it speak to you?" → show the dice → the number. */
  respond = async (felt: boolean) => {
    if (this.phase !== 'asking') return;
    this.felt = felt;
    const run = ++this.run;
    const stats = this.session.then(id => (id ? sendMeaning(id, felt) : null));

    await this.replay(run);
    const result = await stats;
    if (run !== this.run) return; // Closed meanwhile
    this.stats = result;
    this.phase = 'revealed';
  };

  /** Jump to the end of the replay. */
  skip = () => {
    if (this.phase !== 'replaying') return;
    this.skipped = true;
    this.wake?.();
    cancelSpeech();
    this.showWholeAnswer();
  };

  /** Leave the oracle; the answer stays on screen and free playback resumes control. */
  close = () => {
    this.run++;
    this.wake?.();
    cancelSpeech();
    this.state.endOracle();
    this.phase = 'idle';
  };

  /** Replays the recorded answer until it ends, is skipped or the oracle is closed. */
  private async replay(run: number) {
    this.skipped = false;
    this.phase = 'replaying';
    const steps = this.state.trace;
    const going = () => run === this.run && !this.skipped;

    for (let i = 0; i < steps.length; i++) {
      if (!going()) break;
      this.rollIndex = i;
      this.state.showRoll(i);

      const node = this.state.activeNode;
      const started = performance.now();
      if (this.state.ttsEnabled && node) {
        await speak(node, this.state.voiceName, this.state.voiceSpeed * REPLAY_VOICE_FACTOR);
      }
      const remaining = REPLAY_STEP_MS - (performance.now() - started);
      if (remaining > 0 && going()) await this.pause(remaining);
    }

    if (run === this.run) this.showWholeAnswer();
  }

  private pause(ms: number) {
    return new Promise<void>(resolve => {
      const timer = setTimeout(resolve, ms);
      this.wake = () => {
        clearTimeout(timer);
        resolve();
      };
    }).finally(() => {
      this.wake = null;
    });
  }

  private showWholeAnswer() {
    const last = this.state.trace.length - 1;
    if (last >= 0) this.state.showRoll(last);
    this.state.dice = null;
    this.rollIndex = last;
  }
}

export const oracle = new Oracle(charlatan);
