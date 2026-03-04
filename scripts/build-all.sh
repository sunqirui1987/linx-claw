#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[build-all] 1/2 build python backend"
pnpm run build:python

echo "[build-all] 2/2 build desktop for current platform (electron-builder)"
pnpm run build:electron

echo "[build-all] done"
