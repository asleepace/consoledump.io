#!/usr/bin/env bash
#
# Deploys the latest main. Stops at the first failure: it used to carry on
# past a failed pull and restart the old build.

set -euo pipefail

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
