#!/bin/bash
cd "$(dirname "$0")" || exit 1
ROOT="$(cd ../.. && pwd)"
if [ ! -x "$ROOT/.node/bin/node" ]; then
  "$ROOT/install_runtime.command" || exit 1
fi
echo "Kraken Add-On isole: http://127.0.0.1:8011"
"$ROOT/.node/bin/node" "$PWD/kraken_service.js" &
PID=$!
sleep 2
open "http://127.0.0.1:8011" >/dev/null 2>&1 || true
wait "$PID"
