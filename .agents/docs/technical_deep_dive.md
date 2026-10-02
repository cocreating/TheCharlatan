# The Charlatan: Technical Documentation

## Tech Stack
- **Framework**: SvelteKit with Svelte 5 (runes), client-side rendered (`ssr = false`)
- **Language**: TypeScript (strict typing for graph data and application state)
- **Styling**: Native CSS — global tokens in `src/app.css`, scoped `<style>` per component
- **Visualization**: D3-force (physics simulation) + HTML5 Canvas (rendering)
- **State Management**: a single `CharlatanState` class built on `$state` runes
- **Build / Server**: Vite + `@sveltejs/adapter-node` (Node server in `build/`)
- **Tests**: Vitest

## Architecture Overview

### 1. The Engine (`src/lib/engine/`)
The engine is the heart of the application, responsible for the narrative logic and state synchronization. Everything here is plain TypeScript except the store, which uses runes.

- **Store (`store.svelte.ts`)**: `CharlatanState` holds the graph, the history of visited nodes, the story fragments and all settings. `step()` advances the walker; `reset()` stops playback and starts a new story; `manualJump()` moves to a clicked node. The graph and the append-only arrays are `$state.raw` (replaced, never mutated) so d3's per-tick mutations don't trigger reactivity.
- **Loop (`loop.ts`)**: `startLoop(state)` runs Step → (Glitch) → Speak → Wait while playing, reading speeds and toggles fresh on every iteration. `+page.svelte` starts it when `isPlaying` turns on and calls the returned stop function when it turns off.
- **Walker (`walker.ts`)**: Implements the narrative traversal logic. It finds the outgoing links from the current node that fit the sentence so far, adds any echoes, and performs a **Weighted Random Selection**. It applies a "history penalty" to recently visited nodes to encourage exploration and prevent loops.
- **Grammar (`grammar.ts`)**: The role each fragment plays (`rolesOf`: an object that doesn't follow an action is a subject come back), the echoes the walker may return to (`echoesFor`), and how the story is said and written (`phrase`, `storyText`). See P03.
- **Audio & Ambient (`audio.ts`, `ambient.ts`)**: Speech synthesis with per-type pitch/rate, and a procedural drone built with the Web Audio API.
- **Rules (`rules.ts`, `validateGraph.ts`)**: The sentence shape (`CONNECTION_RULES`: what may follow each role; `ROLES`: the roles each type can play), and a validator that wants at least 3 fitting links per node and role.

### 2. The Visualization (`src/lib/viz/`)
- **ForceGraph (`ForceGraph.svelte`)**: Owns the D3 simulation and a `requestAnimationFrame` render loop that draws straight to the canvas, outside Svelte's update cycle. Resizing re-centers the layout instead of rebuilding it.
- **Render (`render.ts`)**: Pure canvas drawing logic.
- **Particles (`particles.ts`)**: A lightweight particle engine that emits visual "scent" trails from active nodes.

### 3. UI (`src/lib/ui/`)
`Controls.svelte`, `StoryPanel.svelte` and `CinematicOverlay.svelte` read and write the store directly (AUDIO and GLITCH are toggle buttons flipping `charlatan.ttsEnabled` / `glitchEnabled`). `IntroScreen.svelte` is a modal `<dialog>` that starts playback (with or without sound) on the first click, which also unlocks speech and Web Audio. Styling is token-based: all colours and fonts live in `src/app.css` and the canvas reads them via `loadThemeColors()` (see A40 / A30).

### 4. AI: themed vocabulary (`src/routes/api/vocabulary/`, `src/lib/server/`)
`ThemePrompt.svelte` posts a theme to `POST /api/vocabulary`. The endpoint rate-limits per client IP (`rateLimit.ts`), asks the configured AI provider (`src/lib/server/ai/`: Gemini by default, any OpenAI-compatible API, or Claude; shared prompt in `prompt.ts`, JSON output with one string array per node type), sanitizes the fragments (`vocabulary.ts`), builds a graph with `buildGraph` and checks it with `validateGraph`. The client swaps it in with `charlatan.loadGraph()`; NO MASK restores the seed. API keys live only in the server's `.env`.

### 5. Data Schema (`src/lib/data/`)
Nodes are categorized by type: `subject`, `action`, `space`, `time`, `state`, `object`, `connector`. A vocabulary comes in scenes (`{ scenes: [...], connector }`, sizes in `rules.ts`); nodes keep their scene (`Node.scene`, names in `graph.meta.scenes`) and links stay inside it 85% of the time, while connectors link into every scene. Links contain optional `weight` parameters that influence the walker's path. `buildGraph.ts` turns a vocabulary into a graph that respects `CONNECTION_RULES`: 3 links per node and role (objects get a second set for when they come back as subjects), spread over the types the role allows so every node offers ways on and ways to end the sentence. `builder.ts` holds the seed vocabulary; regenerate `graph.seed.json` with `npx esbuild src/lib/data/builder.ts --bundle --platform=node --format=esm --outfile=/tmp/builder.mjs && node /tmp/builder.mjs`.

## Development Process

### Adding New Narrative Fragments
1. Edit the seed vocabulary in `src/lib/data/builder.ts` (each fragment must fit every slot of its type; see P03).
2. Regenerate `graph.seed.json` (command above).
3. `npm test` checks the seed graph against the connection rules.

### Modifying the Walker Logic
The traversal strategy can be adjusted in `src/lib/engine/walker.ts` by tweaking the `RECENT_HISTORY_PENALTY_WINDOW` or the `PENALTY_FACTOR`, and in `grammar.ts` with `ECHO_SUBJECT_WEIGHT` / `ECHO_OBJECT_WEIGHT` (how often the story comes back to its nouns).

### Performance Considerations
- **Canvas vs SVG**: Canvas was chosen for the graph to allow for thousands of nodes and complex per-pixel glitch effects without the overhead of the DOM.
- **Raw state for the graph**: node positions change 60 times a second; keeping them out of Svelte's reactivity means only the story, history and settings trigger DOM updates.

## Setup and Development
```bash
npm install
npm run dev     # http://localhost:5173/about/charlatans
npm run check && npm run lint && npm test
npm run build   # see .agents/docs/artifacts/A50-deploy.md
```
