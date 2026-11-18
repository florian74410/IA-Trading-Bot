#!/usr/bin/env python3
"""Compare declared exports and static import cycles with preserved source census.

Dynamic loaders are intentionally not claimed to be statically proven.
"""
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[3]
BASE = '1b6a01f012169bfd4d1034c0d9d19b20b2fc9284'
CENSUS_COMMIT = 'c7a7841c7c47ac63edf19f0a7973ec3ecf5a1ab3'  # initial census recorded before cleanup
OLD = [('services/trading-engine', 'Trading'), ('Core/Firewall', 'Firewall')]
OLD += [(x, x) for x in ['Fundamental', 'Indicators', 'Liquidity', 'MarketData', 'Portfolio', 'Risk', 'Strategy', 'Supervisor']]

def canonical(name):
    for old, new in OLD:
        prefix = 'App/' + old + '/'
        if name.startswith(prefix):
            return 'App/Engines/' + new + '/' + name[len(prefix):]
    return name

def entries(data):
    return {canonical(row['path']): row for row in data['entries']}

def cycles(data):
    rows = entries(data)
    graph = {name: [canonical(x) for x in row['outgoing'] if isinstance(x, str) and canonical(x) in rows] for name, row in rows.items()}
    index, low, stack, active, result = {}, {}, [], set(), []
    def visit(name):
        index[name] = low[name] = len(index)
        stack.append(name)
        active.add(name)
        for target in graph[name]:
            if target not in index:
                visit(target)
                low[name] = min(low[name], low[target])
            elif target in active:
                low[name] = min(low[name], index[target])
        if low[name] == index[name]:
            component = []
            while True:
                item = stack.pop()
                active.remove(item)
                component.append(item)
                if item == name:
                    break
            if len(component) > 1 or name in graph[name]:
                result.append(tuple(sorted(component)))
    for name in graph:
        if name not in index:
            visit(name)
    return sorted(result)

baseline = json.loads(subprocess.check_output(['git', 'show', CENSUS_COMMIT + ':Documentation/Consolidation-3.0.1/SOURCE_INVENTORY.json'], cwd=ROOT))
assert baseline['commit'] == BASE, 'Initial census source mismatch'
current = json.loads(Path(sys.argv[1]).read_text())
before, after = entries(baseline), entries(current)
missing, changed = [], []
compared = 0
for name, row in before.items():
    if not name.startswith('App/Engines/') or not name.endswith('.js'):
        continue
    compared += 1
    if name not in after:
        missing.append(name)
    elif sorted(row['exports']) != sorted(after[name]['exports']):
        changed.append({'file': name, 'before': row['exports'], 'after': after[name]['exports']})
a, b = cycles(baseline), cycles(current)
new_cycles = sorted(set(b) - set(a))
result = {'schema': 'iatb.source-graph-comparison/1.0', 'baseline': BASE, 'preserved_census_commit': CENSUS_COMMIT, 'engine_js_files_compared': compared, 'missing_engine_js': missing, 'changed_export_assignments': changed, 'cycles_before': a, 'cycles_after': b, 'new_cycles': new_cycles, 'dynamic_loads': 'Not a static proof; preserved and exercised by existing integration suites', 'status': 'PASS' if not missing and not changed and not new_cycles else 'FAIL'}
output = Path(sys.argv[2]); output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({k:v for k,v in result.items() if not k.startswith('cycles_')}))
sys.exit(0 if result['status'] == 'PASS' else 1)
