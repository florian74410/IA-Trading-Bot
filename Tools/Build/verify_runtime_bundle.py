#!/usr/bin/env python3
"""Verify runtime-only ZIP membership, SHA-256 inventory and forbidden artifact types."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import sys
import zipfile

if len(sys.argv) != 2:
    raise SystemExit("Usage: verify_runtime_bundle.py <runtime.zip>")
archive_path = Path(sys.argv[1])
with zipfile.ZipFile(archive_path) as archive:
    names = archive.namelist()
    if len(set(names)) != len(names):
        raise RuntimeError("Duplicate archive entries")
    if "BUILD_RUNTIME.json" not in names:
        raise RuntimeError("Missing manifest")
    manifest = json.loads(archive.read("BUILD_RUNTIME.json"))
    if manifest.get("schema") != "iatb.runtime-bundle/1.0" or manifest.get("purpose") != "RUNTIME_NO_TESTS":
        raise RuntimeError("Unexpected manifest schema")
    expected = manifest["files"]
    if set(names) != set(expected) | {"BUILD_RUNTIME.json"}:
        raise RuntimeError("Archive and inventory mismatch")
    if not {"App/VERSION", "App/package.json", "App/Core/Server/server.js", "App/Supervisor/Engine/supervisor-engine.js", "App/Supervisor/Engine/working-memory.js"}.issubset(expected):
        raise RuntimeError("Required module missing")
    if archive.read("App/VERSION").decode().strip() != manifest["version"]:
        raise RuntimeError("Incoherent version")
    for name, sha in expected.items():
        p = PurePosixPath(name)
        if p.is_absolute() or ".." in p.parts:
            raise RuntimeError("Unsafe file name: " + name)
        if any(x.lower() in {"tests", "__tests__", "test", "fixtures", ".runtime", "node_modules", "results", "independentaudit"} or x.lower().startswith("results-") for x in p.parts[:-1]) or ".test." in p.name or ".spec." in p.name:
            raise RuntimeError("Test or simulation file included: " + name)
        if name.startswith(".github/") or name.startswith("Tools/") or p.suffix.lower() in {".tap", ".log", ".sqlite", ".db", ".zip", ".pyc"}:
            raise RuntimeError("Development or runtime artifact included: " + name)
        if p.name.startswith(".env") or p.name.endswith((".pem", ".key", ".p12", ".pfx")):
            if name != "App/Core/Certificates/cacert.pem":
                raise RuntimeError("Credentials included: " + name)
            ca = archive.read(name)
            if b"BEGIN CERTIFICATE" not in ca or b"PRIVATE KEY" in ca:
                raise RuntimeError("Invalid public CA trust bundle")
        if hashlib.sha256(archive.read(name)).hexdigest() != sha:
            raise RuntimeError("Invalid hash: " + name)
digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
expected_digest = archive_path.with_suffix(archive_path.suffix + ".sha256").read_text().split()[0]
if digest != expected_digest:
    raise RuntimeError("Archive digest does not match checksum")
print(json.dumps({"status": "PASS", "files_verified": len(expected), "version": manifest["version"], "sha256": digest}))
