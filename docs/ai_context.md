# AI Context: The Charlatan

This document provides a high-level mental model and technical "cheat sheet" for AI agents working on this codebase.

## Project Mental Model

**The Charlatan** is a generative storyteller. Imagine a ghost navigating a library of words:
1. **The Library (Graph)**: A network defined in `graph.seed.json`. Nodes are words/fragments with `types` (subject, predicate, etc.). Links define who can follow whom.
2. **The Ghost (Walker)**: An engine that moves from node to node. It doesn't just move randomly; it's smart about not repeating itself too soon.
3. **The Voice (TTS)**: As the walker picks nodes, they are appended to a story and spoken aloud.
4. **The Vision (Canvas)**: A D3-force simulation rendered on an HTML5 Canvas for performance.

---

## Core Architecture & State Flow

### 1. State Management (`src/engine/store.ts`)
We use **Zustand**. The store is the source of truth for:
- `graph`: The current nodes and links.
- `activeNodeId`: Where the walker is right now.
- `history`: A list of recently visited IDs (used to avoid loops).
- `story`: The accumulating list of text fragments.
- **The Heartbeat (`step`)**: This function is called repeatedly. It triggers the walker to find the next node and updates the state.

### 2. Traversal Logic (`src/engine/walker.ts`)
The `selectNextNode` function implements:
- **Weighted Selection**: Links can have a `weight` property.
- **History Penalty**: A `RECENT_HISTORY_PENALTY_WINDOW` (default 20) tracks recent nodes. If a candidate node was visited recently, its weight is drastically reduced to encourage exploration.

### 3. Rendering Performance (`src/viz/`)
- **D3-Force**: Used for the physics simulation (calculating x/y positions).
- **Canvas (`render.ts`)**: We avoid SVG/DOM for the graph. All drawing happens on a Canvas to maintain 60FPS with effects.
- **Particles**: Visual "scent" trails are emitted from the active node.

---

## Developer Guide: Common Tasks

| To change... | Go to... |
| :--- | :--- |
| **Narrative content** | `src/data/graph.seed.json` |
| **Traversal "personality"** | `src/engine/walker.ts` (weights and penalties) |
| **Visual style** | `src/viz/render.ts` (colors, glitch, particles) |
| **UI/Controls** | `src/ui/Controls.tsx` |
| **Main Loop / Sync** | `src/engine/store.ts` |

## Technical Quirks
- **React 19**: We use modern hooks. Avoid legacy class components.
- **Canvas Refs**: The `ForceGraph` component uses a `useRef` that D3 and the renderer share to bypass React's standard render cycle for high-frequency updates.
- **Weighted Math**: If weights sum to 0 (all nodes penalized), the walker falls back to a simple random pick.
