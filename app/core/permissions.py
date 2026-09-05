"""Permission checks for agent actions.

The policy is intentionally simple and deterministic. UI and future agents
can use the same source of truth before requesting an operation.
"""
from dataclasses import dataclass, field
from fnmatch import fnmatch
from typing import Iterable, List


@dataclass
class PermissionPolicy:
    allowed_commands: List[str] = field(default_factory=list)
    allow_git: bool = True
    allow_files: bool = True
    allow_terminal: bool = False
    allow_github: bool = False
    allow_sensitive: bool = False

    @classmethod
    def from_agent_config(cls, config):
        return cls(
            allowed_commands=list(config.get("commands", [])),
            allow_git=bool(config.get("git", True)),
            allow_files=bool(config.get("files", True)),
            allow_terminal=bool(config.get("terminal", False)),
            allow_github=bool(config.get("github", False)),
            allow_sensitive=bool(config.get("sensitive_operations", False)),
        )

    def command_allowed(self, command: str) -> bool:
        command = command.strip()
        if not command:
            return False
        return any(fnmatch(command, pattern.strip()) for pattern in self.allowed_commands if pattern.strip())

    def operation_allowed(self, operation: str) -> bool:
        table = {
            "git": self.allow_git,
            "files": self.allow_files,
            "terminal": self.allow_terminal,
            "github": self.allow_github,
            "sensitive": self.allow_sensitive,
        }
        return bool(table.get(operation, False))

    def validate(self, operation: str, command: str = ""):
        if not self.operation_allowed(operation):
            return False, f"Opération interdite par la politique : {operation}"
        if command and not self.command_allowed(command):
            return False, f"Commande non autorisée : {command}"
        return True, "OK"
