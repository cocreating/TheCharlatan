# The Charlatan: Project Documentation

## Overview
**The Charlatan** is an interactive, generative narrative experience built with SvelteKit, TypeScript, and D3. It explores the relationship between structure and chaos through a digital "oracle" or "storyteller" that navigates a complex web of linguistic fragments.

The project visualizes a force-directed graph where each node represents a word or phrase (subject, action, object, etc.). A "walker" engine traverses this graph in real-time, building a continuous stream of consciousness that is both displayed visually and spoken via Text-to-Speech (TTS).

## Key Features
- **Dynamic Force-Directed Graph**: A live visualization of the narrative structure using D3-force, where nodes and links pulse and shift as the story unfolds.
- **Weighted Random Walker**: An intelligent traversal engine that selects the next narrative path based on connection weights and recent history to ensure variety and coherence.
- **Story Panel**: An interface that captures and displays the evolving narrative, highlighting the current focus.
- **Multisensory Experience**:
    - **Text-to-Speech (TTS)**: The narrative is voiced in real-time with adjustable speed and pitch.
    - **Ambient Audio Layer**: A procedural audio engine that generates soundscapes based on the graph's state.
    - **Visual Glitch Effects**: Intentional visual artifacts that trigger based on narrative "intensity" or state changes.
- **Interactive Controls**: Users can pause/play, adjust transition and voice speeds, toggle TTS, and manually "jump" to specific nodes by clicking them in the graph.

## Project Structure
- **Visualization**: A high-performance HTML5 Canvas renderer for the D3 graph, including a custom particle system for "scent" trails.
- **Engine**: A single rune-based state class that handles the walker's logic, audio synchronization, and UI state.
- **Data-Driven**: The entire narrative structure is defined in a JSON seed file, allowing for easy expansion and modification of the "Charlatan's" vocabulary and logic.

## Purpose
"The Charlatan" serves as both a technical demonstration of complex state synchronization between Svelte, D3, and Web APIs (Audio/TTS), and an artistic exploration of automated storytelling.
