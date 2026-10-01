# Decisions

Newest first. One entry per decision: what was decided and why.

## 2026-10-01 — Interaction flow: playback never stalls; the oracle asks for a reading

- **Reset, summoning a theme and ORIGINAL no longer stop playback.** Before, the story went blank and still after
  SUMMON until the visitor found the play button. Now the next step opens the new story; a paused story stays paused.
- **Dead ends in free playback start a new story** instead of stopping in silence (the oracle still ends its answer there).
- **The play button reads PLAYING / PAUSED** (owner's call): still the current state, as decided on 2026-01-28,
  but worded so it can't be mistaken for the action. Lit while playing; `aria-label` names state and action.
- **Oracle, after YES: "What did it tell you?"** An optional line in the visitor's words, shown back after the dice
  ("You heard: …. The dice only rolled numbers."). Never sent to the server.
- **ASK THE SAME AGAIN**: the same question, a new seed; the previous answer is shown beside the new one, so the
  confident answer visibly changes. ASK AGAIN became ASK SOMETHING ELSE.
- **"Others asked"** after the reveal: up to 3 questions picked at random from the latest 30 that kept their words
  and got a reaction (`GET api/sessions/echoes`). Visitors already agree their question is "kept as part of the piece".
- **Moderation: `charlatan_sessions.listed`** (default true; migration `charlatan_sessions_listed`). `listed = false`
  hides a session from the echoes and from the running number. The agent's own test session of 2026-10-01 was hidden this way.
- **Small samples get counts, not percentages**: below `MIN_SAMPLE_FOR_PCT` (30) answers, "7 of the 8 people … so far".
- **The oracle panel beckons** (a soft glow, three times) once the free story has spoken a few sentences, until the
  visitor touches it. Respects `prefers-reduced-motion`.
- **Story panel fades older lines** under its header instead of cutting them (mobile showed half a line).

## 2026-09-30 — Prompt v4: subjects that act, spoken connectors

- **Tested prompt v3 live** (theme "zz scene test lighthouse keeper", hidden from suggestions with `listed = false`):
  Gemini follows the scene schema. But some subjects were places or furniture ("the spiral staircase touches…")
  and some connectors were formal ("subsequently", "furthermore").
- **v4** asks for subjects that can act (a person, creature, force or moving thing; never a place, furniture or
  part of a building) and for short spoken connectors, naming the formal ones to avoid. The seed swaps
  "consequently" for "still". `PROMPT_VERSION` → `v4`.

## 2026-09-30 — Vocabularies in scenes (P03 phase 3)

- **A vocabulary is 4 scenes plus shared connectors.** Each scene is a small world inside the theme; nodes keep
  their scene. Links stay inside their scene 85% of the time; connectors link into every scene.
- **The walker lingers**: links that leave the story's current scene weigh 0.25. Before this, the scene changed
  about once per sentence; now a scene lasts about 2.5 sentences and still drifts.
- **Scenes show in the graph** as lobes (a weak force towards a point per scene); not coloured, since colour
  already means the word type.
- **`PROMPT_VERSION` v3**: the answer shape changed, so v2 vocabularies are no longer served.

## 2026-09-30 — Stories in sentences (P03 phases 1 + 2)

- **The walker speaks in sentences**: `[connector,] subject (action object | state) [space] [time].` The owner
  found the stories too disconnected; the old type rules allowed chains that were never sentences and nothing
  ever ended. `CONNECTION_RULES` now says what may follow each role; the walker only takes links that fit.
- **`state` is now a predicate** ("falls silent"), not a bare adjective; connectors open a sentence with a comma.
  Types keep their names so colours, legend and voice stay as they were.
- **Coherence without AI.** An object can come back as the next sentence's subject (objects get a second set of
  links), and the walker is offered the subject and object of the sentence just said as echoes (no link, no
  penalty). Chosen over an AI narrator: free, deterministic, works on the seed and in previews, and the dice
  still decide every word.
- **Roles are derived, not stored** (`rolesOf`): old sessions and the dice replay need nothing new.
- **`PROMPT_VERSION` v2.** Vocabularies cached with v1 no longer fit the grammar and are not served.
- Next (P03 phase 3): the AI writes the vocabulary in scenes, links mostly within a scene.

## 2026-09-30 — Oracle folds on mobile

- **On screens under 768px the oracle's question form starts folded** behind an ASK THE ORACLE toggle, so the
  graph stays visible. CSS-only on desktop (the toggle is hidden there). Only the idle form folds: once a question
  is asked, the answer, dice and reveal always show.

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
- **Framework: React → SvelteKit + Svelte 5 runes, native CSS only** (no Tailwind, no inline styles). The PLAY/PAUSE label shows the current state (commit 76d7ba5); since 2026-10-01 it reads PLAYING/PAUSED.
