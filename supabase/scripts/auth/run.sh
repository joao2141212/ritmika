#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
COMMAND="${1:-}"
shift || true

case "$COMMAND" in
    inventory)
        exec bash "$SCRIPT_DIR/read/run.sh" "$SCRIPT_DIR/read/inventory.mjs" "$@"
        ;;
    account)
        exec bash "$SCRIPT_DIR/read/run.sh" "$SCRIPT_DIR/read/account.mjs" "$@"
        ;;
    environment)
        exec bash "$SCRIPT_DIR/read/run.sh" "$SCRIPT_DIR/read/environment.mjs" "$@"
        ;;
    reset-password)
        exec bash "$SCRIPT_DIR/write/run.sh" "$SCRIPT_DIR/write/reset-password.mjs" "$@"
        ;;
    set-access)
        exec bash "$SCRIPT_DIR/write/run.sh" "$SCRIPT_DIR/write/set-access.mjs" "$@"
        ;;
    account-state)
        exec bash "$SCRIPT_DIR/write/run.sh" "$SCRIPT_DIR/write/set-account-state.mjs" "$@"
        ;;
    *)
        echo "usage: auth/run.sh {environment|inventory|account|reset-password|set-access|account-state} [args]" >&2
        exit 2
        ;;
esac
