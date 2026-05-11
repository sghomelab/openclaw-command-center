"""Config snapshot model — tracks every config change with rollback capability."""
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, func
from app.database import Base


class ConfigSnapshot(Base):
    __tablename__ = "config_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    user = Column(String(100), nullable=False)
    config_json = Column(Text, nullable=False)
    diff_summary = Column(Text, nullable=True)
    change_reason = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "user": self.user,
            "diff_summary": self.diff_summary,
            "change_reason": self.change_reason,
            "config": self._parse_config_json(),
        }

    def _parse_config_json(self):
        import json
        try:
            return json.loads(self.config_json)
        except (json.JSONDecodeError, TypeError):
            return None
