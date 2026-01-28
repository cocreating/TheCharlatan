import type { NodeType } from './types';

export class AmbientEngine {
    private ctx: AudioContext | null = null;
    private oscs: OscillatorNode[] = [];
    private gainNode: GainNode | null = null;
    private isPlaying: boolean = false;

    // Frequencies for a dark, ambient drone (C Minor ish)
    // Root (C2), Fifth (G2), Octave (C3)
    private readonly baseFreqs = [65.41, 98.00, 130.81];

    constructor() {}

    init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        this.ctx = new AudioContext();

        // Master Gain
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.value = 0; // Start muted
        this.gainNode.connect(this.ctx.destination);

        // Create Oscillators
        this.baseFreqs.forEach(freq => {
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            // Individual gain for each osc to mix them
            const oscGain = this.ctx.createGain();
            oscGain.gain.value = 0.2;

            osc.connect(oscGain);
            oscGain.connect(this.gainNode!);

            osc.start();
            this.oscs.push(osc);
        });
    }

    async resume() {
        if (!this.ctx) this.init();
        if (this.ctx?.state === 'suspended') {
            await this.ctx.resume();
        }
    }

    play() {
        this.resume();
        if (this.gainNode) {
            // Fade in
            this.gainNode.gain.cancelScheduledValues(0);
            this.gainNode.gain.linearRampToValueAtTime(0.5, this.ctx!.currentTime + 2);
            this.isPlaying = true;
        }
    }

    stop() {
        if (this.gainNode && this.ctx) {
            // Fade out
            this.gainNode.gain.cancelScheduledValues(0);
            this.gainNode.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);
            this.isPlaying = false;
        }
    }

    transition(type: NodeType) {
        if (!this.ctx || !this.isPlaying) return;

        const now = this.ctx.currentTime;

        // Semantic modulation
        // We modulate detune or frequency slightly based on type
        // Space/Time = Deeper, slower (Low pass? or just drop pitch)
        // Action/Subject = Brighten (add slight detune or higher harmonic)

        this.oscs.forEach((osc, i) => {
            // Reset to base first (with some drift)
            const base = this.baseFreqs[i];
            let targetFreq = base;

            switch (type) {
                case 'time':
                case 'space': // Verified 'space' is correct
                    targetFreq = base * 0.99; // Detune down slightly
                    osc.type = 'sine';
                    break;
                case 'action':
                    targetFreq = base * 1.02; // Sharpness
                    osc.type = 'triangle'; // Add harmonics
                    break;
                case 'subject':
                case 'object':
                    targetFreq = base;
                    osc.type = 'sine'; // Stable
                    break;
                case 'state':
                    targetFreq = base + (Math.random() * 4 - 2); // Unstable
                    osc.type = 'sine';
                    break;
                default:
                    targetFreq = base;
            }

            // Smooth transition
            osc.frequency.linearRampToValueAtTime(targetFreq, now + 1.5);
        });
    }
}

export const ambient = new AmbientEngine();
