#!/usr/bin/env bash
# Safe foreground VPS launcher for the *existing* authenticated application.
# No credentials or runtime databases are ever created by this script.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
bash Deploy/VPS/preflight.sh
if [[ "${IATB_TRADING_LIVE:-0}" == 1 || "${IATB_TRADING_LIVE:-0}" == true ]]; then
  echo "[WARN] Existing SAFE launcher forces IATB_TRADING_LIVE=0 until VPS qualification; cannot force trading ON here." >&2
fi
echo "[INFO] Starting IA-TB $(cat App/REVISION 2>/dev/null || cat App/VERSION) using existing authenticated, foreground SAFE launcher."
echo "[INFO] Services bind loopback. No automatic public exposure or LIVE order."
exec bash App/start_auth21_local_safe.command
