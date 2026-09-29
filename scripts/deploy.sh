#!/usr/bin/env bash
# Runs ON the VPS (piped over SSH by .github/workflows/ci.yml, or run by hand):
#   bash scripts/deploy.sh /path/to/TheCharlatan [<commit>]
# Checks out the commit, installs, builds and (re)starts the pm2 process.
# The server's .env (ANTHROPIC_API_KEY, PORT, ORIGIN...) is git-ignored and left untouched.
set -euo pipefail

APP_DIR=${1:?usage: deploy.sh <app-dir> [<commit>]}
REF=${2:-origin/master}
NAME=${PM2_NAME:-charlatans}

# Non-interactive SSH sessions skip the profile; pick up nvm-installed node/pm2 if present.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$HOME/.nvm/nvm.sh"
fi

cd "$APP_DIR"
git fetch --quiet origin master
git checkout --quiet --detach "$REF"
echo "Deploying $(git rev-parse --short HEAD) to $APP_DIR"

npm ci --no-audit --no-fund
npm run build

if pm2 describe "$NAME" > /dev/null 2>&1; then
  pm2 reload "$NAME" --update-env
else
  pm2 start npm --name "$NAME" -- start
  pm2 save
fi
