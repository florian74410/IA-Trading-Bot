import json
from dataclasses import dataclass, field
from pathlib import Path


APP_NAME = "IA-TB_Dev_Updater"
DATA_DIR = Path.home() / ".ia_tb_dev_updater"
WORKSPACE_DIR = DATA_DIR / "workspace"
LOG_DIR = DATA_DIR / "logs"
SETTINGS_FILE = DATA_DIR / "settings.json"


DEFAULT_AGENTS = {
    "LA PUCE": {
        "role": "Développeur Principal",
        "enabled": True,
        "prompt": "Tu es LA PUCE, développeur principal. Analyse le projet, propose et implémente des améliorations propres et testables.",
        "commands": ["git status", "git diff", "git log", "python", "pytest"],
    },
    "LE GEEK": {
        "role": "Reviewer & QA",
        "enabled": True,
        "prompt": "Tu es LE GEEK, reviewer et responsable QA. Vérifie les changements, détecte les régressions et améliore la qualité du projet.",
        "commands": ["git status", "git diff", "git log", "python", "pytest"],
    },
    "L'ARCHIVISTE": {
        "role": "Documentation & Wiki",
        "enabled": True,
        "prompt": "Tu es L'ARCHIVISTE, responsable de la documentation, des archives et du Wiki. Garde une documentation claire et synchronisée.",
        "commands": ["git status", "git log", "python"],
    },
}


@dataclass
class AppConfig:
    repository: str = "florian74410/IA-Trading-Bot"
    github_owner: str = "florian74410"
    puce_branch: str = "develop"
    geek_branch: str = "develop"
    archiviste_branch: str = "develop"
    workspace: Path = field(default_factory=lambda: WORKSPACE_DIR)
    agents: dict = field(default_factory=lambda: json.loads(json.dumps(DEFAULT_AGENTS)))

    def ensure_directories(self):
        self.workspace.mkdir(parents=True, exist_ok=True)
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        self.load_settings()

    def load_settings(self):
        if not SETTINGS_FILE.exists():
            self.save_settings()
            return
        try:
            data = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
            if isinstance(data.get("agents"), dict):
                for name, defaults in DEFAULT_AGENTS.items():
                    saved = data["agents"].get(name, {})
                    if isinstance(saved, dict):
                        merged = dict(defaults)
                        merged.update(saved)
                        self.agents[name] = merged
        except (OSError, ValueError, TypeError):
            self.agents = json.loads(json.dumps(DEFAULT_AGENTS))

    def save_settings(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        payload = {"agents": self.agents}
        SETTINGS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
