#!/usr/bin/env bash
# Safe NexGameWorld release selection. Does not start the service.
set -euo pipefail
BASE=/opt/nexgameworld
RELEASE="${1:-}"
if [[ ! "$RELEASE" =~ ^staging-[0-9]+-[0-9]+$ ]]; then
  echo "Usage: bash select-release.sh staging-RUNID-ATTEMPT" >&2; exit 2
fi
TARGET="$BASE/releases/$RELEASE"
test -f "$TARGET/index.js" && test -d "$TARGET/node_modules/ws" && test -d "$TARGET/node_modules/pg"
node --check "$TARGET/index.js"
test -f "$TARGET/.source-commit"
if [[ -e "$BASE/current" && ! -L "$BASE/current" ]]; then
  echo "Refusing to replace a non-symlink current" >&2; exit 3
fi
ln -sfn "$TARGET" "$BASE/.current-next"
mv -Tf "$BASE/.current-next" "$BASE/current"
echo "CURRENT_READY:$RELEASE"
echo "No service was started. No database connection attempted."
