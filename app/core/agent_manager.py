"""Central manager used to coordinate configured agents without Qt."""
from pathlib import Path

from app.core.agent_runtime import AgentContext, AgentRuntime
from app.core.audit import AuditJournal
from app.core.permissions import PermissionPolicy
from app.core.task_manager import TaskManager


class AgentManager:
    """Registry, execution and policy boundary for Version B."""

    def __init__(self, config, audit_path=None):
        self.config = config
        self.runtimes = {}
        self.policies = {}
        self.tasks = TaskManager()
        self.audit = AuditJournal(audit_path or Path.home() / ".ia_tb_dev_updater" / "logs" / "agents.jsonl")

    def register(self, agent):
        self.runtimes[agent.agent_id] = AgentRuntime(agent)
        self.policies[agent.agent_id] = PermissionPolicy.from_agent_config(
            self.config.agents.get(agent.agent_id, {})
        )

    def submit(self, agent_id, action, payload=None):
        if agent_id not in self.runtimes:
            raise KeyError(f"Agent inconnu : {agent_id}")
        task = self.tasks.submit(agent_id, action, payload)
        self.audit.record(agent_id, "task.submit", details={"task_id": task.task_id, "action": action})
        return task

    def execute(self, task, context=None):
        runtime = self.runtimes.get(task.agent_id)
        if runtime is None:
            self.tasks.mark_failed(task, "Agent inconnu")
            return task
        self.tasks.mark_running(task)
        result = runtime.execute(context or AgentContext())
        if result.status == "completed":
            self.tasks.mark_completed(task, {"message": result.message, "data": result.data})
            self.audit.record(task.agent_id, "task.execute", details={"task_id": task.task_id, "status": "completed"})
        else:
            self.tasks.mark_failed(task, result.message)
            self.audit.record(task.agent_id, "task.execute", status="failed", details={"task_id": task.task_id, "error": result.message})
        return task

    def policy(self, agent_id):
        return self.policies[agent_id]

    def enabled_agents(self):
        return [agent_id for agent_id in self.runtimes if self.config.agents.get(agent_id, {}).get("enabled", True)]
