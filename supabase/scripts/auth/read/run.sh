#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec npx --no-install tsx "$SCRIPT_DIR/run.ts" "$@"
