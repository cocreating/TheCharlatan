# A50 - Deployment

The app is a SvelteKit project built with `@sveltejs/adapter-node`: `npm run build`
produces a standalone Node server in `build/`. It is served at
**https://themostimportant.page/about/charlatans** on a VPS, behind nginx, and kept
alive by pm2. Pushes to `master` deploy automatically over SSH (see below).

## Base path

`svelte.config.js` sets `paths.base` to `/about/charlatans`. Override it at build time
with `BASE_PATH` (e.g. `BASE_PATH='' npm run build` to serve from a domain root).
In dev the app lives at `http://localhost:5173/about/charlatans`.

## Production setup (as deployed on 2026-09-30)

What is actually running, so the next session doesn't have to rediscover it.
No hostnames, users or keys here — those live on the server and in the owner's `~/.ssh/config`.

- **Server:** the Plesk VPS that also hosts themostimportant.page.
- **User:** the app runs as the **Plesk subscription user of themostimportant.page**, not root.
  The clone is at `~/apps/TheCharlatan` in that user's home (`/var/www/vhosts/themostimportant.page`).
- **Node:** Plesk only ships Node ≤ 21, so Node 22 is installed with **nvm** in that home
  (`nvm alias default 22`). pm2 is installed globally inside that nvm Node.
  `scripts/deploy.sh` sources `~/.nvm/nvm.sh`, so non-interactive SSH finds both.
- **pm2:** process `charlatans` (`npm start`), list saved with `pm2 save`. Reboots are covered by a
  systemd unit `pm2-<subscription user>`, registered once as root with
  `pm2 startup systemd -u <user> --hp /var/www/vhosts/themostimportant.page`
  (run with the full path to that user's nvm `pm2`).
- **nginx:** the `location /about/charlatans` block from section 3 is pasted in Plesk →
  themostimportant.page → Apache & nginx Settings → **Additional nginx directives**
  (a single field for HTTP and HTTPS). Don't edit nginx files by hand; Plesk regenerates them.
- **AI:** Gemini with `GEMINI_MODEL=gemini-flash-lite-latest`. The default `gemini-flash-latest`
  answered 503 "high demand" on every try on launch day; flash-lite worked first time.
- **Deploys:** automatic. The `DEPLOY_*` secrets are set (2026-09-30); every push to `master` deploys
  after `check` passes, and Actions → CI → "Run workflow" on `master` redeploys without a commit.
  The CI key is a dedicated ed25519 key authorized only for the subscription user
  (comment `github-actions charlatans deploy` in its `authorized_keys`).
  By hand, if ever needed: `bash ~/apps/TheCharlatan/scripts/deploy.sh ~/apps/TheCharlatan` on the server.
- **SSH gotchas on this server:** root login by password is disabled (keys only) and Fail2Ban bans
  an IP after a couple of failed root logins. Use key-based access only.

## 1. One-time server setup

Requirements: Node ≥ 22.9, git, pm2 (`npm install -g pm2`).

```bash
# As the user that will run the app
git clone https://github.com/cocreating/TheCharlatan.git ~/apps/TheCharlatan
cd ~/apps/TheCharlatan
cp .env.example .env        # then fill in GEMINI_API_KEY (or another provider)
chmod 600 .env
bash scripts/deploy.sh ~/apps/TheCharlatan   # install, build, pm2 start
pm2 startup                 # follow its instructions so pm2 survives reboots
                            # (needs root; see "Production setup" below)
```

If the repository is private, give the server read access (a GitHub deploy key or
an HTTPS token in the remote URL).

## 2. Environment (`.env`, never committed)

See `.env.example`:

| Variable | Purpose |
|---|---|
| `PORT` | Port the Node server listens on (e.g. `3000`) |
| `ORIGIN` | `https://themostimportant.page` — needed behind a proxy |
| `ADDRESS_HEADER` / `XFF_DEPTH` | `X-Forwarded-For` / `1`: real client IPs for the rate limit. Without them every visitor shares one quota |
| `GEMINI_API_KEY` | Free Google AI Studio key for theme generation (default provider). `GEMINI_MODEL` optional |
| `OPENAI_BASE_URL` / `OPENAI_API_KEY` / `OPENAI_MODEL` | Alternative: any OpenAI-compatible API (Groq, OpenRouter, Ollama...) |
| `ANTHROPIC_API_KEY` | Alternative: Claude (paid). `ANTHROPIC_MODEL` optional |
| `AI_PROVIDER` | Optional: force `gemini`, `openai` or `anthropic` when several keys are set |
| `RATE_LIMIT_PER_HOUR` | Theme generations per IP per hour (default 20) |

Keys are read only on the server (`$env/dynamic/private`) and never reach the browser.
Free tiers have their own daily quotas; when one runs out (429) or the model is overloaded
(503) the app answers "The oracle is busy".
For a paid provider, also set a monthly spend limit in its console.

## 3. Reverse proxy (nginx)

The base path is kept in the URL, so proxy it through unchanged (no trailing slash
on `proxy_pass`):

```nginx
location /about/charlatans {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 180s;   # theme generation can take ~a minute
    proxy_buffering off;       # needed later for streamed AI responses (SSE)
}
```

## 4. Automatic deploys (GitHub Actions → SSH)

`.github/workflows/ci.yml` runs `check`, `lint`, `test` and `build`; on pushes to
`master` a `deploy` job then pipes `scripts/deploy.sh` over SSH to the server, which
checks out the commit, runs `npm ci && npm run build` and reloads pm2.

Create a dedicated key pair (no passphrase) and authorize it on the server:

```bash
ssh-keygen -t ed25519 -f charlatans_deploy -N '' -C 'github-actions deploy'
# append charlatans_deploy.pub to ~/.ssh/authorized_keys of the deploy user
ssh-keyscan -p 22 themostimportant.page   # output → DEPLOY_KNOWN_HOSTS
```

Then add these **repository secrets** (GitHub → Settings → Secrets and variables → Actions):

| Secret | Value |
|---|---|
| `DEPLOY_HOST` | server hostname or IP |
| `DEPLOY_USER` | SSH user that owns the app and pm2 process |
| `DEPLOY_PATH` | absolute path of the clone, e.g. `/home/deploy/apps/TheCharlatan` |
| `DEPLOY_SSH_KEY` | contents of the private key `charlatans_deploy` |
| `DEPLOY_KNOWN_HOSTS` | output of `ssh-keyscan` (pins the host key; recommended) |
| `DEPLOY_PORT` | optional, defaults to 22 |

Until the secrets exist the job is skipped with a notice, so CI stays green.
The deploy job also runs on a manual `workflow_dispatch` of `master`.
To deploy by hand instead: `bash scripts/deploy.sh <app-dir>` on the server.

## Vercel previews

The repo is also connected to a Vercel project, which builds a preview for every PR.
When `VERCEL` is set, `svelte.config.js` switches to `@sveltejs/adapter-vercel` and
serves from the domain root. Production stays on the VPS (`adapter-node`). Previews
have no AI key, so SUMMON answers "AI is not configured" there.

## Other public copies

Both older copies now redirect to https://themostimportant.page/about/charlatans:

- **https://cocreating.github.io/TheCharlatan/** — GitHub Pages (legacy, `gh-pages` branch). The branch
  only contains a redirect page; the old build is in its git history.
- **https://the-charlatan.vercel.app/** — Vercel's production domain. `src/hooks.server.ts` returns a 308
  to the canonical URL when `VERCEL_ENV=production` (or on that hostname). PR previews are unaffected.
