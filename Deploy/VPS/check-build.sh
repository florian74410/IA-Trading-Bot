#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
: "${IATB_AUTH_TLS_CERT:?Indiquer le certificat approuvé de l’amont privé}"
private=$(curl --noproxy '*' -fsS --max-time 10 --cacert "$IATB_AUTH_TLS_CERT" https://localhost:8000/ui-health)
public=$(curl -fsS --max-time 10 https://trading.iatb.duckdns.org/ui-health)
python3 - "$root/BUILD.json" "$private" "$public" <<'PY'
import json,re,sys
with open(sys.argv[1]) as f:
    receipt=json.load(f)
if receipt.get('revision')!='3.1.0_FINAL' or not re.fullmatch('[0-9a-f]{40}',receipt.get('source_commit','')):
    sys.exit('Reçu de build invalide')
for name,raw in zip(('Gateway privé','Domaine public'),sys.argv[2:]):
    h=json.loads(raw)
    if h.get('ok') is not True or h.get('authentication')!='Auth21' or any(h.get('build',{}).get(k)!=receipt.get(k) for k in ('version','revision','source_commit')):
        sys.exit(name+' différent du reçu')
print(receipt['revision'],receipt['source_commit'])
PY
