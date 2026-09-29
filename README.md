# The Charlatan

**The Charlatan** is an interactive, generative narrative experience. It visualizes a linguistic "oracle" that navigates a complex web of words and fragments, spinning a continuous, voiced story in real-time.

Live at **https://themostimportant.page/about/charlatans**.

## 📖 Documentation

- [**Project Overview**](./.agents/docs/project_overview.md): High-level description of features and purpose.
- [**Technical Documentation**](./.agents/docs/technical_deep_dive.md): Architecture overview, tech stack, and development process.
- [**AI Agent Context**](./.agents/docs/ai_context.md): **(Important for Developers/AI)** Deep dive into the project's mental model, state flow, and traversal logic.
- [**Deployment**](./.agents/docs/artifacts/A50-deploy.md): Building and running on the VPS.
- [**Roadmap: Svelte + AI**](./.agents/docs/proposals/P01-svelte-migration-and-ai.md)

## 🚀 Quick Start

```bash
npm install
npm run dev        # http://localhost:5173/about/charlatans
npm run check      # svelte-check (types)
npm run lint
npm test           # vitest
npm run build      # Node server in build/
npm start          # run the build (reads .env if present, see .env.example)
```

## 🛠️ Tech Stack
- **SvelteKit** (Svelte 5 runes) & **TypeScript**, `adapter-node`
- **Native CSS**, scoped per component
- **D3-force** for physics simulation
- **HTML5 Canvas** for high-performance rendering
- **Web Audio API** & **SpeechSynthesis** for multisensory feedback
- **AI, server-side** (Gemini free tier by default; OpenAI-compatible APIs or Claude also supported) to write a new vocabulary from any theme

---

*This project explores the relationship between structure and chaos through automated storytelling.*
