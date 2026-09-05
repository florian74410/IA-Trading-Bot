"""Structured audit journal for Version B agent operations."""
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Any, Dict, Optional


@dataclass
class AuditEvent:
    timestamp: str
    actor: str
    action: str
    status: str
    details: Dict[str, Any]


class AuditJournal:
    """Append-only JSONL journal. Secrets must never be placed in details."""

    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def record(self, actor: str, action: str, status: str = "ok", details: Optional[Dict[str, Any]] = None):
        event = AuditEvent(
            timestamp=datetime.now(timezone.utc).isoformat(),
            actor=actor,
            action=action,
            status=status,
            details=dict(details or {}),
        )
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(asdict(event), ensure_ascii=False) + "\n")
        return event

    def read(self):
        if not self.path.exists():
            return []
        events = []
        for line in self.path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                events.append(json.loads(line))
        return events
