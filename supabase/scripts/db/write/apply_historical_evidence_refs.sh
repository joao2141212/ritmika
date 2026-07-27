#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../../../.." && pwd)"

RITMIKA_DB_WRITE_CONFIRM=yes \
    "$SCRIPT_DIR/run.sh" \
    "$REPO_ROOT/supabase/migrations/20260727_ritmika_historical_evidence_refs.sql"
