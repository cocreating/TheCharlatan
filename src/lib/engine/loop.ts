import type { CharlatanState } from './store.svelte';
import { speak, cancelSpeech } from './audio';
import { ambient } from './ambient';

const GLITCH_CHANCE = 0.1;
const GLITCH_DURATION_MS = 800;
const STUTTER_GAP_MS = 100;
const BASE_INTERVAL_MS = 2000; // Without TTS: 2000ms / speed factor (2.0x speed = 1000ms)
const BREATH_AFTER_SPEECH_MS = 500; // With TTS: pause after each utterance / speed factor

const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

/**
 * The playback loop: Step -> (Glitch) -> Speak -> Wait -> Step.
 * Speeds, TTS and glitch settings are read fresh on every iteration.
 * Returns a function that stops the loop and silences speech.
 */
export function startLoop(state: CharlatanState): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancelled = false;

  const runLoop = async () => {
    if (cancelled) return;

    state.step();
    if (!state.isPlaying) return; // The step ended playback (dead end, or the oracle's answer is complete)

    // Glitch Chance!
    if (state.glitchEnabled && Math.random() < GLITCH_CHANCE) {
      state.isGlitching = true;

      const node = state.activeNode;
      if (state.ttsEnabled && node) {
        // Stutter effect: speak the first word quickly, twice
        const stutter = { ...node, text: node.text.split(' ')[0] };
        await speak(stutter, state.voiceName);
        await wait(STUTTER_GAP_MS);
        await speak(stutter, state.voiceName);
        await wait(STUTTER_GAP_MS);
      }

      // Wait a bit of chaos
      await wait(GLITCH_DURATION_MS);
      state.isGlitching = false;
    }

    if (cancelled) return;

    // Re-read state in case it changed (e.g. a manual jump during the glitch)
    const node = state.activeNode;
    let delay: number;
    if (state.ttsEnabled && node) {
      // Ambient Transition
      ambient.transition(node.type);
      // Apply global speed factor to semantic modulation
      await speak(node, state.voiceName, state.voiceSpeed);
      // Add a Breath Delay after speech: faster speed (higher factor) = shorter breath
      delay = BREATH_AFTER_SPEECH_MS / state.transitionSpeed;
    } else {
      delay = BASE_INTERVAL_MS / state.transitionSpeed;
    }

    if (!cancelled) timer = setTimeout(runLoop, delay);
  };

  // Initial kick
  runLoop();

  return () => {
    cancelled = true;
    clearTimeout(timer);
    cancelSpeech();
    state.isGlitching = false;
  };
}
