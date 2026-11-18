#!/usr/bin/env python3
"""IA-TB runtime-only source distribution. The full DEBUG source bundle is untouched.

This script filters *deployment files*; it never deletes test or evidence sources from Git.
No credentials, test fixtures, simulation code, CI workflows or historical TAP logs are bundled.
"""
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[2]
VERSION = (ROOT / "App/VERSION").read_text(encoding="utf-8").strip()
OUTPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "artifacts" / f"IA-TB-{VERSION}-runtime.zip"
REQUIRED = {"App/VERSION", "App/manifest.json", "App/package.json", "App/package-lock.json", "App/Core/Server/server.js", "App/Supervisor/Engine/supervisor-engine.js", "App/Supervisor/Engine/working-memory.js"}

def allowed(name):
    p = PurePosixPath(name)
    parts = p.parts
    if p.is_absolute() or ".." in parts or not parts:
        raise RuntimeError("Unsafe tracked path: " + name)
    if name in {"README.md", "ROADMAP.md", "App/.dockerignore"} or (p.name.startswith("compose.") and p.suffix in {".yml", ".yaml"}):
        return True
    if not (name.startswith("App/") or name.startswith("Documentation/")):
        return False
    if any(c.lower() in {"tests", "__tests__", "test", "fixtures", "__pycache__", ".runtime", "node_modules", "results", "independentaudit"} or c.lower().startswith("results-") for c in parts[:-1]):
        return False
    if name.startswith(("App/Tools/CI/", "App/Tools/Tests/", "App/tests/", "App/artifacts/")):
        return False
    if p.name.startswith(("qualify_", "test_")) and name.startswith("App/Tools/"):
        return False
    if ".test." in p.name or ".spec." in p.name:
        return False
    if p.suffix.lower() in {".tap", ".log", ".sqlite", ".db", ".zip", ".pyc"}:
        return False
    if p.name in {"build-verification.json", "test-inventory.json"}:
        return False
    if any(x in p.name.lower() for x in ("secrets_v2.dat", "communication_protocol_key.dat")) or p.name == "user.dat":
        raise RuntimeError("Refusing sensitive tracked file: " + name)
    if p.name.startswith(".env") or p.name.endswith((".pem", ".key", ".p12", ".pfx")):
        raise RuntimeError("Refusing credential-like tracked file: " + name)
    return True

tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode("utf-8").split("\0")
files = []
excluded = []
for name in sorted(filter(None, tracked)):
    if not allowed(name):
        excluded.append(name)
        continue
    f = ROOT / name
    if f.is_symlink() or not f.is_file():
        raise RuntimeError("Missing, non-file or symlink: " + name)
    files.append((name, f.read_bytes()))

included = {x for x, _ in files}
missing = REQUIRED - included
if missing:
    raise RuntimeError("Required runtime entry missing: " + ", ".join(sorted(missing)))

manifest = {
    "schema": "iatb.runtime-bundle/1.0",
    "version": VERSION,
    "purpose": "RUNTIME_NO_TESTS",
    "deployment": "NONE",
    "files": {n: hashlib.sha256(content).hexdigest() for n, content in files},
    "omitted_tracked_count": len(excluded),
}
payload = (json.dumps(manifest, indent=2, sort_keys=True) + "\n").encode("utf-8")
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
    for name, body in files + [("BUILD_RUNTIME.json", payload)]:
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (0o100755 if (ROOT / name).exists() and (ROOT / name).stat().st_mode & 0o111 else 0o100644) << 16
        archive.writestr(info, body)
sha = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
OUTPUT.with_suffix(OUTPUT.suffix + ".sha256").write_text(f"{sha}  {OUTPUT.name}\n")
print(json.dumps({"artifact": str(OUTPUT), "version": VERSION, "included_files": len(files), "excluded_tracked_files": len(excluded), "size_bytes": OUTPUT.stat().st_size, "sha256": sha}, indent=2))
