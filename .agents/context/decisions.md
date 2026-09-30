# Decisions

Newest first. One entry per decision: what was decided and why.

## 2026-09-30 — Intro screen

- **The piece opens with an intro dialog** (`IntroScreen.svelte`, native `<dialog>` + `showModal()` so the page
  behind is inert). "Begin with sound" / "Begin in silence" set AUDIO and start playback; the click is the user
  gesture browsers require before speech and Web Audio. Escape begins in silence. Shown on every load (no storage).

## 2026-09-30 — Visual/UI pass

- **One palette, as CSS tokens.** `src/app.css` holds every colour (surfaces, text levels, `--c-*` word types);
  the canvas reads them at start-up (`loadThemeColors` in `render.ts`), so graph, story and overlay match.
- **Fonts self-hosted via Fontsource** (IBM Plex Mono for the UI, Fraunces for story text and the overlay),
  not Google Fonts, to avoid a third-party request.
- **Controls:** AUDIO and GLITCH are toggle buttons (`aria-pressed`) like PLAY/RESET; the whole bar is
  right-aligned and in the layout flow (the graph ends above it) instead of fixed on top of it.
- **Mobile:** theme + oracle on top, story docked at the bottom. Reduced motion is respected (overlay, glitch
  shake, CSS animations). Canvas renders at devicePixelRatio (capped at 2).

## 2026-09-30

- **Speech can never hang playback.** In production the oracle stayed on "answering" with audio on: Chrome
  sometimes fires neither `onend` nor `onerror` (unreferenced utterance collected, `speak()` right after
  `cancel()`, a stalled remote voice), so `await speak()` never returned. `speak()` now keeps a reference to the
  utterance and gives up after `(3000 + 150 ms/char) / rate`, cancelling the stuck queue. Also: the loop stops
  right after a step that ends playback, and an oracle answer that hits a dead end ends there instead of waiting.
- **P02 implemented (oracle + Supabase memory), PR to `master`.** Closing the WIP: `Oracle.respond` no longer
  compares `phase` after the replay; a run counter (bumped by close) and a `skipped` flag decide instead, so
  a STOP during the replay never gets overwritten by "revealed". The suggestion `<li>`s keep only a click
  handler (keyboard is on the combobox input via `aria-activedescendant`), with a justified `svelte-ignore`.
  `dist/` added to the ESLint ignores. Tested in headless Chromium without Supabase: full flow, SKIP, STOP;
  TTS not testable headless.
- **Live at https://themostimportant.page/about/charlatans.** Runs as the Plesk subscription user of
  themostimportant.page (not root), Node 22 via nvm, pm2 with a systemd startup unit, nginx block in
  Plesk's "Additional nginx directives". Details in A50 → "Production setup".
- **Production model: `gemini-flash-lite-latest`** (`GEMINI_MODEL` in the server `.env`). `gemini-flash-latest`
  was returning 503 "high demand" on the free tier.
- **HTTP 503 from the AI provider now counts as "busy"**, like 429, so users see "The oracle is busy"
  instead of "unreachable" (Gemini and OpenAI-compatible providers).
- **The repo stays public.** Checked: no hosts, users or keys in tracked files or history. Secrets live only
  in the server `.env` and (later) in GitHub Actions secrets. Nothing credential-like goes into `.agents/`.
- **CI deploy on:** `DEPLOY_*` secrets set; pushes to `master` (and manual runs of the workflow on `master`)
  deploy to the VPS as the subscription user with a dedicated key. No more manual deploys.
- **Stray copies now point to the canonical URL.** GitHub Pages: the API refuses to unpublish it
  ("not allowed"), so the `gh-pages` branch now holds only a redirect page (`index.html` + `404.html`).
  Vercel: `src/hooks.server.ts` answers 308 → canonical on the production deployment
  (`VERCEL_ENV=production` or host `the-charlatan.vercel.app`); PR previews still work.
  The owner can still unpublish Pages from Settings → Pages if wanted.

- **Dependabot alerts: 24 stale alerts dismissed as "inaccurate".** All were dev dependencies from the old
  React lockfile; the current `package-lock.json` already has patched versions (`npm audit`: 0). The repo's
  dependency graph API answered 404, so Dependabot hadn't rescanned. If alerts reappear, check `npm audit`
  first; a real one gets fixed with `npm audit fix` + tests, not dismissed.

## 2026-09-29

- **Agent files live in `.agents/`** (docs in `.agents/docs/`, working memory in `.agents/context/`). The owner's convention for all projects.
- **AI provider: Gemini free tier by default** (`GEMINI_API_KEY`, model alias `gemini-flash-latest`). OpenAI-compatible APIs and Claude stay supported through env vars; the owner is not using a paid key for now.
- **Theme → vocabulary (A1) is the first AI feature.** Per-IP rate limit, 20 generations/hour by default (`RATE_LIMIT_PER_HOUR`). Next on the roadmap: A2 streamed narrator, A3 oracle.
- **Hosting: own VPS with Node.js** at `themostimportant.page/about/charlatans`, pm2 behind nginx. SvelteKit `adapter-node`; `paths.base = /about/charlatans`.
- **Deploys: GitHub Actions → SSH → `scripts/deploy.sh`.** Agents can't SSH from the cloud sandbox (port 22 blocked), so the deploy runs from CI with `DEPLOY_*` repo secrets. GitHub Pages deploy was retired (the site itself was left published; see 2026-09-30).
- **Vercel previews kept for PRs** (`adapter-vercel` when `VERCEL=1`), served from the preview domain root, without an AI key.
- **App language: English only** for now. The owner writes in Spanish; agents answer in Spanish.
- **Framework: React → SvelteKit + Svelte 5 runes, native CSS only** (no Tailwind, no inline styles). The PLAY/PAUSE label intentionally shows the current state (commit 76d7ba5).
