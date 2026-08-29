#!/bin/bash
set -eu
cd "$(dirname "$0")" || exit 1
REPO_ROOT="$(cd ../.. && pwd)"
PATCH_DIR="$PWD"
ARCHIVE="$PATCH_DIR/Crypto Chart Viewer IA Trader.zip"
BASE="$REPO_ROOT/builds/v1.7.8"
CURRENT="$REPO_ROOT/builds/v1.7.9"
[ -d "$BASE" ] || { echo "ERREUR: builds/v1.7.8 introuvable"; exit 1; }
[ -f "$CURRENT/Core/Updates/update_manager_v1.0.js" ] || { echo "ERREUR: UpdateManager v1.7.9 introuvable"; exit 1; }
[ -f "$ARCHIVE" ] || "$PATCH_DIR/build_patch.command"
NODE="$CURRENT/.node/bin/node"
[ -x "$NODE" ] || NODE="$(command -v node || true)"
[ -n "$NODE" ] || { echo "ERREUR: Node introuvable"; exit 1; }
TMP="${TMPDIR:-/tmp}/iatb-v179-install-test-$$"
trap 'rm -rf "$TMP"' EXIT INT TERM
mkdir -p "$TMP/app"
cp -R "$BASE/." "$TMP/app/"
printf 'sentinel-user\n' > "$TMP/app/user.dat"
printf 'sentinel-config\n' > "$TMP/app/config_v1.0.dat"
printf 'sentinel-legacy-vault\n' > "$TMP/app/secrets_v2.dat"
U0="$(shasum -a 256 "$TMP/app/user.dat"|awk '{print $1}')"
C0="$(shasum -a 256 "$TMP/app/config_v1.0.dat"|awk '{print $1}')"
S0="$(shasum -a 256 "$TMP/app/secrets_v2.dat"|awk '{print $1}')"
cp "$ARCHIVE" "$TMP/test.zip"
cat > "$TMP/install_test.js" <<'NODETEST'
'use strict';
var path=require('path'),UpdateManager=require(process.argv[2]),root=process.argv[3],zip=process.argv[4];
var m=new UpdateManager(root,'1.7.8');
m.inspectArchive(zip,'installation-self-test',function(e,p){
 if(e){console.error('INSPECT_FAIL',e.message);process.exit(2);}
 console.log('INSPECT_OK files='+p.compatibility.fileCount+' to='+p.manifest.to_version);
 m.install(p.token,function(e2,r){if(e2){console.error('INSTALL_FAIL',e2.message);process.exit(3);}console.log('INSTALL_OK '+JSON.stringify(r));process.exit(0);});
});
NODETEST
"$NODE" "$TMP/install_test.js" "$CURRENT/Core/Updates/update_manager_v1.0.js" "$TMP/app" "$TMP/test.zip"
[ -f "$TMP/app/UserData/self_test.js" ] || { echo "ERREUR: self_test.js absent après installation"; exit 1; }
"$NODE" "$TMP/app/UserData/self_test.js"
U1="$(shasum -a 256 "$TMP/app/user.dat"|awk '{print $1}')"
C1="$(shasum -a 256 "$TMP/app/config_v1.0.dat"|awk '{print $1}')"
S1="$(shasum -a 256 "$TMP/app/secrets_v2.dat"|awk '{print $1}')"
[ "$U0" = "$U1" ] || { echo "ERREUR: user.dat écrasé"; exit 1; }
[ "$C0" = "$C1" ] || { echo "ERREUR: config_v1.0.dat écrasé"; exit 1; }
[ "$S0" = "$S1" ] || { echo "ERREUR: ancien coffre modifié pendant la copie du patch"; exit 1; }
echo "INSTALLATION TEST PASS v1.7.8 -> v1.7.9"
echo "Les fichiers utilisateur protégés sont restés intacts. La migration du coffre legacy se fera au premier login réel, après déchiffrement réussi."
