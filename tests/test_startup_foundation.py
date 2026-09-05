from pathlib import Path

from app.core import startup


def test_startup_checks_pass_with_writable_directories(tmp_path: Path, monkeypatch):
    data_dir = tmp_path / "data"
    log_dir = data_dir / "logs"
    settings_file = data_dir / "settings.json"
    workspace = data_dir / "workspace"

    monkeypatch.setattr(startup, "DATA_DIR", data_dir)
    monkeypatch.setattr(startup, "LOG_DIR", log_dir)
    monkeypatch.setattr(startup, "SETTINGS_FILE", settings_file)

    checks = startup.run_startup_checks(workspace)

    assert startup.startup_ok(checks)
    assert all(check.ok for check in checks)
    assert "[OK]" in startup.format_startup_report(checks)


def test_startup_ok_detects_failure():
    checks = [
        startup.StartupCheck("one", True, "ok"),
        startup.StartupCheck("two", False, "failed"),
    ]

    assert not startup.startup_ok(checks)
    assert "[ERREUR] two: failed" in startup.format_startup_report(checks)
