#!/usr/bin/env bash
# Build LinClaw desktop app (PyInstaller).
# Run from repo root: bash scripts/desktop_build.sh
# Output: dist/LinClaw/ (onedir bundle)
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

CONSOLE_DIR="$REPO_ROOT/console"
CONSOLE_DEST="$REPO_ROOT/src/aicraw/console"
SPEC="$REPO_ROOT/packaging/aicraw_desktop.spec"

echo "[desktop_build] Building console frontend..."
(cd "$CONSOLE_DIR" && pnpm install --no-frozen-lockfile)
(cd "$CONSOLE_DIR" && pnpm run build)

echo "[desktop_build] Copying console/dist/* -> src/aicraw/console/..."
rm -rf "$CONSOLE_DEST"/*
mkdir -p "$CONSOLE_DEST"
cp -R "$CONSOLE_DIR/dist/"* "$CONSOLE_DEST/"

echo "[desktop_build] Installing build deps (pyinstaller, aicraw[desktop])..."
if [ -d "$REPO_ROOT/.venv" ]; then
  source "$REPO_ROOT/.venv/bin/activate"
  pip install --quiet pyinstaller ".[desktop]"
else
  python3 -m venv "$REPO_ROOT/.venv"
  source "$REPO_ROOT/.venv/bin/activate"
  pip install --quiet pyinstaller ".[desktop]"
fi

echo "[desktop_build] Running PyInstaller..."
pyinstaller --noconfirm --clean "$SPEC"

echo "[desktop_build] Done. Output: $REPO_ROOT/dist/LinClaw/"
