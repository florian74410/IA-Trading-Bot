from dataclasses import dataclass, field
from pathlib import Path


APP_NAME = "IA-TB_Dev_Updater"

DATA_DIR = Path.home() / ".ia_tb_dev_updater"

WORKSPACE_DIR = DATA_DIR / "workspace"

LOG_DIR = DATA_DIR / "logs"


@dataclass
class AppConfig:

    repository: str = "TradingIA"

    github_owner: str = ""

    puce_branch: str = "develop"

    geek_branch: str = "develop"

    archiviste_branch: str = "develop"

    workspace: Path = field(
        default_factory=lambda: WORKSPACE_DIR
    )

    def ensure_directories(self):

        self.workspace.mkdir(
            parents=True,
            exist_ok=True
        )

        LOG_DIR.mkdir(
            parents=True,
            exist_ok=True
        )
