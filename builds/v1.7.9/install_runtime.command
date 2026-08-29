#!/bin/bash
set -u
cd "$(dirname "$0")" || exit 1
REQ_VERSION="v16.20.2"
ARCHIVE_NAME="node-v16.20.2-darwin-x64.tar.gz"
ARCHIVE="$PWD/Runtime/$ARCHIVE_NAME"
URL="https://nodejs.org/download/release/v16.20.2/$ARCHIVE_NAME"
EXPECTED_SHA="d7a46eaf2b57ffddeda16ece0d887feb2e31a91ad33f8774da553da0249dc4a6"
install_marketdata_deps(){ if [ ! -f "$PWD/MarketData/package.json" ]; then return 0; fi; if [ -f "$PWD/MarketData/node_modules/ws/package.json" ]; then return 0; fi; echo "Installation dependance MarketData WebSocket (ws)..."; "$PWD/.node/bin/npm" install --prefix "$PWD/MarketData" --omit=dev --no-audit --no-fund || return 1; }
if [ "$(uname -s)" != "Darwin" ]; then echo "Ce runtime local est prevu pour macOS Intel."; fi
mkdir -p "$PWD/Runtime"; need_install=1
if [ -x "$PWD/.node/bin/node" ]; then current="$($PWD/.node/bin/node -v 2>/dev/null || true)"; if [ "$current" = "$REQ_VERSION" ]; then need_install=0; fi; fi
if [ "$need_install" -eq 0 ]; then echo "Runtime local Node $REQ_VERSION deja installe."; install_marketdata_deps || exit 1; exit 0; fi
echo "Installation/reinstallation du runtime local Node $REQ_VERSION..."
if [ ! -f "$ARCHIVE" ]; then tmp="$ARCHIVE.part"; rm -f "$tmp"; curl -L --fail --retry 3 --connect-timeout 20 "$URL" -o "$tmp" || exit 1; mv "$tmp" "$ARCHIVE"; fi
actual="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"; if [ "$actual" != "$EXPECTED_SHA" ]; then echo "ERREUR: SHA-256 du runtime Node incorrect."; exit 1; fi
rm -rf "$PWD/.node" "$PWD/Runtime/.node-install"; mkdir -p "$PWD/Runtime/.node-install"; tar -xzf "$ARCHIVE" -C "$PWD/Runtime/.node-install" || exit 1; mv "$PWD/Runtime/.node-install/node-v16.20.2-darwin-x64" "$PWD/.node"; rm -rf "$PWD/Runtime/.node-install"; chmod +x "$PWD/.node/bin/node" "$PWD/.node/bin/npm" 2>/dev/null || true
[ -x "$PWD/.node/bin/node" ] || exit 1; echo "Runtime local installe: $($PWD/.node/bin/node -v)"; install_marketdata_deps || exit 1
