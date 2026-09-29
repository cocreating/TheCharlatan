# Decisions

Newest first. One entry per decision: what was decided and why.

## 2026-09-29

- **Agent files live in `.agents/`** (docs in `.agents/docs/`, working memory in `.agents/context/`). The owner's convention for all projects.
- **AI provider: Gemini free tier by default** (`GEMINI_API_KEY`, model alias `gemini-flash-latest`). OpenAI-compatible APIs and Claude stay supported through env vars; the owner is not using a paid key for now.
- **Theme → vocabulary (A1) is the first AI feature.** Per-IP rate limit, 20 generations/hour by default (`RATE_LIMIT_PER_HOUR`). Next on the roadmap: A2 streamed narrator, A3 oracle.
- **Hosting: own VPS with Node.js** at `themostimportant.page/about/charlatans`, pm2 behind nginx. SvelteKit `adapter-node`; `paths.base = /about/charlatans`.
- **Deploys: GitHub Actions → SSH → `scripts/deploy.sh`.** Agents can't SSH from the cloud sandbox (port 22 blocked), so the deploy runs from CI with `DEPLOY_*` repo secrets. GitHub Pages deploy was retired.
- **Vercel previews kept for PRs** (`adapter-vercel` when `VERCEL=1`), served from the preview domain root, without an AI key.
- **App language: English only** for now. The owner writes in Spanish; agents answer in Spanish.
- **Framework: React → SvelteKit + Svelte 5 runes, native CSS only** (no Tailwind, no inline styles). The PLAY/PAUSE label intentionally shows the current state (commit 76d7ba5).
