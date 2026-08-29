#!/bin/bash
set -u
cd "$(dirname "$0")" || exit 1
REQ_VERSION="v16.20.2"
ARCHIVE_NAME="node-v16.20.2-darwin-x64.tar.gz"
ARCHIVE="$PWD/Runtime/$ARCHIVE_NAME"
URL="https://nodejs.org/download/release/v16.20.2/$ARCHIVE_NAME"
EXPECTED_SHA="d7a46eaf2b57ffddeda16ece0d887feb2e31a91ad33f8774da553da0249dc4a6"
USERDATA_PORT="${IATB_USERDATA_SERVER_PORT:-8020}"
USERDATA_ROOT="${IATB_USERDATA_SERVER_ROOT:-$HOME/Documents}"
USERDATA_LOG="$USERDATA_ROOT/IA-TB-UserData-Server.log"
install_marketdata_deps(){ if [ ! -f "$PWD/MarketData/package.json" ]; then return 0; fi; if [ -f "$PWD/MarketData/node_modules/ws/package.json" ]; then return 0; fi; echo "Installation dependance MarketData WebSocket (ws)..."; "$PWD/.node/bin/npm" install --prefix "$PWD/MarketData" --omit=dev --no-audit --no-fund || return 1; }
install_userdata_deps(){ if [ ! -f "$PWD/UserData/package.json" ]; then return 0; fi; if [ -f "$PWD/UserData/node_modules/better-sqlite3/package.json" ]; then return 0; fi; echo "Installation dependance UserData SQLite (better-sqlite3)..."; "$PWD/.node/bin/npm" install --prefix "$PWD/UserData" --omit=dev --no-audit --no-fund || return 1; }
userdata_ready(){ curl -fsS --connect-timeout 1 --max-time 2 "http://127.0.0.1:$USERDATA_PORT/health" 2>/dev/null | grep -q 'IA-TB UserData Local Server'; }
start_userdata(){
  [ -f "$PWD/UserData/local_server.js" ] || return 0
  mkdir -p "$USERDATA_ROOT/User Data" || return 1
  if userdata_ready; then
    echo "UserData Server deja actif sur 127.0.0.1:$USERDATA_PORT."
  else
    echo "Demarrage UserData Server local -> $USERDATA_ROOT/User Data"
    IATB_USERDATA_SERVER_PORT="$USERDATA_PORT" IATB_USERDATA_SERVER_ROOT="$USERDATA_ROOT" "$PWD/.node/bin/node" "$PWD/UserData/local_server.js" >> "$USERDATA_LOG" 2>&1 &
    for i in 1 2 3 4 5 6 7 8 9 10; do userdata_ready && break; sleep 0.2; done
    if ! userdata_ready; then echo "ERREUR: UserData Server indisponible. Consulte $USERDATA_LOG"; return 1; fi
  fi
  echo "Chargement des donnees utilisateur en memoire..."
  IATB_USERDATA_SERVER_PORT="$USERDATA_PORT" "$PWD/.node/bin/node" "$PWD/UserData/bootstrap.js" || return 1
  return 0
}
prepare_runtime_deps(){ install_marketdata_deps || return 1; install_userdata_deps || return 1; start_userdata || return 1; }
if [ "$(uname -s)" != "Darwin" ]; then echo "Ce runtime local est prevu pour macOS Intel."; fi
mkdir -p "$PWD/Runtime"; need_install=1
if [ -x "$PWD/.node/bin/node" ]; then current="$($PWD/.node/bin/node -v 2>/dev/null || true)"; if [ "$current" = "$REQ_VERSION" ]; then need_install=0; fi; fi
if [ "$need_install" -eq 0 ]; then echo "Runtime local Node $REQ_VERSION deja installe."; prepare_runtime_deps || exit 1; exit 0; fi
echo "Installation/reinstallation du runtime local Node $REQ_VERSION..."
if [ ! -f "$ARCHIVE" ]; then tmp="$ARCHIVE.part"; rm -f "$tmp"; curl -L --fail --retry 3 --connect-timeout 20 "$URL" -o "$tmp" || exit 1; mv "$tmp" "$ARCHIVE"; fi
actual="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"; if [ "$actual" != "$EXPECTED_SHA" ]; then echo "ERREUR: SHA-256 du runtime Node incorrect."; exit 1; fi
rm -rf "$PWD/.node" "$PWD/Runtime/.node-install"; mkdir -p "$PWD/Runtime/.node-install"; tar -xzf "$ARCHIVE" -C "$PWD/Runtime/.node-install" || exit 1; mv "$PWD/Runtime/.node-install/node-v16.20.2-darwin-x64" "$PWD/.node"; rm -rf "$PWD/Runtime/.node-install"; chmod +x "$PWD/.node/bin/node" "$PWD/.node/bin/npm" 2>/dev/null || true
[ -x "$PWD/.node/bin/node" ] || exit 1; echo "Runtime local installe: $($PWD/.node/bin/node -v)"; prepare_runtime_deps || exit 1
