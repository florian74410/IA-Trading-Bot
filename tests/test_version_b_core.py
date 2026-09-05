from pathlib import Path

from app.core.agent_manager import AgentManager
from app.core.agent_runtime import AgentContext
from app.core.config import AppConfig
from app.core.permissions import PermissionPolicy
from app.core.task_manager import TaskManager


class DummyAgent:
    agent_id = "TEST"
    name = "TEST"

    def run(self):
        return "ok"


def test_permission_policy_command_matching():
    policy = PermissionPolicy(allowed_commands=["git *", "pytest"])
    assert policy.command_allowed("git status")
    assert policy.command_allowed("pytest")
    assert not policy.command_allowed("rm -rf /")


def test_task_manager_lifecycle():
    manager = TaskManager()
    task = manager.submit("TEST", "run")
    assert task.status == "pending"
    manager.mark_running(task)
    assert task.status == "running"
    manager.mark_completed(task, {"ok": True})
    assert task.status == "completed"
    assert task.result["ok"] is True


def test_agent_manager_executes_without_qt(tmp_path: Path):
    config = AppConfig()
    config.agents = {"TEST": {"enabled": True, "commands": []}}
    manager = AgentManager(config, tmp_path / "audit.jsonl")
    manager.register(DummyAgent())
    task = manager.submit("TEST", "run")
    manager.execute(task, AgentContext(repository="demo", workspace=str(tmp_path)))
    assert task.status == "completed"
    assert task.result["message"] == "ok"
    assert (tmp_path / "audit.jsonl").exists()
