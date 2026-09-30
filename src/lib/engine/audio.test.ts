import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { speak, speechTimeoutMs } from './audio';
import type { Node } from './types';

class FakeUtterance {
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  constructor(public text: string) {}
}

const synth = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [] };
const node: Node = { id: 'n', text: 'the machine', type: 'object' } as Node;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
  vi.stubGlobal('window', { speechSynthesis: synth });
  synth.speak.mockReset();
  synth.cancel.mockReset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('resolves when the utterance ends', async () => {
  const done = vi.fn();
  speak(node).then(done);
  (synth.speak.mock.calls[0][0] as FakeUtterance).onend?.();
  await vi.advanceTimersByTimeAsync(0);
  expect(done).toHaveBeenCalled();
  expect(synth.cancel).not.toHaveBeenCalled();
});

it('gives up, and unsticks the queue, when the browser never reports the end', async () => {
  const done = vi.fn();
  speak(node).then(done);
  const utterance = synth.speak.mock.calls[0][0] as FakeUtterance;

  await vi.advanceTimersByTimeAsync(speechTimeoutMs(node.text, utterance.rate) - 1);
  expect(done).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(1);
  expect(done).toHaveBeenCalledOnce();
  expect(synth.cancel).toHaveBeenCalledOnce();

  utterance.onend?.(); // A late event changes nothing
  await vi.advanceTimersByTimeAsync(0);
  expect(done).toHaveBeenCalledOnce();
});

it('waits longer for slower speech', () => {
  expect(speechTimeoutMs('abc', 0.5)).toBe(2 * speechTimeoutMs('abc', 1));
});
