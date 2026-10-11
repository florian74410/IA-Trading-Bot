#!/bin/bash
cd "$(dirname "$0")" || exit 1

APP_NAME="Crypto Chart Viewer IA Trader"
UI_PORT=8000
CORE_PORT=8001
KRAKEN_PORT=8011
INDICATOR_PORT=8012
MARKET_DATA_PORT=8013
LIQUIDITY_PORT=8014
FUNDAMENTAL_PORT=8015
TRADING_ENGINE_PORT=8016
FIREWALL_PORT=8017
STRATEGY_PORT=8018
RISK_ENGINE_PORT=8019
PORTFOLIO_PORT=8020
ROUTER_PORT=8021
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
  body_ui="$(http_get "http://127.0.0.1:${port}/ui-health")"
  pid=""
  label=""
  if echo "$body_ui" | grep -q 'IA-TB UI Service'; then
    pid="$(json_pid "$body_ui")"; label="UI Service"
  elif echo "$body_router" | grep -q '"router"[[:space:]]*:[[:space:]]*true'; then
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
  elif echo "$body_kraken" | grep -q 'IA-TB Firewall Service'; then
    pid="$(json_pid "$body_kraken")"; label="Firewall Service"
  elif echo "$body_kraken" | grep -q 'IA-TB Strategy Engine v2'; then
    pid="$(json_pid "$body_kraken")"; label="Strategy Engine v2"
  elif echo "$body_kraken" | grep -q 'IA-TB Risk Engine'; then
    pid="$(json_pid "$body_kraken")"; label="Risk Manager Engine"
  elif echo "$body_kraken" | grep -q 'IA-TB Portfolio Engine'; then
    pid="$(json_pid "$body_kraken")"; label="Portfolio Engine"
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
stop_known_on_port "$UI_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$ROUTER_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$CORE_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$KRAKEN_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$INDICATOR_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$MARKET_DATA_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$LIQUIDITY_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$FUNDAMENTAL_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$TRADING_ENGINE_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$FIREWALL_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$STRATEGY_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$RISK_ENGINE_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
stop_known_on_port "$PORTFOLIO_PORT" || { read -p "Appuie sur Entree pour fermer..."; exit 1; }
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

KRAKEN_PID=""
INDICATOR_PID=""
MARKET_DATA_PID=""
LIQUIDITY_PID=""
FUNDAMENTAL_PID=""
TRADING_ENGINE_PID=""
FIREWALL_PID=""
STRATEGY_PID=""
RISK_ENGINE_PID=""
PORTFOLIO_PID=""
UI_PID=""
ROUTER_PID=""
APP_PID=""
cleanup() {
  [ -n "$UI_PID" ] && kill "$UI_PID" >/dev/null 2>&1 || true
  [ -n "$ROUTER_PID" ] && kill "$ROUTER_PID" >/dev/null 2>&1 || true
  [ -n "$KRAKEN_PID" ] && kill "$KRAKEN_PID" >/dev/null 2>&1 || true
  [ -n "$INDICATOR_PID" ] && kill "$INDICATOR_PID" >/dev/null 2>&1 || true
  [ -n "$MARKET_DATA_PID" ] && kill "$MARKET_DATA_PID" >/dev/null 2>&1 || true
  [ -n "$LIQUIDITY_PID" ] && kill "$LIQUIDITY_PID" >/dev/null 2>&1 || true
  [ -n "$FUNDAMENTAL_PID" ] && kill "$FUNDAMENTAL_PID" >/dev/null 2>&1 || true
  [ -n "$TRADING_ENGINE_PID" ] && kill "$TRADING_ENGINE_PID" >/dev/null 2>&1 || true
  [ -n "$FIREWALL_PID" ] && kill "$FIREWALL_PID" >/dev/null 2>&1 || true
  [ -n "$STRATEGY_PID" ] && kill "$STRATEGY_PID" >/dev/null 2>&1 || true
  [ -n "$RISK_ENGINE_PID" ] && kill "$RISK_ENGINE_PID" >/dev/null 2>&1 || true
  [ -n "$PORTFOLIO_PID" ] && kill "$PORTFOLIO_PID" >/dev/null 2>&1 || true
  [ -n "$APP_PID" ] && kill "$APP_PID" >/dev/null 2>&1 || true
  sleep 1
  stop_known_on_port "$UI_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$ROUTER_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$KRAKEN_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$INDICATOR_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$MARKET_DATA_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$LIQUIDITY_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$FUNDAMENTAL_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$TRADING_ENGINE_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$FIREWALL_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$STRATEGY_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$RISK_ENGINE_PORT" >/dev/null 2>&1 || true
  stop_known_on_port "$PORTFOLIO_PORT" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

: > router.log
mkdir -p UI/Logs
: > UI/Logs/ui.log
: > AddOns/Kraken/kraken.log
: > Indicators/indicator.log
: > MarketData/market_data.log
: > Liquidity/liquidity.log
mkdir -p Fundamental/Data
: > Fundamental/fundamental.log
: > services/trading-engine/trading.log
mkdir -p Core/Firewall
: > Core/Firewall/Firewall.log
mkdir -p Strategy
: > Strategy/strategy.log
mkdir -p Risk
: > Risk/risk.log
mkdir -p Portfolio
: > Portfolio/portfolio.log

echo "Crypto Chart Viewer IA Trader · UI séparée / Core / Router / Engines"
echo "Node local : $($NODE_BIN -v)"
echo "Interface UI      : http://127.0.0.1:$UI_PORT"
echo "Router interne    : 127.0.0.1:$ROUTER_PORT"
echo "Core interne     : 127.0.0.1:$CORE_PORT"
echo "Kraken interne   : 127.0.0.1:$KRAKEN_PORT"
echo "Indicators       : 127.0.0.1:$INDICATOR_PORT"
echo "Market Data      : 127.0.0.1:$MARKET_DATA_PORT"
echo "Liquidity        : 127.0.0.1:$LIQUIDITY_PORT"
echo "Fundamental      : 127.0.0.1:$FUNDAMENTAL_PORT"
echo "Trading Engine   : 127.0.0.1:$TRADING_ENGINE_PORT"
echo "Firewall         : 127.0.0.1:$FIREWALL_PORT (Thread 0 Router · Thread 1 Trading · Thread 2 Data)"
echo "Strategy Engine  : 127.0.0.1:$STRATEGY_PORT"
echo "Risk Manager     : 127.0.0.1:$RISK_ENGINE_PORT"
echo "Portfolio Engine : 127.0.0.1:$PORTFOLIO_PORT"

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

IATB_PORTFOLIO_PORT="$PORTFOLIO_PORT" "$NODE_BIN" Portfolio/Engine/portfolio_service.js >> Portfolio/portfolio.log 2>&1 &
PORTFOLIO_PID=$!

IATB_TRADING_ENGINE_PORT="$TRADING_ENGINE_PORT" ROUTER_PORT="$ROUTER_PORT" IATB_TRADING_LIVE="0" "$NODE_BIN" services/trading-engine/trading_service.js >> services/trading-engine/trading.log 2>&1 &
TRADING_ENGINE_PID=$!

IATB_FIREWALL_PORT="$FIREWALL_PORT" IATB_TRADING_FIREWALL_PORT="$FIREWALL_PORT" IATB_TRADING_ENGINE_PORT="$TRADING_ENGINE_PORT" IATB_MARKET_DATA_PORT="$MARKET_DATA_PORT" "$NODE_BIN" Core/Firewall/firewall_service.js >> Core/Firewall/Firewall.log 2>&1 &
FIREWALL_PID=$!

IATB_STRATEGY_PORT="$STRATEGY_PORT" ROUTER_PORT="$ROUTER_PORT" "$NODE_BIN" Strategy/Engine/strategy_service.js >> Strategy/strategy.log 2>&1 &
STRATEGY_PID=$!

IATB_RISK_ENGINE_PORT="$RISK_ENGINE_PORT" ROUTER_PORT="$ROUTER_PORT" "$NODE_BIN" Risk/Engine/risk_service.js >> Risk/risk.log 2>&1 &
RISK_ENGINE_PID=$!

# Attendre que le Firewall Service et ses deux threads de protection soient démarrés.
fw_ok=0
for i in 1 2 3 4 5 6 7 8; do
  body="$(http_get "http://127.0.0.1:$FIREWALL_PORT/health")"
  echo "$body" | grep -q 'IA-TB Firewall Service' && echo "$body" | grep -q '"thread":1' && echo "$body" | grep -q '"thread":2' && { fw_ok=1; break; }
  sleep 1
done
if [ "$fw_ok" -ne 1 ]; then
  echo "ERREUR: Firewall Service ne repond pas sur $FIREWALL_PORT."
  cat Core/Firewall/Firewall.log 2>/dev/null || true
  cleanup; read -p "Appuie sur Entree pour fermer..."; exit 1
fi

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

portfolio_ok=0
for i in 1 2 3 4 5 6 7 8; do
  body="$(http_get "http://127.0.0.1:$PORTFOLIO_PORT/health")"
  echo "$body" | grep -q 'IA-TB Portfolio Engine' && { portfolio_ok=1; break; }
  sleep 1
done
if [ "$portfolio_ok" -ne 1 ]; then
  echo "ERREUR: Portfolio Engine ne répond pas sur $PORTFOLIO_PORT."
  echo "--- Portfolio/portfolio.log ---"
  cat Portfolio/portfolio.log 2>/dev/null || true
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

strategy_ok=0
for i in 1 2 3 4 5 6 7 8; do
  body="$(http_get "http://127.0.0.1:$STRATEGY_PORT/health")"
  echo "$body" | grep -q 'IA-TB Strategy Engine v2' && { strategy_ok=1; break; }
  sleep 1
done
if [ "$strategy_ok" -ne 1 ]; then
  echo "ERREUR: Strategy Engine v2 ne répond pas sur $STRATEGY_PORT."
  echo "--- Strategy/strategy.log ---"
  cat Strategy/strategy.log 2>/dev/null || true
  cleanup
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi

risk_ok=0
for i in 1 2 3 4 5 6 7 8; do
  body="$(http_get "http://127.0.0.1:$RISK_ENGINE_PORT/health")"
  echo "$body" | grep -q 'IA-TB Risk Engine' && { risk_ok=1; break; }
  sleep 1
done
if [ "$risk_ok" -ne 1 ]; then
  echo "ATTENTION: Risk Manager Engine ne répond pas sur $RISK_ENGINE_PORT. IA-TB continue en mode dégradé."
  cat Risk/risk.log 2>/dev/null || true
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

IATB_PUBLIC_PORT="$CORE_PORT" IATB_UI_SEPARATED="1" ROUTER_PORT="$ROUTER_PORT" IATB_PORTFOLIO_PORT="$PORTFOLIO_PORT" IATB_TRADING_ENGINE_PORT="$TRADING_ENGINE_PORT" IATB_FIREWALL_PORT="$FIREWALL_PORT" IATB_TRADING_FIREWALL_PORT="$FIREWALL_PORT" "$NODE_BIN" launcher.js &
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

CORE_PUBLIC_PORT="$CORE_PORT" KRAKEN_ADDON_PORT="$KRAKEN_PORT" IATB_INDICATOR_PORT="$INDICATOR_PORT" IATB_MARKET_DATA_PORT="$MARKET_DATA_PORT" IATB_LIQUIDITY_PORT="$LIQUIDITY_PORT" IATB_FUNDAMENTAL_PORT="$FUNDAMENTAL_PORT" IATB_TRADING_ENGINE_PORT="$TRADING_ENGINE_PORT" IATB_FIREWALL_PORT="$FIREWALL_PORT" IATB_TRADING_FIREWALL_PORT="$FIREWALL_PORT" IATB_STRATEGY_PORT="$STRATEGY_PORT" IATB_RISK_ENGINE_PORT="$RISK_ENGINE_PORT" IATB_PORTFOLIO_PORT="$PORTFOLIO_PORT" ROUTER_PORT="$ROUTER_PORT" "$NODE_BIN" Core/Router/router.js >> router.log 2>&1 &
ROUTER_PID=$!

# Valider le Router interne avant de démarrer le service UI public.
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

echo "Router interne valide sur 127.0.0.1:$ROUTER_PORT"

IATB_UI_PORT="$UI_PORT" CORE_PUBLIC_PORT="$CORE_PORT" ROUTER_PORT="$ROUTER_PORT" IATB_AUTH_MODE="disabled" IATB_UI_BYPASS_ROLE="ADMIN" "$NODE_BIN" UI/Gateway/ui_service.js >> UI/Logs/ui.log 2>&1 &
UI_PID=$!

ui_ok=0
for i in 1 2 3 4 5 6 7 8; do
  body="$(http_get "http://127.0.0.1:$UI_PORT/ui-health")"
  echo "$body" | grep -q 'IA-TB UI Service' && { ui_ok=1; break; }
  sleep 1
done
if [ "$ui_ok" -ne 1 ]; then
  echo "ERREUR: UI Service ne répond pas sur $UI_PORT."
  echo "--- UI/Logs/ui.log ---"
  cat UI/Logs/ui.log 2>/dev/null || true
  cleanup
  read -p "Appuie sur Entree pour fermer..."
  exit 1
fi

echo "UI séparée valide sur 127.0.0.1:$UI_PORT"
open "http://127.0.0.1:$UI_PORT" >/dev/null 2>&1 || true
wait "$APP_PID"
