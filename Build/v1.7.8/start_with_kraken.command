#!/bin/bash
cd "$(dirname "$0")" || exit 1
./install_runtime.command || exit 1
NODE_BIN="$PWD/.node/bin/node"
"$NODE_BIN" AddOns/Kraken/kraken_service.js &
KRAKEN_PID=$!
"$NODE_BIN" launcher.js &
APP_PID=$!
sleep 2
open "http://127.0.0.1:8000" >/dev/null 2>&1 || true
open "http://127.0.0.1:8011" >/dev/null 2>&1 || true
wait "$APP_PID"
kill "$KRAKEN_PID" >/dev/null 2>&1 || true
