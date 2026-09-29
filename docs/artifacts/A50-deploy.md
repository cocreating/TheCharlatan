# A50 - Deployment

The app is a SvelteKit project built with `@sveltejs/adapter-node`: `npm run build`
produces a standalone Node server in `build/`. It is served at
**https://themostimportant.page/about/charlatans** on a VPS, behind nginx, and kept
alive by pm2. Pushes to `master` deploy automatically over SSH (see below).

## Base path

`svelte.config.js` sets `paths.base` to `/about/charlatans`. Override it at build time
with `BASE_PATH` (e.g. `BASE_PATH='' npm run build` to serve from a domain root).
In dev the app lives at `http://localhost:5173/about/charlatans`.

## 1. One-time server setup

Requirements: Node ≥ 22.9, git, pm2 (`npm install -g pm2`).

```bash
# As the user that will run the app
git clone https://github.com/cocreating/TheCharlatan.git ~/apps/TheCharlatan
cd ~/apps/TheCharlatan
cp .env.example .env        # then fill in ANTHROPIC_API_KEY
chmod 600 .env
bash scripts/deploy.sh ~/apps/TheCharlatan   # install, build, pm2 start
pm2 startup                 # follow its instructions so pm2 survives reboots
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
| `ANTHROPIC_API_KEY` | Claude API key for theme generation. Read only on the server (`$env/dynamic/private`) |
| `RATE_LIMIT_PER_HOUR` | Theme generations per IP per hour (default 20) |

Also set a **monthly spend limit** for the key in the Anthropic Console as a hard cap.

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
To deploy by hand instead: `bash scripts/deploy.sh <app-dir>` on the server.

## Vercel previews

The repo is also connected to a Vercel project, which builds a preview for every PR.
When `VERCEL` is set, `svelte.config.js` switches to `@sveltejs/adapter-vercel` and
serves from the domain root. Production stays on the VPS (`adapter-node`). Previews
have no `ANTHROPIC_API_KEY`, so SUMMON answers "AI is not configured" there.
