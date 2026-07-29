#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../../../.." && pwd)"

RITMIKA_DB_WRITE_CONFIRM=yes \
    npx --no-install tsx "$SCRIPT_DIR/mirror_historical_evidence_media.ts" "$@"
