#!/usr/bin/env bash
# Run LinClaw with Electron (spawns Python aicraw app).
# Run from repo root: bash scripts/electron_run.sh
#
# Prerequisites:
#   - pip install -e .   (aicraw installed)
#   - cd console && pnpm build   (optional, for built console)
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Build console if dist missing
if [ ! -d "console/dist" ]; then
  echo "[electron_run] Building console..."
  (cd console && pnpm install --no-frozen-lockfile && pnpm run build)
fi

# Install electron deps and run
cd electron
pnpm install
pnpm start
