#!/usr/bin/env python3
"""Deterministic DEBUG source bundle. No binary compilation or deployment."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import zipfile

root = Path(__file__).resolve().parents[2]
version = (root / 'App/VERSION').read_text().strip()
out = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'artifacts' / f'IA-TB-{version}-debug-source.zip'
out.parent.mkdir(parents=True, exist_ok=True)
paths = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
files = []
for name in sorted(filter(None, paths)):
    p = Path(name)
    if name in ['Documentation/Risk/build-verification.json', 'Documentation/CP1/build-verification.json', 'Documentation/ChatBot/build-verification.json', 'Documentation/Supervisor/Results-3.0.1/build-verification.json']:
        continue
    if not (name.startswith(('App/', 'Tools/', 'Documentation/', '.github/workflows/')) or name in ['README.md', 'ROADMAP.md', '.dockerignore'] or (p.name.startswith('compose.') and p.suffix in ['.yml', '.yaml'])):
        continue
    if any(x in p.parts for x in ['node_modules', '.runtime', '__pycache__']) or p.suffix in ['.db', '.sqlite', '.zip']:
        continue
    if p.name in ['user.dat', 'secrets_v2.dat', 'communication_protocol_key.dat']:
        raise RuntimeError('Refusing a mutable or secret file in the source inventory')
    if (root / p).is_symlink():
        raise RuntimeError('Refusing symbolic link in source inventory')
    files.append((name, (root / p).read_bytes()))
manifest = {'schema': 'iatb.debug-source/1.0', 'version': version, 'status': 'DEBUG',
            'deployment': 'NONE', 'files': {n: hashlib.sha256(b).hexdigest() for n, b in files}}
files.append(('BUILD.json', (json.dumps(manifest, sort_keys=True, indent=2) + '\n').encode()))
with zipfile.ZipFile(out, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as bundle:
    for name, data in files:
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (0o100755 if ((root / name).exists() and (root / name).stat().st_mode & 0o111) else 0o100644) << 16
        bundle.writestr(info, data)
digest = hashlib.sha256(out.read_bytes()).hexdigest()
out.with_suffix(out.suffix + '.sha256').write_text(digest + '  ' + out.name + '\n')
print(json.dumps({'artifact': str(out), 'sha256': digest, 'files': len(files), 'version': version}))
