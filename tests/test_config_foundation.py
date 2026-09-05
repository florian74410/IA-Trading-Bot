import json
from pathlib import Path

from app.core import config as config_module


def _redirect_config_paths(monkeypatch, tmp_path: Path):
    data_dir = tmp_path / "data"
    settings_file = data_dir / "settings.json"
    log_dir = data_dir / "logs"
    workspace = data_dir / "workspace"
    monkeypatch.setattr(config_module, "DATA_DIR", data_dir)
    monkeypatch.setattr(config_module, "SETTINGS_FILE", settings_file)
    monkeypatch.setattr(config_module, "LOG_DIR", log_dir)
    return data_dir, settings_file, log_dir, workspace


def test_save_settings_is_readable_json(tmp_path: Path, monkeypatch):
    _, settings_file, _, workspace = _redirect_config_paths(monkeypatch, tmp_path)
    app_config = config_module.AppConfig(workspace=workspace)
    app_config.ensure_directories()

    payload = json.loads(settings_file.read_text(encoding="utf-8"))
    assert isinstance(payload["agents"], dict)
    assert "LA PUCE" in payload["agents"]
    assert not settings_file.with_suffix(".tmp").exists()


def test_invalid_settings_are_backed_up_and_recreated(tmp_path: Path, monkeypatch):
    data_dir, settings_file, _, workspace = _redirect_config_paths(monkeypatch, tmp_path)
    data_dir.mkdir(parents=True)
    settings_file.write_text("{invalid-json", encoding="utf-8")

    app_config = config_module.AppConfig(workspace=workspace)
    app_config.ensure_directories()

    backup = settings_file.with_suffix(".json.invalid")
    assert backup.exists()
    payload = json.loads(settings_file.read_text(encoding="utf-8"))
    assert "LA PUCE" in payload["agents"]
