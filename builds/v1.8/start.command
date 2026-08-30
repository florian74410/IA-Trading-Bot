#!/bin/bash
# IA-TB v1.8 DEV bootstrap: preserve v1.7.9 lifecycle and add protection/risk services.
cd "$(dirname "$0")" || exit 1
export IATB_RELEASE_VERSION="1.8.0"
TRADING_FIREWALL_PORT="${IATB_TRADING_FIREWALL_PORT:-8017}"
DATA_FIREWALL_PORT="${IATB_DATA_FIREWALL_PORT:-8018}"
RISK_PORT="${IATB_RISK_ENGINE_PORT:-8019}"
NODE_BIN="$PWD/.node/bin/node"
EXTRA_PIDS=""
http_get(){ curl -fsS --connect-timeout 1 --max-time 2 "$1" 2>/dev/null || true; }
json_pid(){ echo "$1" | sed -n 's/.*"pid"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -1; }
stop_extra(){
  for port in "$TRADING_FIREWALL_PORT" "$DATA_FIREWALL_PORT" "$RISK_PORT"; do
    body="$(http_get "http://127.0.0.1:${port}/health")"; pid="$(json_pid "$body")"
    case "$body" in *"IA-TB Trading Firewall"*|*"DATA_COLLECTOR_FIREWALL"*|*"IA-TB Risk Engine"*) [ -n "$pid" ] && kill "$pid" >/dev/null 2>&1 || true;; esac
  done
}
cleanup_v18(){ for p in $EXTRA_PIDS; do kill "$p" >/dev/null 2>&1 || true; done; stop_extra; }
trap cleanup_v18 EXIT INT TERM
stop_extra
bash "./install_runtime.command" || exit 1
[ -x "$NODE_BIN" ] || { echo "Node.js local introuvable."; exit 1; }
mkdir -p Core/TradingFirewall Core/DataCollectorFirewall Risk
: > Core/TradingFirewall/firewall.log
: > Core/DataCollectorFirewall/data_firewall.log
: > Risk/risk.log
IATB_TRADING_FIREWALL_PORT="$TRADING_FIREWALL_PORT" IATB_TRADING_ENGINE_PORT="${IATB_TRADING_ENGINE_PORT:-8016}" "$NODE_BIN" Core/TradingFirewall/firewall_service.js >> Core/TradingFirewall/firewall.log 2>&1 & EXTRA_PIDS="$EXTRA_PIDS $!"
IATB_DATA_FIREWALL_PORT="$DATA_FIREWALL_PORT" "$NODE_BIN" Core/DataCollectorFirewall/firewall_service.js >> Core/DataCollectorFirewall/data_firewall.log 2>&1 & EXTRA_PIDS="$EXTRA_PIDS $!"
IATB_RISK_ENGINE_PORT="$RISK_PORT" ROUTER_PORT="${ROUTER_PORT:-8000}" "$NODE_BIN" Risk/Engine/risk_service.js >> Risk/risk.log 2>&1 & EXTRA_PIDS="$EXTRA_PIDS $!"
echo "IA-TB v1.8 DEV : Trading Firewall 8017 · Data Firewall 8018 · Risk Engine 8019"
/bin/bash "$PWD/start_v1.7.9_base.command"
exit $?