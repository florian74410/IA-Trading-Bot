import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List

from app.core.config import DATA_DIR, LOG_DIR, SETTINGS_FILE


@dataclass
class StartupCheck:
    name: str
    ok: bool
    message: str


def _check_writable_directory(path: Path, name: str) -> StartupCheck:
    try:
        path.mkdir(parents=True, exist_ok=True)
        probe = path / ".write_test"
        probe.write_text("ok", encoding="utf-8")
        probe.unlink()
        return StartupCheck(name, True, f"{path} accessible en écriture")
    except OSError as exc:
        return StartupCheck(name, False, f"{path} inaccessible en écriture : {exc}")


def run_startup_checks(workspace: Path) -> List[StartupCheck]:
    checks = [
        StartupCheck(
            "python",
            sys.version_info >= (3, 10),
            f"Python {sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}",
        ),
        _check_writable_directory(DATA_DIR, "data_dir"),
        _check_writable_directory(Path(workspace), "workspace"),
        _check_writable_directory(LOG_DIR, "log_dir"),
    ]

    if SETTINGS_FILE.exists():
        checks.append(
            StartupCheck(
                "settings",
                os.access(str(SETTINGS_FILE), os.R_OK | os.W_OK),
                f"Paramètres : {SETTINGS_FILE}",
            )
        )

    return checks


def startup_ok(checks: List[StartupCheck]) -> bool:
    return all(check.ok for check in checks)


def format_startup_report(checks: List[StartupCheck]) -> str:
    lines = []
    for check in checks:
        status = "OK" if check.ok else "ERREUR"
        lines.append(f"[{status}] {check.name}: {check.message}")
    return "\n".join(lines)
