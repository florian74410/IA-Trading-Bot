"""Repository context shared by agents and UI adapters."""
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Any


@dataclass
class RepositoryContext:
    repository: str
    workspace: Path
    branch: str = "develop"
    metadata: Dict[str, Any] = field(default_factory=dict)

    def as_dict(self):
        return {
            "repository": self.repository,
            "workspace": str(self.workspace),
            "branch": self.branch,
            "metadata": dict(self.metadata),
        }

    def with_branch(self, branch: str):
        return RepositoryContext(
            repository=self.repository,
            workspace=self.workspace,
            branch=branch,
            metadata=dict(self.metadata),
        )
