#!/usr/bin/env python3
"""Measure source checkout and actual ZIP, outside the distributable itself."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
p = argparse.ArgumentParser()
p.add_argument('archive')
p.add_argument('report')
a = p.parse_args()
files = [Path(n) for n in subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0') if n]
size = lambda names: sum((ROOT / n).stat().st_size for n in names)
code = [n for n in files if not str(n).startswith('Documentation/Consolidation-')]
archive = Path(a.archive)
with zipfile.ZipFile(archive) as z:
    build = json.loads(z.read('BUILD.json'))
    bundled_app = sum(i.file_size for i in z.infolist() if i.filename.startswith('App/'))
checkpoint = {'commit': 'c7a7841c7c47ac63edf19f0a7973ec3ecf5a1ab3', 'tracked_files': 1283, 'tracked_bytes': 14969241, 'app_bytes': 6930450, 'zip_bytes': 3618996, 'zip_sha256': '692334024b7ddebb5ba8b68d3f6ac86c340ba9c004b8b7f4075ea204a6c1fd0b'}
current = {'source_commit': build['source_commit'], 'tracked_files': len(files), 'tracked_bytes': size(files), 'app_bytes': size([n for n in files if str(n).startswith('App/')]), 'scope_excluding_new_consolidation_reports': {'files': len(code), 'bytes': size(code)}, 'zip_bytes': archive.stat().st_size, 'zip_sha256': hashlib.sha256(archive.read_bytes()).hexdigest(), 'bundled_app_bytes': bundled_app}
result = {'schema': 'iatb.delivery-size/1.0', 'initial_source': {'commit': '1b6a01f012169bfd4d1034c0d9d19b20b2fc9284', 'tracked_files': 1225, 'tracked_bytes': 11589483, 'app_bytes': 6922612}, 'preserved_before_cleanup': checkpoint, 'final': current, 'net_bytes_saved_against_checkpoint': {'tracked_checkout': checkpoint['tracked_bytes'] - current['tracked_bytes'], 'app': checkpoint['app_bytes'] - current['app_bytes'], 'zip': checkpoint['zip_bytes'] - current['zip_bytes']}, 'gross_removed_bytes': 1740614, 'notes': 'Positive saved = reduction; negative = growth. New reports/fixes are counted. Git history, dependencies, ignored artifacts and private runtime stores are excluded; ZIP is measured after building, so this report is kept separately.'}
output = Path(a.report); output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
