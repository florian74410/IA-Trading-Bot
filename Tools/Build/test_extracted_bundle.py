#!/usr/bin/env python3
"""Verify the actual extracted sources with the existing isolated CP1 suite."""
import argparse
import json
from pathlib import Path
import os
import subprocess
import tempfile
import zipfile

parser = argparse.ArgumentParser()
parser.add_argument('archive')
parser.add_argument('--node', default='node')
parser.add_argument('--node-modules', required=True)
parser.add_argument('--report', required=True)
args = parser.parse_args()
report = Path(args.report).resolve()
report.parent.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='iatb-extracted-') as directory:
    root = Path(directory).resolve()
    with zipfile.ZipFile(args.archive) as archive:
        for name in archive.namelist():
            if not (root / name).resolve().is_relative_to(root):
                raise RuntimeError('Unsafe archive member')
        archive.extractall(root)
    build = json.loads((root / 'BUILD.json').read_text())
    # Dependencies are installed from the same pinned lockfile in CI, not
    # bundled into the source ZIP. All executable application sources are loaded
    # from the new extraction, with no old Engine paths or wrappers available.
    (root / 'App/node_modules').symlink_to(Path(args.node_modules).resolve(), target_is_directory=True)
    r = subprocess.run([args.node, 'Tools/qualify_cp1_control.js'], cwd=root / 'App', capture_output=True, text=True, timeout=300, env=os.environ.copy())
    log = r.stdout + r.stderr
    report.with_suffix('.tap').write_text(log)
    import re
    count = lambda key: int((re.search(r'^# ' + key + r' (\d+)$', log, re.M) or [None, 0])[1])
    result = {'source_commit': build['source_commit'], 'revision': build['revision'], 'status': 'PASS' if r.returncode == 0 else 'FAIL', 'passed': count('pass'), 'failed': count('fail'), 'skipped': count('skipped'), 'execution': 'extracted sources; real Core/Router/10 Engines; isolated broker; no VPS', 'real_orders': 0}
    report.write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result))
    if r.returncode:
        raise SystemExit(r.returncode)
