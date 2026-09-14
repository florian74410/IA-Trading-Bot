from pathlib import Path
import json

root = Path(__file__).resolve().parents[1]
history = root / 'builds' / 'IA-TB_Build_v1.11.7' / 'Updates' / 'update_history.dat'
obj = json.loads(history.read_text(encoding='utf-8'))

def contains_retired_feature(value):
    return 'ultra' in json.dumps(value, ensure_ascii=False).lower()

if isinstance(obj, dict) and isinstance(obj.get('installed'), list):
    obj['installed'] = [entry for entry in obj['installed'] if not contains_retired_feature(entry)]
elif isinstance(obj, list):
    obj = [entry for entry in obj if not contains_retired_feature(entry)]
else:
    raise SystemExit('Unsupported update_history.dat structure')

history.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
