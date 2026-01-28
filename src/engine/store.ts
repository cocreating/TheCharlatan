
import { create } from 'zustand';
import type { GraphData } from './types';
import { selectNextNode } from './walker';
import seedDataRaw from '../data/graph.seed.json';

// Cast JSON to GraphData to ensure types match (especially if JSON import is loose)
const seedData = seedDataRaw as unknown as GraphData;

interface StoryItem {
  id: string;
  text: string;
  type: string;
}

interface AppState {
  graph: GraphData;
  activeNodeId: string | null;
  history: string[]; // List of Node IDs visited
  story: StoryItem[];

  isPlaying: boolean;
  transitionSpeed: number; // Node Transition Speed Factor (0.5x to 3.0x)
  voiceSpeed: number; // Voice Rate Factor (0.5x to 3.0x)

  // TTS
  ttsEnabled: boolean;
  voiceName: string | null;
  availableVoices: string[];

  // Glitch
  glitchEnabled: boolean;
  isGlitching: boolean;

  // Actions
  togglePlay: () => void;
  setTransitionSpeed: (speed: number) => void;
  setVoiceSpeed: (speed: number) => void;
  setTtsEnabled: (enabled: boolean) => void;
  setVoiceName: (name: string) => void;
  setAvailableVoices: (voices: string[]) => void;
  setGlitchEnabled: (enabled: boolean) => void;
  setIsGlitching: (isGlitching: boolean) => void;
  reset: () => void;
  manualJump: (nodeId: string) => void;

  // The Tick
  step: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  graph: seedData,
  activeNodeId: null, // Start empty, wait for user or auto-start?
                      // User requirement: "Initial selection of a node (random or forced)"
  history: [],
  story: [],
  isPlaying: false,
  transitionSpeed: 1.0,
  voiceSpeed: 1.0,

  ttsEnabled: false,
  voiceName: null,
  availableVoices: [],

  glitchEnabled: false,
  isGlitching: false,

  togglePlay: () => set(state => ({ isPlaying: !state.isPlaying })),

  setTransitionSpeed: (transitionSpeed) => set({ transitionSpeed }),
  setVoiceSpeed: (voiceSpeed) => set({ voiceSpeed }),
  setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
  setVoiceName: (voiceName) => set({ voiceName }),
  setAvailableVoices: (availableVoices) => set({ availableVoices }),
  setGlitchEnabled: (enabled) => set({ glitchEnabled: enabled }),
  setIsGlitching: (isGlitching) => set({ isGlitching }),

  reset: () => {
    // Pick a random start node or defined start?
    // Let's pick random 'subject' to start a sentence usually,
    // but graph allows any start. Random from ALL nodes is fine,
    // or specifically a "Subject" to start clean.
    const subjects = seedData.nodes.filter(n => n.type === 'subject');
    const startNode = subjects[Math.floor(Math.random() * subjects.length)] || seedData.nodes[0];

    set({
      activeNodeId: startNode.id,
      history: [startNode.id],
      story: [{ id: startNode.id, text: startNode.text, type: startNode.type }],
      isPlaying: false
    });
  },

  manualJump: (nodeId) => {
    const { graph, history, story } = get();
    const node = graph.nodes.find(n => n.id === nodeId);
    if (!node) return;

    set({
      activeNodeId: nodeId,
      history: [...history, nodeId],
      story: [...story, { id: node.id, text: node.text, type: node.type }]
    });
  },

  step: () => {
    const { activeNodeId, graph, history, story } = get();

    // If no active node, start one
    if (!activeNodeId) {
        get().reset();
        return;
    }

    const nextNodeId = selectNextNode(activeNodeId, graph.links, history);

    if (nextNodeId) {
       const nextNode = graph.nodes.find(n => n.id === nextNodeId);
       if (nextNode) {
         set({
            activeNodeId: nextNodeId,
            history: [...history, nextNodeId],
            story: [...story, { id: nextNode.id, text: nextNode.text, type: nextNode.type }]
         });
       }
    } else {
        // Dead end? Should not happen with constraints.
        // If it happens, maybe restart or stay put.
        console.warn("Dead end reached!");
        set({ isPlaying: false });
    }
  }
}));
