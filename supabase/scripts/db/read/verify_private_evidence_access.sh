#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
npx --no-install tsx "$SCRIPT_DIR/verify_private_evidence_access.ts"
