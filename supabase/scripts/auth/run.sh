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
    workspace)
        exec bash "$SCRIPT_DIR/read/run.sh" "$SCRIPT_DIR/read/workspace.mjs" "$@"
        ;;
    verify-workspace-login)
        exec bash "$SCRIPT_DIR/read/run.sh" "$SCRIPT_DIR/read/verify-workspace-login.mjs" "$@"
        ;;
    verify-all-workspace-logins)
        exec bash "$SCRIPT_DIR/read/run.sh" "$SCRIPT_DIR/read/verify-all-workspace-logins.mjs" "$@"
        ;;
    environment)
        exec bash "$SCRIPT_DIR/read/run.sh" "$SCRIPT_DIR/read/environment.mjs" "$@"
        ;;
    reset-password)
        exec bash "$SCRIPT_DIR/write/run.sh" "$SCRIPT_DIR/write/reset-password.mjs" "$@"
        ;;
    provision-workspace-logins)
        exec bash "$SCRIPT_DIR/write/run.sh" "$SCRIPT_DIR/write/provision-workspace-logins.mjs" "$@"
        ;;
    set-access)
        exec bash "$SCRIPT_DIR/write/run.sh" "$SCRIPT_DIR/write/set-access.mjs" "$@"
        ;;
    account-state)
        exec bash "$SCRIPT_DIR/write/run.sh" "$SCRIPT_DIR/write/set-account-state.mjs" "$@"
        ;;
    *)
        echo "usage: auth/run.sh {environment|inventory|account|workspace|verify-workspace-login|verify-all-workspace-logins|reset-password|provision-workspace-logins|set-access|account-state} [args]" >&2
        exit 2
        ;;
esac
