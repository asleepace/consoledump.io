#!/usr/bin/env bash

echo "starting deployment..."

git fetch origin

echo "fetching lastest changes..."

git stash .
git pull --force

echo "building application..."

bun install

echo "restarting..."

pm2 restart "consoledump.io"

echo "done!"
