#!/bin/bash
set -eu
cd "$(dirname "$0")" || exit 1
APP="Crypto Chart Viewer IA Trader"
FROM="1.7.8"
TO="1.7.9"
OUT="$PWD/$APP.zip"
STAGE="$PWD/.patch-build"
ROOT="$STAGE/$APP"
PAYLOAD="$ROOT/payload"
rm -rf "$STAGE" "$OUT"
mkdir -p "$PAYLOAD"
for item in Core Frontend UserData AddOns services launcher.js install_runtime.command; do
  [ -e "$PWD/$item" ] || { echo "ERREUR: élément patch manquant: $item"; exit 1; }
  cp -R "$PWD/$item" "$PAYLOAD/"
done
[ -f "$PAYLOAD/Core/Server/server_v1.0.js" ] || { echo "ERREUR: entrypoint Core/Server/server_v1.0.js manquant"; exit 1; }
MANIFEST="$ROOT/update_manifest.json"
printf '{\n  "schema": 1,\n  "application": "%s",\n  "package_type": "UPDATE",\n  "from_version": "%s",\n  "to_version": "%s",\n  "payload_root": "payload",\n  "entrypoint": "Core/Server/server_v1.0.js",\n  "description": "v1.7.9 UserData SQLite, Vault AES-256-GCM, credentials OpenAI/X/exchanges et Auth UI",\n  "files": [\n' "$APP" "$FROM" "$TO" > "$MANIFEST"
first=1
find "$PAYLOAD" -type f | LC_ALL=C sort | while IFS= read -r f; do
  rel="${f#$PAYLOAD/}"
  sha="$(shasum -a 256 "$f" | awk '{print $1}')"
  esc="$(printf '%s' "$rel" | sed 's/\\/\\\\/g;s/"/\\"/g')"
  if [ "$first" -eq 0 ]; then printf ',\n' >> "$MANIFEST"; fi
  printf '    {"path":"%s","sha256":"%s"}' "$esc" "$sha" >> "$MANIFEST"
  first=0
done
printf '\n  ]\n}\n' >> "$MANIFEST"
(
  cd "$STAGE"
  /usr/bin/zip -qry "$OUT" "$APP"
)
/usr/bin/unzip -tq "$OUT" >/dev/null
sha="$(shasum -a 256 "$OUT" | awk '{print $1}')"
echo "Patch construit: $OUT"
echo "SHA-256: $sha"
rm -rf "$STAGE"
