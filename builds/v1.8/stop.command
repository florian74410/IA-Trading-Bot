#!/bin/bash
# IA-TB v1.8 DEV stop wrapper.
cd "$(dirname "$0")" || exit 1
/bin/bash "$PWD/stop_v1.7.9_base.command" || true
http_get(){ curl -fsS --connect-timeout 1 --max-time 2 "$1" 2>/dev/null || true; }
json_pid(){ echo "$1" | sed -n 's/.*"pid"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -1; }
for port in "${IATB_TRADING_FIREWALL_PORT:-8017}" "${IATB_DATA_FIREWALL_PORT:-8018}" "${IATB_RISK_ENGINE_PORT:-8019}"; do
 body="$(http_get "http://127.0.0.1:${port}/health")"; pid="$(json_pid "$body")"
 case "$body" in *"IA-TB Trading Firewall"*|*"DATA_COLLECTOR_FIREWALL"*|*"IA-TB Risk Engine"*) [ -n "$pid" ] && echo "Arret service v1.8 sur port $port (PID $pid)" && kill "$pid" >/dev/null 2>&1 || true;; esac
done
sleep 1
echo "Arrêt IA-TB v1.8 terminé."