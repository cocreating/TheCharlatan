
import type { Node } from './types';

export function getEnglishVoices(): SpeechSynthesisVoice[] {
    const voices = window.speechSynthesis.getVoices();
    return voices.filter(v => v.lang.startsWith('en'));
}

// Chrome sometimes fires neither onend nor onerror: an utterance nothing references gets garbage
// collected, speak() right after cancel() can be dropped, a remote voice can stall. Hold a reference
// while it speaks, and stop waiting after a generous estimate so the playback loop never hangs.
const inFlight = new Set<SpeechSynthesisUtterance>();
const WATCHDOG_BASE_MS = 3000;
const WATCHDOG_PER_CHAR_MS = 150;

/** How long to wait for an utterance before giving up on it. */
export function speechTimeoutMs(text: string, rate: number): number {
    return (WATCHDOG_BASE_MS + text.length * WATCHDOG_PER_CHAR_MS) / rate;
}

export function speak(node: Node, voiceName: string | null = null, speedFactor: number = 1.0): Promise<void> {
    return new Promise((resolve) => {
        const text = node.text;
        const utterance = new SpeechSynthesisUtterance(text);

        // Emotive Logic
        // Base values
        let pitch = 1.0;
        let rate = 1.0;
        let volume = 1.0;

        switch (node.type) {
            case 'time':
                pitch = 0.8; // Deeper
                rate = 0.8;  // Slower
                break;
            case 'space': // Assuming 'space' is valid type from seed
                pitch = 0.9;
                rate = 0.9;
                volume = 0.8; // Distant
                break;
            case 'action':
                pitch = 1.1; // Slightly higher
                rate = 1.2;  // Faster
                break;
            case 'state':
                pitch = 1.05; // Uneasy
                rate = 0.95;
                break;
            default:
                // subject, object, etc. - Normal
                break;
        }

        utterance.pitch = pitch;
        utterance.rate = Math.max(0.1, Math.min(10, rate * speedFactor));
        utterance.volume = volume;

        if (voiceName) {
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.name === voiceName);
            if (voice) utterance.voice = voice;
        } else {
             // Fallback
             const english = getEnglishVoices();
             if (english.length > 0) {
                // Try to find "Google UK English Female" specifically, then any Google voice, else first
                const preferred = english.find(v => v.name === 'Google UK English Female') ||
                                  english.find(v => v.name.includes('Google')) ||
                                  english[0];
                utterance.voice = preferred;
             }
        }

        const done = () => {
            if (!inFlight.delete(utterance)) return; // Already settled
            clearTimeout(timer);
            resolve();
        };

        utterance.onend = done;

        utterance.onerror = (e) => {
            console.warn("[Audio] Speech error or interrupted", e);
            done();
        };

        inFlight.add(utterance);
        const timer = setTimeout(() => {
            console.warn("[Audio] Speech never finished; moving on", text);
            window.speechSynthesis.cancel(); // Unstick the queue for the next utterance
            done();
        }, speechTimeoutMs(text, utterance.rate));

        window.speechSynthesis.speak(utterance);
    });
}

export function cancelSpeech() {
    window.speechSynthesis.cancel();
}
