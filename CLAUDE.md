# The Charlatan

Generative storyteller: a walker traverses a force-directed word graph and the story is
shown, animated and spoken (TTS). Live at https://themostimportant.page/about/charlatans.

The owner writes in Spanish: answer in Spanish. Code, comments, commits and docs in English.

## Agent files: `.agents/`

The owner's convention for every project: agent-generated material lives in `.agents/` at the repo root.

- `.agents/docs/` — all project docs and generated update/report/plan Markdown. Create new docs here, never in a top-level `docs/`.
- `.agents/context/` — working memory: record decisions in `.agents/context/decisions.md` (date, decision, reason) and read it at the start of a session.
- See `.agents/README.md`. No secrets in `.agents/`.

## Commands

```bash
npm install
npm run dev      # http://localhost:5173/about/charlatans
npm run check    # svelte-check (types)
npm run lint
npm test         # vitest
npm run build    # adapter-node server in build/ (adapter-vercel when VERCEL=1)
npm start        # node --env-file-if-exists=.env build
```

Run check, lint and test before every commit.

## Stack and conventions

- SvelteKit + Svelte 5 **runes** (`$state`, `$derived`, `$effect`, `$props`); no legacy stores or `export let`.
- **Native CSS only**: global tokens in `src/app.css`, scoped `<style>` per component. No Tailwind, no inline styles.
- Client-rendered (`ssr = false` in `src/routes/+layout.ts`): speech, Web Audio and canvas are browser APIs.
- `paths.base` is `/about/charlatans` (override with `BASE_PATH`). Build URLs with `base` from `$app/paths`.
- UI language of the app: English only (for now).

## Map

| Area | Where |
|---|---|
| State (graph, story, settings) | `src/lib/engine/store.svelte.ts` — `graph`, `history`, `story` are `$state.raw`: replace, never mutate (d3 mutates node positions) |
| Playback loop | `src/lib/engine/loop.ts` |
| Walker / rules / validation | `src/lib/engine/walker.ts`, `rules.ts`, `validateGraph.ts` |
| Graph + canvas | `src/lib/viz/ForceGraph.svelte`, `render.ts`, `particles.ts` |
| UI | `src/lib/ui/*.svelte`, page in `src/routes/+page.svelte` |
| Graph from vocabulary | `src/lib/data/buildGraph.ts` (seed: `graph.seed.json`) |
| AI theme → vocabulary | `src/routes/api/vocabulary/+server.ts`, `src/lib/server/vocabulary.ts`, providers in `src/lib/server/ai/` |

## AI

- Server-side only; keys live in the server `.env` (see `.env.example`), read via `$env/dynamic/private`.
- Provider picked from env: `GEMINI_API_KEY` (default, free tier), OpenAI-compatible (`OPENAI_BASE_URL`/`OPENAI_API_KEY`/`OPENAI_MODEL`), or `ANTHROPIC_API_KEY`. `AI_PROVIDER` forces one.
- Per-IP rate limit `RATE_LIMIT_PER_HOUR` (default 20).
- Roadmap: `.agents/docs/proposals/P01-svelte-migration-and-ai.md` (next: A2 streamed narrator, A3 oracle).
- **Next up: `.agents/docs/proposals/P02-oracle-and-memory.md`** — "Ask the oracle" + "Show the dice", with
  sessions and cached AI vocabularies (plus theme autocomplete) in Supabase project TMI. The database is
  already created (`supabase/migrations/20260930_charlatan_oracle.sql`); the app code is pending.

## Deploy

- Production: VPS, Node + pm2 behind nginx. Push to `master` → CI `deploy` job runs `scripts/deploy.sh` over SSH (needs `DEPLOY_*` repo secrets). Details: `.agents/docs/artifacts/A50-deploy.md`.
- Every PR also gets a Vercel preview (no AI key there).
- Never commit `.env` or any key.
