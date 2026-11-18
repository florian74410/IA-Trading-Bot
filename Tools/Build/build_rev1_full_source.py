#!/usr/bin/env python3
"""Complete IA-TB 3.0.1 revision SOURCE/VPS package.

All tracked application source, tests, CI, documentation, setup and Compose files
are retained, except regenerable test-output logs and private/runtime files.
No dependencies, runtime databases, private certificates or credentials bundled.
"""
import hashlib
import json
from pathlib import Path, PurePosixPath
import subprocess
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[2]
REVISION = (ROOT / "App/REVISION").read_text(encoding="utf-8").strip() if (ROOT / "App/REVISION").exists() else "3.0.1_Rev1"
if REVISION not in {"3.0.1_Rev1", "3.0.1_Rev2", "3.0.1_Rev3"}:
    raise RuntimeError("Unknown complete source revision")
VERSION = (ROOT / "App/VERSION").read_text(encoding="utf-8").strip()
if VERSION != "3.0.1-dev.1":
    raise RuntimeError(f"Unexpected source version: {VERSION}")
OUTPUT = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT / "artifacts" / f"IA-TB-{REVISION}{'_Consolidated' if REVISION == '3.0.1_Rev3' else ''}_FULL-SOURCE_VPS.zip"
SOURCE_COMMIT = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
TRACKED = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode("utf-8").split("\0")
ALLOWED_TOP = {"App", "Tools", "Documentation", ".github", "Deploy", "Assets", "Infrastructure", "tests"}
ALLOWED_ROOT = {"README.md", "ROADMAP.md", "AGENT_ROLE.md", ".gitignore", "compose.debug.yml", "compose.debug.stack.yml", "compose.auth21.qualification.yml", ".dockerignore"}
PRIVATE_BASENAMES = {"user.dat", "secrets_v2.dat", "communication_protocol_key.dat", "client_master.key", "wallet_master.key"}

def is_regenerable_report(path):
    p = PurePosixPath(path)
    if p.suffix.lower() in {".tap", ".log", ".pyc"}:
        return True
    if path.startswith("Documentation/Supervisor/Results-3.0.1/"):
        return True
    if any(component.startswith("Results") or component == "IndependentAudit" for component in p.parts[:-1]):
        return True
    if path in {"Documentation/Risk/build-verification.json", "Documentation/CP1/build-verification.json", "Documentation/ChatBot/build-verification.json"}:
        return True
    return False

def keep(name):
    p = PurePosixPath(name)
    if p.is_absolute() or ".." in p.parts or not p.parts:
        raise RuntimeError("Unsafe tracked filename: " + name)
    if name not in ALLOWED_ROOT and p.parts[0] not in ALLOWED_TOP:
        return False
    if any(part.lower() in {"node_modules", ".runtime", ".git", "__pycache__", ".node"} for part in p.parts):
        return False
    if p.suffix.lower() in {".db", ".sqlite", ".zip", ".p12", ".pfx", ".key"} or p.name.startswith(".env"):
        raise RuntimeError("Refusing private or generated tracked file: " + name)
    if p.name in PRIVATE_BASENAMES:
        raise RuntimeError("Refusing sensitive tracked file: " + name)
    if p.suffix.lower() == ".pem" and name != "App/Core/Certificates/cacert.pem":
        raise RuntimeError("Refusing unknown PEM: " + name)
    if is_regenerable_report(name):
        return False
    return True

files = []
excluded_reports = []
for name in sorted(filter(None, TRACKED)):
    if is_regenerable_report(name):
        excluded_reports.append(name)
    if not keep(name):
        continue
    full = ROOT / name
    if full.is_symlink() or not full.is_file():
        raise RuntimeError("Unsafe or missing tracked source: " + name)
    data = full.read_bytes()
    if name == "App/Core/Certificates/cacert.pem" and (b"BEGIN CERTIFICATE" not in data or b"PRIVATE KEY" in data):
        raise RuntimeError("CA trust bundle is not public-only")
    files.append((name, data))

included = {name for name, _ in files}
required = {
    "App/VERSION", "App/package.json", "App/package-lock.json", "App/manifest.json",
    "App/Core/Server/server.js", "App/Core/Router/router.js",
    "App/Engines/Supervisor/supervisor_service.js", "App/Engines/Supervisor/Engine/supervisor-engine.js",
    "App/Engines/Supervisor/Engine/working-memory.js", "App/Engines/Trading/trading_service.js",
    "App/UI/Gateway/ui_service.js", "App/Engines/Risk/Engine/risk_service.js",
    "App/Engines/Portfolio/Engine/portfolio_service.js", "App/Core/FunctionRegistry/Control/qualification.json",
    "Deploy/VPS/README-3.0.1_Rev1.md", "Deploy/VPS/preflight.sh",
    "Deploy/VPS/launch_vps.sh",
}
if not required.issubset(included):
    raise RuntimeError("Missing essential sources: " + ", ".join(sorted(required - included)))

manifest = {
    "schema": "iatb.debug-source/1.0",
    "revision": REVISION,
    "version": VERSION,
    "source_commit": SOURCE_COMMIT,
    "status": "DEBUG",
    "deployment": "NOT_EXECUTED",
    "distribution": "FULL_SOURCE_FOR_VPS",
    "notes": "Node 22, npm install, existing Auth21 owner data and TLS are required on the VPS.",
    "excluded_regenerable_reports": len(excluded_reports),
    "files": {name: hashlib.sha256(data).hexdigest() for name, data in files},
}
files.append(("BUILD.json", (json.dumps(manifest, sort_keys=True, indent=2, ensure_ascii=False) + "\n").encode("utf-8")))
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUTPUT, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    for name, body in files:
        info = zipfile.ZipInfo(name, date_time=(2026, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = (0o100755 if (ROOT / name).stat().st_mode & 0o111 else 0o100644) << 16 if name != "BUILD.json" else 0o100644 << 16
        z.writestr(info, body)
digest = hashlib.sha256(OUTPUT.read_bytes()).hexdigest()
OUTPUT.with_suffix(OUTPUT.suffix + ".sha256").write_text(digest + "  " + OUTPUT.name + "\n")
print(json.dumps({"revision": REVISION, "source_version": VERSION, "source_commit": SOURCE_COMMIT, "artifact": str(OUTPUT), "files": len(files), "excluded_reports": len(excluded_reports), "sha256": digest}, indent=2))
