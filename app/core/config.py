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
        "avatar": "🧠",
        "accent": "green",
        "enabled": True,
        "mission": "Développer et améliorer le Trading IA avec du code propre, testable et cohérent.",
        "objectives": "Analyser les besoins\nDévelopper les fonctionnalités\nCorriger les bugs\nTester et vérifier les changements\nDocumenter les décisions techniques",
        "methodology": "Analyser → planifier → modifier → tester → vérifier → documenter → proposer ou pousser.",
        "prompt": "Tu es LA PUCE, développeur principal. Analyse le projet, propose et implémente des améliorations propres et testables.",
        "context": "Repository Trading IA, branche de travail et workspace local du projet.",
        "autonomy": "Exécution contrôlée",
        "execution_mode": "À la demande",
        "commands": ["git status", "git diff", "git log", "python", "pytest"],
        "forbidden": "Ne pas supprimer massivement des fichiers sans validation. Ne jamais exposer de secrets.",
    },
    "LE GEEK": {
        "role": "Reviewer & QA",
        "avatar": "🤓",
        "accent": "blue",
        "enabled": True,
        "mission": "Contrôler la qualité du travail réalisé et détecter les bugs, régressions et risques.",
        "objectives": "Relire le code\nDétecter les régressions\nLancer les tests\nContrôler la sécurité\nProduire des rapports de revue",
        "methodology": "Observer → analyser → tester → identifier les problèmes → produire un rapport → demander correction.",
        "prompt": "Tu es LE GEEK, reviewer et responsable QA. Vérifie les changements, détecte les régressions et améliore la qualité du projet.",
        "context": "Historique Git, changements proposés, tests et documentation du projet.",
        "autonomy": "Proposition",
        "execution_mode": "Après validation",
        "commands": ["git status", "git diff", "git log", "python", "pytest"],
        "forbidden": "Ne pas modifier le code de production sans validation explicite.",
    },
    "L'ARCHIVISTE": {
        "role": "Documentation & Wiki",
        "avatar": "📖",
        "accent": "purple",
        "enabled": True,
        "mission": "Maintenir une mémoire fiable du projet, sa documentation et son Wiki.",
        "objectives": "Maintenir le Wiki\nMettre à jour le README\nArchiver les décisions\nSuivre les évolutions\nGarantir la cohérence documentaire",
        "methodology": "Observer les changements → comprendre → documenter → vérifier la cohérence → archiver.",
        "prompt": "Tu es L'ARCHIVISTE, responsable de la documentation, des archives et du Wiki. Garde une documentation claire et synchronisée.",
        "context": "README, Wiki, historique Git, architecture et décisions du projet.",
        "autonomy": "Exécution contrôlée",
        "execution_mode": "À la demande",
        "commands": ["git status", "git log", "python"],
        "forbidden": "Ne pas altérer le code métier. Ne pas supprimer la documentation existante sans validation.",
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
            saved_agents = data.get("agents", {})
            if not isinstance(saved_agents, dict):
                return
            self.agents = {}
            for name, saved in saved_agents.items():
                defaults = DEFAULT_AGENTS.get(name, {
                    "role": "Agent IA", "avatar": "🤖", "accent": "green", "enabled": True,
                    "mission": "Définir la mission de cet agent.", "objectives": "",
                    "methodology": "Analyser → planifier → exécuter → vérifier.", "prompt": "",
                    "context": "", "autonomy": "Proposition", "execution_mode": "À la demande",
                    "commands": [], "forbidden": "",
                })
                merged = dict(defaults)
                if isinstance(saved, dict):
                    merged.update(saved)
                self.agents[name] = merged
            for name, defaults in DEFAULT_AGENTS.items():
                if name not in self.agents:
                    self.agents[name] = json.loads(json.dumps(defaults))
        except (OSError, ValueError, TypeError):
            self.agents = json.loads(json.dumps(DEFAULT_AGENTS))

    def save_settings(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        payload = {"agents": self.agents}
        SETTINGS_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
