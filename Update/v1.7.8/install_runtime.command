#!/bin/bash
set -u
cd "$(dirname "$0")" || exit 1
REQ_VERSION="v16.20.2"
ARCHIVE_NAME="node-v16.20.2-darwin-x64.tar.gz"
ARCHIVE="$PWD/Runtime/$ARCHIVE_NAME"
URL="https://nodejs.org/download/release/v16.20.2/$ARCHIVE_NAME"
EXPECTED_SHA="d7a46eaf2b57ffddeda16ece0d887feb2e31a91ad33f8774da553da0249dc4a6"

install_marketdata_deps(){
  if [ ! -f "$PWD/MarketData/package.json" ]; then return 0; fi
  if [ -f "$PWD/MarketData/node_modules/ws/package.json" ]; then return 0; fi
  echo "Installation dependance MarketData WebSocket (ws)..."
  if ! "$PWD/.node/bin/npm" install --prefix "$PWD/MarketData" --omit=dev --no-audit --no-fund; then
    echo "ERREUR: impossible d installer la dependance WebSocket MarketData."
    return 1
  fi
}

if [ "$(uname -s)" != "Darwin" ]; then echo "Ce runtime local est prevu pour macOS Intel."; fi
mkdir -p "$PWD/Runtime"
need_install=1
if [ -x "$PWD/.node/bin/node" ]; then current="$($PWD/.node/bin/node -v 2>/dev/null || true)"; if [ "$current" = "$REQ_VERSION" ]; then need_install=0; fi; fi
if [ "$need_install" -eq 0 ]; then
  echo "Runtime local Node $REQ_VERSION deja installe."
  install_marketdata_deps || exit 1
  exit 0
fi

echo "Installation/reinstallation du runtime local Node $REQ_VERSION..."
if [ ! -f "$ARCHIVE" ]; then
  echo "Telechargement du runtime officiel Node.js..."
  tmp="$ARCHIVE.part"; rm -f "$tmp"
  if ! curl -L --fail --retry 3 --connect-timeout 20 "$URL" -o "$tmp"; then echo "ERREUR: impossible de telecharger Node.js."; rm -f "$tmp"; exit 1; fi
  mv "$tmp" "$ARCHIVE"
fi
actual="$(shasum -a 256 "$ARCHIVE" | awk '{print $1}')"
if [ "$actual" != "$EXPECTED_SHA" ]; then echo "ERREUR: SHA-256 du runtime Node incorrect."; echo "Attendu: $EXPECTED_SHA"; echo "Obtenu : $actual"; exit 1; fi
rm -rf "$PWD/.node" "$PWD/Runtime/.node-install"; mkdir -p "$PWD/Runtime/.node-install"
if ! tar -xzf "$ARCHIVE" -C "$PWD/Runtime/.node-install"; then echo "ERREUR: extraction du runtime impossible."; exit 1; fi
mv "$PWD/Runtime/.node-install/node-v16.20.2-darwin-x64" "$PWD/.node"; rm -rf "$PWD/Runtime/.node-install"; chmod +x "$PWD/.node/bin/node" "$PWD/.node/bin/npm" 2>/dev/null || true
if [ ! -x "$PWD/.node/bin/node" ]; then echo "ERREUR: runtime local incomplet."; exit 1; fi
echo "Runtime local installe: $($PWD/.node/bin/node -v)"
install_marketdata_deps || exit 1
