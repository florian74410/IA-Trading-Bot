"""Headless runtime primitives for Version B.

This module deliberately has no Qt dependency so the agent engine can be
used by the GUI, tests, CLI tools or future background workers.
"""
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, Optional


@dataclass
class AgentContext:
    """Execution context supplied to an agent for one task."""

    repository: str = ""
    branch: str = ""
    workspace: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentResult:
    """Normalized result returned by the runtime."""

    agent_id: str
    status: str
    message: str = ""
    data: Dict[str, Any] = field(default_factory=dict)
    started_at: str = ""
    finished_at: str = ""


class AgentRuntime:
    """Adapter around the existing BaseAgent contract.

    The runtime adds lifecycle state and normalized results without forcing
    the concrete agents to know anything about the UI.
    """

    def __init__(self, agent):
        self.agent = agent
        self.last_result: Optional[AgentResult] = None

    def execute(self, context: Optional[AgentContext] = None) -> AgentResult:
        context = context or AgentContext()
        started = datetime.now(timezone.utc).isoformat()
        try:
            if hasattr(self.agent, "run_with_context"):
                value = self.agent.run_with_context(context)
            else:
                value = self.agent.run()
            result = AgentResult(
                agent_id=self.agent.agent_id,
                status="completed",
                message=str(value or ""),
                data={"context": context.metadata},
                started_at=started,
                finished_at=datetime.now(timezone.utc).isoformat(),
            )
        except Exception as exc:  # runtime boundary: never crash the manager
            result = AgentResult(
                agent_id=self.agent.agent_id,
                status="failed",
                message=str(exc),
                started_at=started,
                finished_at=datetime.now(timezone.utc).isoformat(),
            )
        self.last_result = result
        return result
