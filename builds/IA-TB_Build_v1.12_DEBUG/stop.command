#!/bin/bash
cd "$(dirname "$0")" || exit 1

http_get(){ curl -fsS --connect-timeout 1 --max-time 2 "$1" 2>/dev/null || true; }
json_pid(){ echo "$1" | sed -n 's/.*"pid"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -1; }
port_busy(){
  port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  fi
  if command -v nc >/dev/null 2>&1; then nc -z 127.0.0.1 "$port" >/dev/null 2>&1 && return 0; fi
  curl -s --connect-timeout 1 --max-time 1 "http://127.0.0.1:$port/" >/dev/null 2>&1 && return 0
  return 1
}
wait_port_free(){
  port="$1"; i=0
  while [ "$i" -lt 20 ]; do
    port_busy "$port" || return 0
    sleep 0.2
    i=$((i+1))
  done
  return 1
}
stop_known_on_port(){
  port="$1"
  a="$(http_get http://127.0.0.1:$port/api/health)"
  r="$(http_get http://127.0.0.1:$port/router-health)"
  k="$(http_get http://127.0.0.1:$port/health)"
  ui="$(http_get http://127.0.0.1:$port/ui-health)"
  pid=""; label=""
  if echo "$ui" | grep -q 'IA-TB UI Service'; then pid="$(json_pid "$ui")"; label="UI Service"
  elif echo "$r" | grep -q '"router"[[:space:]]*:[[:space:]]*true'; then pid="$(json_pid "$r")"; label="Router"
  elif echo "$a" | grep -q 'Crypto Chart Viewer IA Trader'; then pid="$(json_pid "$a")"; label="TradingBot"
  elif echo "$k" | grep -q 'Kraken Add-On'; then pid="$(json_pid "$k")"; label="Kraken Add-On"
  elif echo "$k" | grep -q 'IA-TB Indicator Engine'; then pid="$(json_pid "$k")"; label="Indicator Engine"
  elif echo "$k" | grep -q 'IA-TB Market Data'; then pid="$(json_pid "$k")"; label="Market Data"
  elif echo "$k" | grep -q 'IA-TB Liquidity Engine'; then pid="$(json_pid "$k")"; label="Liquidity Engine"
  elif echo "$k" | grep -q 'IA-TB Fundamental Engine'; then pid="$(json_pid "$k")"; label="Fundamental Engine"
  elif echo "$k" | grep -q 'IA-TB Trading Engine'; then pid="$(json_pid "$k")"; label="Trading Engine"
  elif echo "$k" | grep -q 'IA-TB Firewall Service'; then pid="$(json_pid "$k")"; label="Firewall Service"
  elif echo "$k" | grep -q 'IA-TB Strategy Engine v2'; then pid="$(json_pid "$k")"; label="Strategy Engine v2"
  elif echo "$k" | grep -q 'IA-TB Risk Engine'; then pid="$(json_pid "$k")"; label="Risk Manager Engine"
  elif echo "$k" | grep -q 'IA-TB Portfolio Engine'; then pid="$(json_pid "$k")"; label="Portfolio Engine"
  fi

  if [ -n "$pid" ]; then
    echo "Arret $label sur port $port (PID $pid)"
    kill "$pid" >/dev/null 2>&1 || true
    if ! wait_port_free "$port"; then
      echo "$label ne s'est pas arrete proprement -> arret force PID $pid"
      kill -9 "$pid" >/dev/null 2>&1 || true
      wait_port_free "$port" || true
    fi
  fi

  # Fallback limite a un service IA-TB qui a ete formellement reconnu par son endpoint health.
  if port_busy "$port" && [ -n "$label" ] && command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ')"
    for x in $pids; do
      [ -n "$x" ] || continue
      echo "Nettoyage listener residuel $label sur port $port (PID $x)"
      kill "$x" >/dev/null 2>&1 || true
    done
    wait_port_free "$port" || {
      for x in $pids; do [ -n "$x" ] && kill -9 "$x" >/dev/null 2>&1 || true; done
      wait_port_free "$port" || true
    }
  fi

  if port_busy "$port"; then
    if [ -n "$label" ]; then echo "ATTENTION: le port $port ($label) est encore utilise apres tentative d'arret."
    else echo "ATTENTION: le port $port est utilise par un processus non identifie; aucun processus externe n'a ete tue."; fi
    return 1
  fi
  return 0
}

failed=0
for port in 8000 8001 8011 8012 8013 8014 8015 8016 8017 8018 8019 8020 8021 3000; do
  stop_known_on_port "$port" || failed=1
done

if [ "$failed" -eq 0 ]; then
  echo "Arret IA-TB termine. Tous les ports connus sont libres."
  exit 0
fi

echo "Arret IA-TB termine avec avertissement: au moins un port non-IA-TB reste occupe."
exit 1
