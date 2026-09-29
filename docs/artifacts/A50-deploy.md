# A50 - Deployment

The app is a SvelteKit project built with `@sveltejs/adapter-node`: `npm run build`
produces a standalone Node server in `build/`. It is served at
**https://themostimportant.page/about/charlatans** on a VPS, behind a reverse proxy.

## Base path

`svelte.config.js` sets `paths.base` to `/about/charlatans`. Override it at build time
with `BASE_PATH` (e.g. `BASE_PATH='' npm run build` to serve from a domain root).
In dev the app lives at `http://localhost:5173/about/charlatans`.

## Build & run on the server

```bash
git pull
npm ci
npm run build
PORT=3000 ORIGIN=https://themostimportant.page npm start   # = node --env-file-if-exists=.env build
```

Keep it alive with a process manager, e.g. `pm2 start npm --name charlatans -- start`
or a systemd unit (`ExecStart=/usr/bin/node --env-file=.env build`, `WorkingDirectory=`
the repo).

## Environment (`.env`, never committed)

```bash
PORT=3000
ORIGIN=https://themostimportant.page
# When the AI features land:
# ANTHROPIC_API_KEY=sk-ant-...
```

`.env` is git-ignored. Server-only secrets are read through `$env/dynamic/private`
and never reach the browser bundle.

## Reverse proxy (nginx)

The base path is kept in the URL, so proxy it through unchanged (no trailing slash
on `proxy_pass`):

```nginx
location /about/charlatans {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    # Needed later for streamed AI responses (SSE)
    proxy_buffering off;
}
```

## Vercel previews

The repo is also connected to a Vercel project, which builds a preview for every PR.
When `VERCEL` is set, `svelte.config.js` switches to `@sveltejs/adapter-vercel` and
serves from the domain root. Production stays on the VPS (`adapter-node`).

## CI

`.github/workflows/ci.yml` runs `check`, `lint`, `test` and `build` on every push and PR.
