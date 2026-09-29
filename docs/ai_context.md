# AI Context: The Charlatan

This document provides a high-level mental model and technical "cheat sheet" for AI agents working on this codebase.

## Project Mental Model

**The Charlatan** is a generative storyteller. Imagine a ghost navigating a library of words:
1. **The Library (Graph)**: A network defined in `graph.seed.json`. Nodes are words/fragments with `types` (subject, action, space, time, state, object, connector). Links define who can follow whom.
2. **The Ghost (Walker)**: An engine that moves from node to node. It doesn't just move randomly; it's smart about not repeating itself too soon.
3. **The Voice (TTS)**: As the walker picks nodes, they are appended to a story and spoken aloud.
4. **The Vision (Canvas)**: A D3-force simulation rendered on an HTML5 Canvas for performance.

---

## Core Architecture & State Flow

### 1. State Management (`src/lib/engine/store.svelte.ts`)
A `CharlatanState` class built on Svelte 5 runes (`$state`, `$derived`), exported as the singleton `charlatan`. It is the source of truth for:
- `graph`: The current nodes and links.
- `activeNodeId`: Where the walker is right now.
- `history`: A list of recently visited IDs (used to avoid loops).
- `story`: The accumulating list of text fragments.
- **The Heartbeat (`step`)**: Called repeatedly by `startLoop` (`src/lib/engine/loop.ts`). It triggers the walker to find the next node and updates the state.

### 2. Traversal Logic (`src/lib/engine/walker.ts`)
The `selectNextNode` function implements:
- **Weighted Selection**: Links can have a `weight` property.
- **History Penalty**: A `RECENT_HISTORY_PENALTY_WINDOW` (default 20) tracks recent nodes. If a candidate node was visited recently, its weight is drastically reduced to encourage exploration.

### 3. Rendering Performance (`src/lib/viz/`)
- **D3-Force**: Used for the physics simulation (calculating x/y positions).
- **Canvas (`render.ts`)**: We avoid SVG/DOM for the graph. All drawing happens on a Canvas to maintain 60FPS with effects.
- **Particles**: Visual "scent" trails are emitted from the active node.

---

## Developer Guide: Common Tasks

| To change... | Go to... |
| :--- | :--- |
| **Narrative content** | `src/lib/data/graph.seed.json` |
| **Traversal "personality"** | `src/lib/engine/walker.ts` (weights and penalties) |
| **Visual style** | `src/lib/viz/render.ts` (colors, glitch, particles) |
| **UI/Controls** | `src/lib/ui/Controls.svelte` |
| **AI theme → vocabulary** | `src/lib/server/ai/` (prompt, providers), `src/lib/server/vocabulary.ts`, `src/routes/api/vocabulary/+server.ts` |
| **Main Loop / Sync** | `src/lib/engine/loop.ts`, `src/lib/engine/store.svelte.ts` |

## Technical Quirks
- **Svelte 5 runes**: Use `$state`/`$derived`/`$effect`; no legacy stores or `export let`.
- **Raw graph state**: `graph`, `history` and `story` are `$state.raw` — replace them, never mutate them. D3 mutates node positions in place, which must stay outside reactivity.
- **Canvas**: `ForceGraph.svelte` draws every animation frame from the store directly, bypassing Svelte's DOM updates.
- **Client only**: `ssr = false` in `src/routes/+layout.ts` (speech, audio and canvas are browser APIs).
- **Styling**: native CSS, scoped per component; shared tokens in `src/app.css`.
- **Weighted Math**: If weights sum to 0 (all nodes penalized), the walker falls back to a simple random pick.
