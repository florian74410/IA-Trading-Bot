"""Task orchestration independent from the graphical interface."""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import uuid


@dataclass
class AgentTask:
    task_id: str
    agent_id: str
    action: str
    payload: Dict[str, Any] = field(default_factory=dict)
    status: str = "pending"
    created_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    started_at: str = ""
    finished_at: str = ""
    result: Dict[str, Any] = field(default_factory=dict)
    error: str = ""


class TaskManager:
    """Small in-memory queue suitable for the first Version B integration."""

    def __init__(self):
        self.tasks: List[AgentTask] = []

    def submit(self, agent_id: str, action: str, payload: Optional[Dict[str, Any]] = None) -> AgentTask:
        task = AgentTask(
            task_id=uuid.uuid4().hex,
            agent_id=agent_id,
            action=action,
            payload=dict(payload or {}),
        )
        self.tasks.append(task)
        return task

    def get(self, task_id: str) -> Optional[AgentTask]:
        return next((task for task in self.tasks if task.task_id == task_id), None)

    def pending(self) -> List[AgentTask]:
        return [task for task in self.tasks if task.status == "pending"]

    def mark_running(self, task: AgentTask):
        task.status = "running"
        task.started_at = datetime.now(timezone.utc).isoformat()

    def mark_completed(self, task: AgentTask, result: Optional[Dict[str, Any]] = None):
        task.status = "completed"
        task.result = dict(result or {})
        task.finished_at = datetime.now(timezone.utc).isoformat()

    def mark_failed(self, task: AgentTask, error: str):
        task.status = "failed"
        task.error = str(error)
        task.finished_at = datetime.now(timezone.utc).isoformat()
