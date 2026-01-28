# The Charlatan: Technical Documentation

## Tech Stack
- **Framework**: React 19 (hooks-heavy architecture)
- **Language**: TypeScript (strict typing for graph data and application state)
- **Visualization**: D3-force (physics simulation) + HTML5 Canvas (rendering)
- **State Management**: Zustand (centralized store for high-frequency updates)
- **Build Tool**: Vite (Fast Refresh and optimized builds)

## Architecture Overview

### 1. The Engine (`src/engine/`)
The engine is the heart of the application, responsible for the narrative logic and state synchronization.

- **Store (`store.ts`)**: Manages the application's global state, including the graph data, the history of visited nodes, and the active story fragments. It triggers the `step()` function periodically when in playback mode.
- **Walker (`walker.ts`)**: Implements the narrative traversal logic. It finds outgoing links from the current node and performs a **Weighted Random Selection**. It applies a "history penalty" to recently visited nodes to encourage exploration and prevent loops.
- **Audio & Ambient (`audio.ts`, `ambient.ts`)**: Procedural audio components that track the state of the story and synthesize sounds using the Web Audio API.

### 2. The Visualization (`src/viz/`)
Handles the high-performance rendering of the knowledge graph.

- **ForceGraph (`ForceGraph.tsx`)**: The React entry point for the D3 simulation. It uses a `useRef` based approach for the Canvas to maintain 60fps performance even with complex glitch shaders and particle systems.
- **Render (`render.ts`)**: Contains pure canvas drawing logic, keeping the React component clean.
- **Particles (`particles.ts`)**: A lightweight particle engine that emits visual "scent" trails from active nodes.

### 3. Data Schema (`src/data/`)
Nodes are categorized by types (e.g., `subject`, `predicate`, `object`, `junction`). Links contain optional `weight` parameters that influence the walker's path.

## Development Process

### Adding New Narrative Fragments
1. Update `src/data/graph.seed.json` with new nodes and matching IDs.
2. Define links between nodes to establish narrative flow.
3. The engine will automatically pick up the new structure upon the next reload.

### Modifying the Walker Logic
The traversal strategy can be adjusted in `src/engine/walker.ts` by tweaking the `RECENT_HISTORY_PENALTY_WINDOW` or the `PENALTY_FACTOR`.

### Performance Considerations
- **Canvas vs SVG**: Canvas was chosen for the graph to allow for thousands of nodes and complex per-pixel glitch effects without the overhead of the DOM.
- **Zustand State**: High-frequency updates (like the walker's "ticks") are optimized through selective re-renders and direct Canvas drawing from the store state.

## Setup and Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
