
import { useEffect } from 'react';
import { useStore } from '../engine/store';
import { ForceGraph } from '../viz/ForceGraph';
import { StoryPanel } from '../ui/StoryPanel';
import { Controls } from '../ui/Controls';
import { CinematicOverlay } from '../ui/CinematicOverlay';
import { getEnglishVoices, speak, cancelSpeech } from '../engine/audio';
import { ambient } from '../engine/ambient';
import '../index.css';

export default function App() {
   const step = useStore(state => state.step);
   const isPlaying = useStore(state => state.isPlaying);
   const transitionSpeed = useStore(state => state.transitionSpeed);

   const ttsEnabled = useStore(state => state.ttsEnabled);

   const setAvailableVoices = useStore(state => state.setAvailableVoices);

   // Viz State


   // Load voices
   useEffect(() => {
        const loadVoices = () => {
            const voices = getEnglishVoices();
            const voiceNames = voices.map(v => v.name);
            setAvailableVoices(voiceNames);

            // Set default voice if not set
            const currentVoice = useStore.getState().voiceName;
            if (!currentVoice && voiceNames.length > 0) {
                const preferred = voiceNames.find(name => name === 'Google UK English Female') ||
                                  voiceNames.find(name => name.includes('Google')) ||
                                  voiceNames[0];
                useStore.getState().setVoiceName(preferred);
            }
        };
       loadVoices();
       window.speechSynthesis.onvoiceschanged = loadVoices;
   }, [setAvailableVoices]);

   // Handle Ambient Audio State
   useEffect(() => {
       if (ttsEnabled) {
           ambient.play();
       } else {
           ambient.stop();
       }
   }, [ttsEnabled]);

   // Game Loop
   useEffect(() => {
       if (!isPlaying) {
           cancelSpeech();
           return;
       }

       let timer: ReturnType<typeof setTimeout>;
       let cancelled = false;

       const runLoop = async () => {
           if (cancelled) return;

           // Calculate delay: if TTS is on, we wait for speech.
           // BUT logic is: Step -> Speak -> Wait -> Step.
           // Since 'step' happens instantly, we usually want to speak the NEW node.

           step();

           const state = useStore.getState();
           const { activeNodeId, graph, ttsEnabled: tts, voiceName: voice, glitchEnabled, setIsGlitching } = state;

           // Glitch Chance!
           if (glitchEnabled && Math.random() < 0.1) {
              setIsGlitching(true);

              const node = graph.nodes.find(n => n.id === activeNodeId);

              if (tts && node) {
                 // Stutter effect: speak quickly 3 times
                 try {
                     // Hacky stutter
                     await speak({ ...node, text: node.text.split(' ')[0] }, voice);
                     await new Promise(r => setTimeout(r, 100));
                     await speak({ ...node, text: node.text.split(' ')[0] }, voice);
                     await new Promise(r => setTimeout(r, 100));
                 } catch(e) {
                    console.warn(e);
                 }
              }

              // Wait a bit of chaos
              await new Promise(r => setTimeout(r, 800));
              setIsGlitching(false);
           }

           // Re-fetch state in case it changed
           const currentActive = useStore.getState().activeNodeId;
           if (tts && currentActive) {
               const node = graph.nodes.find(n => n.id === currentActive);
               if (node) {
                   // Ambient Transition
                   ambient.transition(node.type);

                   try {
                       // Apply global speed factor to semantic modulation
                       const vSpeed = useStore.getState().voiceSpeed;
                       await speak(node, voice, vSpeed);
                   } catch (e) {
                       console.warn(e);
                   }
               }
               // Add a Breath Delay after speech
               if (!cancelled) {
                    // Faster speed (higher factor) = shorter breath
                    timer = setTimeout(runLoop, 500 / transitionSpeed);
               }
           } else {
               // Normal timer loop
               if (!cancelled) {
                   // Base interval 2000ms / speed factor (e.g. 2.0x speed = 1000ms delay)
                   timer = setTimeout(runLoop, 2000 / transitionSpeed);
               }
           }
       };

       // Initial kick
       runLoop();

       return () => {
           cancelled = true;
           clearTimeout(timer);
           cancelSpeech();
       };
   }, [isPlaying, transitionSpeed, step, ttsEnabled]);

   return (
     <div className="app-container">
        <CinematicOverlay />
        <div className="viz-area">
           <ForceGraph />
        </div>
        <aside className="sidebar">
           <StoryPanel />
        </aside>
        <Controls />
     </div>
   );
}
