#!/bin/bash
cd "$(dirname "$0")" || exit 1
http_get(){ curl -fsS --connect-timeout 1 --max-time 2 "$1" 2>/dev/null || true; }
json_pid(){ echo "$1" | sed -n 's/.*"pid"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -1; }
for port in 8000 8001 8011 8012 8013 8014 8015 8016 3000; do
  a="$(http_get http://127.0.0.1:$port/api/health)"
  r="$(http_get http://127.0.0.1:$port/router-health)"
  k="$(http_get http://127.0.0.1:$port/health)"
  pid=""; label=""
  if echo "$r" | grep -q '"router"[[:space:]]*:[[:space:]]*true'; then pid="$(json_pid "$r")"; label="Router";
  elif echo "$a" | grep -q 'Crypto Chart Viewer IA Trader'; then pid="$(json_pid "$a")"; label="TradingBot";
  elif echo "$k" | grep -q 'Kraken Add-On'; then pid="$(json_pid "$k")"; label="Kraken Add-On";
  elif echo "$k" | grep -q 'IA-TB Indicator Engine'; then pid="$(json_pid "$k")"; label="Indicator Engine";
  elif echo "$k" | grep -q 'IA-TB Market Data'; then pid="$(json_pid "$k")"; label="Market Data";
  elif echo "$k" | grep -q 'IA-TB Liquidity Engine'; then pid="$(json_pid "$k")"; label="Liquidity Engine";
  elif echo "$k" | grep -q 'IA-TB Fundamental Engine'; then pid="$(json_pid "$k")"; label="Fundamental Engine";
  elif echo "$k" | grep -q 'IA-TB Trading Engine'; then pid="$(json_pid "$k")"; label="Trading Engine"; fi
  if [ -n "$pid" ]; then echo "Arret $label sur port $port (PID $pid)"; kill "$pid" >/dev/null 2>&1 || true; fi
done
sleep 1
echo "Arret termine."
