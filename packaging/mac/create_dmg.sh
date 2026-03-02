#!/usr/bin/env bash
# Create Aicraw.dmg for macOS.
# Run from repo root after desktop_build.sh:
#   bash packaging/mac/create_dmg.sh
# Output: dist/Aicraw.dmg
set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT"

DIST_DIR="$REPO_ROOT/dist"
if [[ -d "$DIST_DIR/Aicraw.app" ]]; then
  SOURCE="$DIST_DIR/Aicraw.app"
elif [[ -d "$DIST_DIR/Aicraw" ]]; then
  SOURCE="$DIST_DIR/Aicraw"
else
  echo "Error: dist/Aicraw or dist/Aicraw.app not found. Run desktop_build.sh first."
  exit 1
fi
DMG_OUT="$DIST_DIR/Aicraw.dmg"
VOLNAME="Aicraw"

# Prefer create-dmg if available (nicer DMG with Applications link)
if command -v create-dmg &>/dev/null; then
  echo "[create_dmg] Using create-dmg..."
  STAGING=$(mktemp -d)
  trap "rm -rf $STAGING" EXIT
  cp -R "$SOURCE" "$STAGING/$(basename "$SOURCE")"
  create-dmg \
    --volname "$VOLNAME" \
    --window-size 500 350 \
    --app-drop-link 150 150 \
    --skip-jenkins \
    "$DMG_OUT" \
    "$STAGING"
else
  echo "[create_dmg] Using hdiutil (install create-dmg for prettier DMG)..."
  rm -f "$DMG_OUT"
  hdiutil create -volname "$VOLNAME" -srcfolder "$SOURCE" -ov -format UDZO "$DMG_OUT"
fi

echo "[create_dmg] Done: $DMG_OUT"
