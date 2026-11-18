#!/usr/bin/env bash
# Install only pinned Node dependencies. This does not launch or overwrite an IA-TB instance.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
bash Deploy/VPS/preflight.sh --source-only
echo "[INFO] Installing production dependencies for this VPS, from App/package-lock.json."
cd App
npm ci --omit=dev --no-audit --no-fund
node - <<'JS'
const deps=['better-sqlite3','argon2','ethers'];
for(const d of deps){const entry=require.resolve(d);console.log('[OK] '+d+' -> '+entry);}
JS
cd ..
echo "[OK] Source dependencies installed. Set IATB_AUTH21_LOCAL_PRIVATE, then run preflight.sh."
