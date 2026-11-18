#!/usr/bin/env bash
# Non-destructive VPS source/runtime prerequisites. Never prints secrets or boots Engines.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
SOURCE_ONLY=0
if [[ "${1:-}" == "--source-only" ]]; then SOURCE_ONLY=1; elif [[ $# -gt 0 ]]; then echo "Usage: bash Deploy/VPS/preflight.sh [--source-only]" >&2; exit 2; fi
required=(
  App/VERSION App/manifest.json App/package.json App/package-lock.json
  App/Core/Server/server.js App/Core/Router/router.js
  App/Engines/Supervisor/supervisor_service.js App/Engines/Supervisor/Engine/supervisor-engine.js
  App/Engines/Supervisor/Engine/working-memory.js
  App/Engines/Firewall/firewall_service.js
  App/Engines/MarketData/market_data_service.js
  App/Engines/Indicators/Engine/indicator_service.js
  App/Engines/Liquidity/Engine/liquidity_service.js
  App/Engines/Fundamental/Engine/fundamental_service.js
  App/Engines/Risk/Engine/risk_service.js
  App/Engines/Portfolio/Engine/portfolio_service.js
  App/Engines/Strategy/Engine/strategy_service.js
  App/Engines/Trading/trading_service.js
  App/UI/Gateway/ui_service.js
  App/start_auth21_local_safe.command
)
for file in "${required[@]}"; do
  if [[ ! -f "$file" ]]; then echo "[FAIL] Missing source: $file" >&2; exit 1; fi
done
if [[ "$(cat App/VERSION)" != "3.0.1-dev.1" && "$(cat App/VERSION)" != "3.0.2-dev.1" && "$(cat App/VERSION)" != "3.1.0" ]]; then echo "[FAIL] Unexpected source version" >&2; exit 1; fi
if ! command -v node >/dev/null || [[ "$(node --version)" != v22.* ]]; then
  echo "[FAIL] Node.js 22.x is required." >&2
  exit 1
fi
if ! command -v npm >/dev/null; then echo "[FAIL] npm is missing." >&2; exit 1; fi
node App/Tools_validate_release_version.js
echo "[OK] Complete source tree and version consistency."
if [[ "$SOURCE_ONLY" == 1 ]]; then
  echo "[INFO] Source-only preflight: not checking private Auth21 data or runtime deps."
  exit 0
fi
if [[ ! -d App/node_modules ]]; then
  echo "[FAIL] App/node_modules missing. Run bash Deploy/VPS/prepare_vps.sh first." >&2
  exit 1
fi
PRIVATE="${IATB_AUTH21_LOCAL_PRIVATE:-$HOME/IA-TB-v23-Auth21-private}"
if [[ ! -d "$PRIVATE" ]]; then echo "[FAIL] Existing Auth21 private directory not found. Set IATB_AUTH21_LOCAL_PRIVATE." >&2; exit 1; fi
for f in data/Database/clients.sqlite data/Security/client_master.key tls/localhost.crt tls/localhost.key; do
  if [[ ! -f "$PRIVATE/$f" ]]; then echo "[FAIL] Missing Auth21 private prerequisite: $f" >&2; exit 1; fi
done
if [[ "$PRIVATE" == "$ROOT"* ]]; then
  echo "[FAIL] Auth21 private data must be stored outside source/release directory." >&2
  exit 1
fi
echo "[OK] Runtime prerequisites present (no services started)."
echo "[INFO] This does not attest successful VPS startup, external access, or exchange qualification."
