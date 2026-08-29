#!/bin/bash
cd "$(dirname "$0")" || exit 1

APP_NAME="Crypto Chart Viewer IA Trader"
CORE_PORT=8001
KRAKEN_PORT=8011
INDICATOR_PORT=8012
MARKET_DATA_PORT=8013
LIQUIDITY_PORT=8014
FUNDAMENTAL_PORT=8015
TRADING_ENGINE_PORT=8016
ROUTER_PORT=8000
SUPERVISOR_PORT=3000

say(){ echo "$1"; }
http_get(){ curl -fsS --connect-timeout 1 --max-time 2 "$1" 2>/dev/null || true; }
json_pid(){ echo "$1" | sed -n 's/.*"pid"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' | head -1; }
port_busy(){
  port="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -tiTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  fi
  if command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$port" >/dev/null 2>&1 && return 0
  fi
  # Dernier recours HTTP : une reponse quelconque indique un service.
  curl -s --connect-timeout 1 --max-time 1 "http://127.0.0.1:$port/" >/dev/null 2>&1 && return 0
  return 1
}
stop_known_on_port(){
  port="$1"
  body_health="$(http_get "http://127.0.0.1:${port}/api/health")"
  body_router="$(http_get "http://127.0.0.1:${port}/router-health")"
  body_kraken="$(http_get "http://127.0.0.1:${port}/health")"
  pid=""
  label=""
  if echo "$body_router" | grep -q '"router"[[:space:]]*:[[:space:]]*true'; then
    pid="$(json_pid "$body_router")"; label="Router"
  elif echo "$body_health" | grep -q 'Crypto Chart Viewer IA Trader'; then
    pid="$(json_pid "$body_health")"; label="TradingBot"
  elif echo "$body_kraken" | grep -q 'Kraken Add-On'; then
    pid="$(json_pid "$body_kraken")"; label="Kraken Add-On"
  elif echo "$body_kraken" | grep -q 'IA-TB Indicator Engine'; then
    pid="$(json_pid "$body_kraken")"; label="Indicator Engine"
  elif echo "$body_kraken" | grep -q 'IA-TB Market Data'; then
    pid="$(json_pid "$body_kraken")"; label="Market Data"
  elif echo "$body_kraken" | grep -q 'IA-TB Liquidity Engine'; then
    pid="$(json_pid "$body_kraken")"; label="Liquidity Engine"
  elif echo "$body_kraken" | grep -q 'IA-TB Fundamental Engine'; then
    pid="$(json_pid "$body_kraken")"; label="Fundamental Engine"
  elif echo "$body_kraken" | grep -q 'IA-TB Trading Engine'; then
    pid="$(json_pid "$body_kraken")"; label="Trading Engine"
  fi
  if [ -n "$pid" ]; then
    say "Ancienne instance $label detectee sur le port $port -> arret PID $pid"
    kill "$pid" >/dev/null 2>&1 || true
    sleep 1
    if port_busy "$port"; then
      kill -9 "$pid" >/dev/null 2>&1 || true
      sleep 1
    fi
  fi
  if port_busy "$port"; then
    # Si le PID n'etait pas expose (ancienne revision), tenter lsof uniquement pour une instance reconnue.
    if [ -n "$label" ] && command -v lsof >/dev/null 2>&1; then
      pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null | tr '\n' ' ')"
      for x in $pids; do kill "$x" >/dev/null 2>&1 || true; done
      sleep 1
    fi
  fi
  if port_busy "$port"; then
    say "ERREUR: le port $port est encore utilise."
    say "Ferme l'ancienne fenetre Terminal/TradingBot qui utilise ce port puis relance start.command."
    return 1
  fi
  return 0
}

say "Nettoyage des anciennes instances TradingBot..."
stop_known_on_port "$ROUTER_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$CORE_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$KRAKEN_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$INDICATOR_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$MARKET_DATA_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$LIQUIDITY_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$FUNDAMENTAL_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$TRADING_ENGINE_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$SUPERVISOR_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }

bash "./install_runtime.command"
if [ $? -ne 0 ]; then
  echo "Le runtime Node local n'a pas pu etre prepare."
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi

NODE_BIN="$PWD/.node/bin/node"
if [ ! -x "$NODE_BIN" ]; then
  echo "Node.js local introuvable."
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi

# v1.6.0 Fundamental Engine: dependance SQLite native testee avec Node 16.20.2.
# Echec non bloquant: IA-TB reste disponible et le FE apparaitra OFFLINE dans ADMIN.
FUNDAMENTAL_READY=0
if [ -f "$PWD/Fundamental/install_sqlite.command" ]; then
  echo "Vérification SQLite du Fundamental Engine..."
  if /bin/bash "$PWD/Fundamental/install_sqlite.command"; then
    FUNDAMENTAL_READY=1
    echo "Fundamental SQLite : prêt."
  else
    echo "ATTENTION: Fundamental SQLite indisponible. IA-TB continue sans Fundamental Engine."
    echo "Consulte Fundamental/sqlite_install.log depuis ADMIN."
  fi
fi

# IA-TB v1.5.2 — ULTRA Mode v2.0 lifecycle.
# La préférence est écrite par ADMIN dans Parametres/UltraModeSettings.dat.
# v1.5.2: un seul START, une seule confirmation, une seule stabilisation de 2 s.
ULTRA_DIR="$PWD/Core/Booster/ultra_mode"
ULTRA_SETTINGS="$PWD/Parametres/UltraModeSettings.dat"
ULTRA_LOG="$ULTRA_DIR/log.txt"
ultra_status(){
  [ -f "$ULTRA_DIR/status.command" ] || { echo INACTIVE; return 1; }
  /bin/bash "$ULTRA_DIR/status.command" 2>/dev/null | tail -1
}
ultra_enabled=false
if [ -f "$ULTRA_SETTINGS" ] && grep -Eq '"enabledOnStart"[[:space:]]*:[[:space:]]*true' "$ULTRA_SETTINGS" 2>/dev/null; then ultra_enabled=true; fi
if [ "$ultra_enabled" = true ]; then
  echo "Mode ULTRA v2.0 demandé par ADMIN."
  if [ "$(ultra_status)" = "ACTIVE" ]; then
    echo "ULTRA déjà actif : conservation de l'état, aucun délai."
    printf '[%s] COLD START IA-TB: ULTRA déjà actif, aucun restart, aucun délai.\n' "$(date '+%Y-%m-%d %H:%M:%S')" >> "$ULTRA_LOG" 2>/dev/null || true
  else
    echo "Activation ULTRA avant démarrage du VPS..."
    if /bin/bash "$ULTRA_DIR/start.command" >/dev/null 2>&1 && [ "$(ultra_status)" = "ACTIVE" ]; then
      echo "ULTRA confirmé ACTIF. Stabilisation unique de 2 secondes..."
      printf '[%s] COLD START IA-TB: ULTRA confirmé une fois, stabilisation unique 2 s avant VPS.\n' "$(date '+%Y-%m-%d %H:%M:%S')" >> "$ULTRA_LOG" 2>/dev/null || true
      sleep 2
    else
      echo "ATTENTION: ULTRA non confirmé. IA-TB démarre en mode normal pour rester disponible."
      printf '[%s] WARN COLD START: ULTRA non confirmé; aucun retry en boucle; fallback IA-TB normal.\n' "$(date '+%Y-%m-%d %H:%M:%S')" >> "$ULTRA_LOG" 2>/dev/null || true
    fi
  fi
else
  echo "Mode ULTRA au démarrage : désactivé dans ADMIN."
fi

KRAKEN_PID=""
INDICATOR_PID=""
MARKET_DATA_PID=""
LIQUIDITY_PID=""
FUNDAMENTAL_PID=""
TRADING_ENGINE_PID=""
ROUTER_PID=""
APP_PID=""
cleanup() {
  [ -n "$ROUTER_PID" ] && kill "$ROUTER_PID" >/dev/null 2>&1 || true
  [ -n "$KRAKEN_PID" ] && kill "$KRAKEN_PID" >/dev/null 2>&1 || true
  [ -n "$INDICATOR_PID" ] && kill "$INDICATOR_PID" >/dev/null 2>&1 || true
  [ -n "$MARKET_DATA_PID" ] && kill "$MARKET_DATA_PID" >/dev/null 2>&1 || true
  [ -n "$LIQUIDITY_PID" ] && kill "$LIQUIDITY_PID" >/dev/null 2>&1 || true
  [ -n "$FUNDAMENTAL_PID" ] && kill "$FUNDAMENTAL_PID" >/dev/null 2>&1 || true
  [ -n "$TRADING_ENGINE_PID" ] && kill "$TRADING_ENGINE_PID" >/dev/null 2>&1 || true
  [ -n "$APP_PID" ] && kill "$APP_PID" >/dev/null 2>&1 || true
  sleep 1
  stop_known_on_port "$ROUTER_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$KRAKEN_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$INDICATOR_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$MARKET_DATA_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$LIQUIDITY_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$FUNDAMENTAL_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$TRADING_ENGINE_PORT" >/dev/null 2>&1 || true
  # ULTRA suit le cycle de vie du VPS : arrêt uniquement quand start.command se termine.
  if [ -f "$ULTRA_DIR/stop.command" ] && [ "$(ultra_status)" = "ACTIVE" ]; then
    echo "Arrêt du Mode ULTRA v2.0..."
    /bin/bash "$ULTRA_DIR/stop.command" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT INT TERM

: > router.log
: > AddOns/Kraken/kraken.log
: > Indicators/indicator.log
: > MarketData/market_data.log
: > Liquidity/liquidity.log
mkdir -p Fundamental/Data
: > Fundamental/fundamental.log
: > services/trading-engine/trading.log

echo "Crypto Chart Viewer IA Trader · Core / Frontend / Indicators"
echo "Node local : $($NODE_BIN -v)"
echo "Interface unique : http://127.0.0.1:$ROUTER_PORT"
echo "Core interne     : 127.0.0.1:$CORE_PORT"
echo "Kraken interne   : 127.0.0.1:$KRAKEN_PORT"
echo "Indicators       : 127.0.0.1:$INDICATOR_PORT"
echo "Market Data      : 127.0.0.1:$MARKET_DATA_PORT"
echo "Liquidity        : 127.0.0.1:$LIQUIDITY_PORT"
echo "Fundamental      : 127.0.0.1:$FUNDAMENTAL_PORT"
echo "Trading Engine   : 127.0.0.1:$TRADING_ENGINE_PORT"

KRAKEN_ADDON_PORT="$KRAKEN_PORT" "$NODE_BIN" AddOns/Kraken/kraken_service.js >> AddOns/Kraken/kraken.log 2>&1 &
KRAKEN_PID=$!

IATB_INDICATOR_PORT="$INDICATOR_PORT" IATB_MARKET_DATA_PORT="$MARKET_DATA_PORT" ROUTER_PORT="$ROUTER_PORT" "$NODE_BIN" Indicators/Engine/indicator_service.js >> Indicators/indicator.log 2>&1 &
INDICATOR_PID=$!

KRAKEN_ADDON_PORT="$KRAKEN_PORT" IATB_MARKET_DATA_PORT="$MARKET_DATA_PORT" "$NODE_BIN" MarketData/market_data_service.js >> MarketData/market_data.log 2>&1 &
MARKET_DATA_PID=$!

IATB_MARKET_DATA_PORT="$MARKET_DATA_PORT" IATB_LIQUIDITY_PORT="$LIQUIDITY_PORT" "$NODE_BIN" Liquidity/Engine/liquidity_service.js >> Liquidity/liquidity.log 2>&1 &
LIQUIDITY_PID=$!

if [ "$FUNDAMENTAL_READY" -eq 1 ]; then
  IATB_FUNDAMENTAL_PORT="$FUNDAMENTAL_PORT" "$NODE_BIN" Fundamental/Engine/fundamental_service.js >> Fundamental/fundamental.log 2>&1 &
  FUNDAMENTAL_PID=$!
fi

IATB_TRADING_ENGINE_PORT="$TRADING_ENGINE_PORT" IATB_TRADING_LIVE="0" "$NODE_BIN" services/trading-engine/trading_service.js >> services/trading-engine/trading.log 2>&1 &
TRADING_ENGINE_PID=$!

# L Indicator Engine doit etre sain avant activation de la nouvelle release.
ind_ok=0
for i in 1 2 3 4 5 6 7 8; do
  body="$(http_get "http://127.0.0.1:$INDICATOR_PORT/health")"
  echo "$body" | grep -q 'IA-TB Indicator Engine' && { ind_ok=1; break; }
  sleep 1
done
if [ "$ind_ok" -ne 1 ]; then
  echo "ERREUR: Indicator Engine ne repond pas sur $INDICATOR_PORT."
  echo "--- Indicators/indicator.log ---"
  cat Indicators/indicator.log 2>/dev/null || true
  cleanup
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi

md_ok=0
for i in 1 2 3 4 5 6 7 8; do
  body="$(http_get "http://127.0.0.1:$MARKET_DATA_PORT/health")"
  echo "$body" | grep -q 'IA-TB Market Data' && { md_ok=1; break; }
  sleep 1
done
if [ "$md_ok" -ne 1 ]; then
  echo "ERREUR: Market Data ne repond pas sur $MARKET_DATA_PORT."
  echo "--- MarketData/market_data.log ---"
  cat MarketData/market_data.log 2>/dev/null || true
  cleanup
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi

liq_ok=0
for i in 1 2 3 4 5 6 7 8; do
  body="$(http_get "http://127.0.0.1:$LIQUIDITY_PORT/health")"
  echo "$body" | grep -q 'IA-TB Liquidity Engine' && { liq_ok=1; break; }
  sleep 1
done
if [ "$liq_ok" -ne 1 ]; then
  echo "ERREUR: Liquidity Engine ne repond pas sur $LIQUIDITY_PORT."
  echo "--- Liquidity/liquidity.log ---"
  cat Liquidity/liquidity.log 2>/dev/null || true
  cleanup
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi

te_ok=0
for i in 1 2 3 4 5 6 7 8; do
  body="$(http_get "http://127.0.0.1:$TRADING_ENGINE_PORT/health")"
  echo "$body" | grep -q 'IA-TB Trading Engine' && { te_ok=1; break; }
  sleep 1
done
if [ "$te_ok" -ne 1 ]; then
  echo "ERREUR: Trading Engine ne répond pas sur $TRADING_ENGINE_PORT."
  echo "--- services/trading-engine/trading.log ---"
  cat services/trading-engine/trading.log 2>/dev/null || true
  cleanup
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi

if [ "$FUNDAMENTAL_READY" -eq 1 ]; then
  fe_ok=0
  for i in 1 2 3 4 5 6 7 8; do
    body="$(http_get "http://127.0.0.1:$FUNDAMENTAL_PORT/health")"
    echo "$body" | grep -q 'IA-TB Fundamental Engine' && { fe_ok=1; break; }
    sleep 1
  done
  if [ "$fe_ok" -ne 1 ]; then
    echo "ATTENTION: Fundamental Engine ne répond pas sur $FUNDAMENTAL_PORT. IA-TB continue en mode dégradé."
    cat Fundamental/fundamental.log 2>/dev/null || true
    FUNDAMENTAL_READY=0
  fi
fi

IATB_PUBLIC_PORT="$CORE_PORT" IATB_TRADING_ENGINE_PORT="$TRADING_ENGINE_PORT" "$NODE_BIN" launcher.js &
APP_PID=$!

# Attendre le coeur sur 8001 (pas seulement le superviseur 3000)
ok=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  body="$(http_get "http://127.0.0.1:$CORE_PORT/api/health")"
  echo "$body" | grep -q 'Crypto Chart Viewer IA Trader' && { ok=1; break; }
  sleep 1
done
if [ "$ok" -ne 1 ]; then
  echo "ERREUR: le coeur TradingBot ne repond pas sur $CORE_PORT."
  cleanup
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi

CORE_PUBLIC_PORT="$CORE_PORT" KRAKEN_ADDON_PORT="$KRAKEN_PORT" IATB_INDICATOR_PORT="$INDICATOR_PORT" IATB_MARKET_DATA_PORT="$MARKET_DATA_PORT" IATB_LIQUIDITY_PORT="$LIQUIDITY_PORT" IATB_FUNDAMENTAL_PORT="$FUNDAMENTAL_PORT" IATB_TRADING_ENGINE_PORT="$TRADING_ENGINE_PORT" ROUTER_PORT="$ROUTER_PORT" "$NODE_BIN" Core/Router/router.js >> router.log 2>&1 &
ROUTER_PID=$!

# Ne jamais ouvrir 8000 avant d'avoir PROUVE que c'est bien le Router.
ok=0
for i in 1 2 3 4 5 6 7 8; do
  body="$(http_get "http://127.0.0.1:$ROUTER_PORT/router-health")"
  echo "$body" | grep -q '"router"[[:space:]]*:[[:space:]]*true' && { ok=1; break; }
  sleep 1
done
if [ "$ok" -ne 1 ]; then
  echo "ERREUR: le Router n'a pas pris le port $ROUTER_PORT."
  echo "--- router.log ---"
  cat router.log 2>/dev/null || true
  cleanup
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi

echo "Router valide sur 127.0.0.1:$ROUTER_PORT"
open "http://127.0.0.1:$ROUTER_PORT" >/dev/null 2>&1 || true
wait "$APP_PID"
