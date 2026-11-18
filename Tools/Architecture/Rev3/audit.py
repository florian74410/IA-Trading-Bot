#!/usr/bin/env python3
"""Whole active-tree audit, independent of git diff; never starts a service."""
import ast
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
LAYOUT = {
    'trading': ('services/trading-engine', 'Trading'),
    'firewall': ('Core/Firewall', 'Firewall'),
    'fundamental': ('Fundamental', 'Fundamental'),
    'indicator': ('Indicators', 'Indicators'),
    'liquidity': ('Liquidity', 'Liquidity'),
    'marketdata': ('MarketData', 'MarketData'),
    'portfolio': ('Portfolio', 'Portfolio'),
    'risk': ('Risk', 'Risk'),
    'strategy': ('Strategy', 'Strategy'),
    'supervisor': ('Supervisor', 'Supervisor'),
}
SKIP = {'node_modules', '.git', '.runtime', '__pycache__', 'artifacts', 'Results', 'NodeRuntime'}
files = []
for directory in ['App', 'Tools', 'Deploy', 'Infrastructure', 'Assets', 'tests', '.github']:
    for p in (ROOT / directory).rglob('*') if (ROOT / directory).exists() else []:
        if p.is_file() and not p.is_symlink() and not any(x in SKIP for x in p.relative_to(ROOT).parts):
            files.append(p)
files += [p for p in ROOT.iterdir() if p.is_file() and p.suffix in {'.json', '.yml', '.yaml', '.md'}]
errors, engines, obsolete, historical = [], [], [], []
counts = {'files_examined': len(files), 'json': 0, 'python': 0, 'shell': 0}
for p in files:
    rel = p.relative_to(ROOT).as_posix()
    if p.suffix not in {'.json', '.py', '.sh', '.command', '.js', '.cjs', '.mjs', '.yml', '.yaml', '.md', '.txt'}:
        continue
    text = p.read_text(encoding='utf8')
    try:
        if p.suffix == '.json':
            counts['json'] += 1
            json.loads(text)
        elif p.suffix == '.py':
            counts['python'] += 1
            ast.parse(text, filename=rel)
        elif p.suffix in {'.sh', '.command'}:
            counts['shell'] += 1
            r = subprocess.run(['bash', '-n', str(p)], capture_output=True, text=True)
            if r.returncode:
                errors.append({'file': rel, 'error': r.stderr})
    except (ValueError, SyntaxError) as exc:
        errors.append({'file': rel, 'error': str(exc)})
    if rel.startswith(('Tools/Architecture/Rev3/', 'Tools/CI/baselines/')):
        continue  # Deliberate migration maps and immutable historical pins.
    for old, _ in LAYOUT.values():
        pattern = r'(?<![\w/])(?:App/)?' + re.escape(old) + r'/[\w./*-]+\.(?:js|json|sh|command)'
        for m in re.finditer(pattern, text):
            item = {'file': rel, 'reference': m.group(), 'line': text.count('\n', 0, m.start()) + 1}
            (historical if p.suffix in {'.md', '.txt'} else obsolete).append(item)
for engine, (old, new) in LAYOUT.items():
    manifest = json.loads((ROOT / 'App/Core/ProcessRegistry/manifests' / (engine + '.json')).read_text())
    expected = 'Engines/' + new + '/'
    entry = manifest.get('script', '')
    if not entry.startswith(expected) or not (ROOT / 'App' / entry).is_file():
        errors.append({'engine': engine, 'error': 'Canonical Process Registry entry missing', 'entry': entry})
    old_dir = ROOT / 'App' / old
    old_code = list(old_dir.rglob('*.js')) if old_dir.exists() else []
    if old_code:
        errors.append({'engine': engine, 'error': 'Old executable Engine copy retained', 'files': [str(p.relative_to(ROOT)) for p in old_code]})
    functions = json.loads((ROOT / 'App/Engines' / new / 'FunctionRegistry/Functions.json').read_text())
    engines.append({'engine': engine, 'entry': entry, 'commands': len(functions['functions']), 'verified': sum(bool(f.get('verified_handler')) for f in functions['functions']), 'old_executable_files': len(old_code)})
result = {'schema': 'iatb.post-migration-audit/1.0', 'counts': counts, 'engines': engines, 'syntax_or_layout_errors': errors, 'obsolete_active_references': obsolete, 'documentary_references_to_review': historical, 'status': 'PASS' if not errors and not obsolete else 'FAIL'}
output = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'artifacts/post-migration-audit.json'
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k: v for k, v in result.items() if k not in {'documentary_references_to_review', 'engines'}}))
sys.exit(0 if result['status'] == 'PASS' else 1)
