#!/usr/bin/env bash
#
# Deploys the latest main. Stops at the first failure: it used to carry on
# past a failed pull and restart the old build.

set -euo pipefail

# A non-interactive shell (`ssh host 'cd consoledump.io && ./deploy.sh'`) skips
# ~/.zshrc, so asdf's node, and with it pm2, is missing. The build would still
# replace dist/, then `pm2 restart` would fail and leave the old server running
# against the new chunks. Put the tools on PATH ourselves, and check them before
# building so a failure leaves the running site untouched.
export PATH="${ASDF_DATA_DIR:-$HOME/.asdf}/shims:$HOME/.bun/bin:$PATH"

for tool in bun node pm2; do
  if ! command -v "$tool" >/dev/null; then
    echo "$tool not found on PATH, aborting before the build" >&2
    exit 1
  fi
done
if ! pm2 ping >/dev/null; then
  echo "pm2 can't reach its daemon, aborting before the build" >&2
  exit 1
fi

echo "fetching latest changes..."
git fetch origin
# `bun install` rewrites bun.lock on the server; set local changes aside.
git stash
git pull --ff-only origin main

echo "building application..."
bun install
bun run build

echo "restarting..."
pm2 restart "consoledump.io"

echo "done!"
